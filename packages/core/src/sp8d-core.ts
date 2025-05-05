export type Mode = "SPSC" | "MPSC" | "MPMC";

export interface ChannelStats {
  slots: number;
  used: number;
  free: number;
  stalled: number;
  errors: number;
  conflicts: number;
  reclaimed: number;
}

export interface Channel extends AsyncIterable<Uint8Array> {
  send(payload: ArrayBufferView, producerId?: number): boolean;
  recv(): Uint8Array | null;
  recvAsync(): Promise<Uint8Array | null>;
  sendJSON?(obj: object, producerId?: number): boolean;
  recvJSON?(): object | null;
  full(): boolean;
  empty(): boolean;
  close(): void;
  stats(): ChannelStats;
  info(): string;
  validate(): void;
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array, void>;
}

const STATUS_EMPTY = 0,
  STATUS_CLAIMED = 1,
  STATUS_READY = 2;
const DEFAULT_SWEEP = 50;

const META_BYTES = 40;
const META_FIELDS: Record<string, number> = {
  slots: 0,
  slotSize: 1,
  mode: 2,
  segments: 3,
  sweepTimeoutMs: 4,
};

function modeToNum(mode: Mode) {
  return mode === "SPSC" ? 0 : mode === "MPSC" ? 1 : 2;
}
function numToMode(n: number): Mode {
  return n === 0 ? "SPSC" : n === 1 ? "MPSC" : "MPMC";
}

class SegmentMeta {
  head: Int32Array;
  tail: Int32Array;
  count: Int32Array;
  constructor(base: number, sab: SharedArrayBuffer, slots: number) {
    this.head = new Int32Array(sab, base + 0, 1);
    this.tail = new Int32Array(sab, base + 4, 1);
    this.count = new Int32Array(sab, base + 8, 1);
  }
}

export class ChannelCore implements Channel {
  private readonly sab: SharedArrayBuffer;
  public readonly segmentMetas: SegmentMeta[];
  private readonly slotStatus: Uint8Array[];
  private readonly slotClaimTimestamp: Uint32Array[];
  private readonly payload: Uint8Array[];
  private readonly slots: number;
  private readonly segments: number;
  private readonly messageSize: number;
  private readonly mode: Mode;
  // Make these private for security
  private errors = 0;
  private conflicts = 0;
  private reclaimed = 0;
  private closed = false;
  private sweepTimeoutMs: number;
  private sweeperInterval: ReturnType<typeof setInterval>;
  private readonly meta: Uint32Array;

  constructor(
    sab: SharedArrayBuffer,
    slots: number,
    slotSize: number,
    mode: Mode = "SPSC",
    segments: number = 1,
    sweepTimeoutMs: number = DEFAULT_SWEEP
  ) {
    this.sab = sab;
    this.meta = new Uint32Array(sab, 0, META_BYTES / 4);
    this.slots = slots;
    this.segments = segments;
    this.messageSize = slotSize;
    this.mode = mode;
    this.sweepTimeoutMs = sweepTimeoutMs;

    let offset = META_BYTES;
    this.segmentMetas = [];
    this.slotStatus = [];
    this.slotClaimTimestamp = [];
    this.payload = [];

    for (let seg = 0; seg < segments; seg++) {
      this.segmentMetas.push(new SegmentMeta(offset, sab, slots));
      offset += 12;
      this.slotStatus.push(new Uint8Array(sab, offset, slots));
      offset += slots;
      // align to 4 bytes
      if (offset % 4 !== 0) offset += 4 - (offset % 4);
      this.slotClaimTimestamp.push(new Uint32Array(sab, offset, slots));
      offset += slots * 4;
      this.payload.push(new Uint8Array(sab, offset, slots * slotSize));
      offset += slots * slotSize;
    }
    this.reclaimed = 0;
    this.sweeperInterval = setInterval(
      () => this.sweepStaleSlots(),
      Math.max(this.sweepTimeoutMs, 10)
    );
  }

  static fromBuffer(sab: SharedArrayBuffer): ChannelCore {
    const meta = new Uint32Array(sab, 0, META_BYTES / 4);
    return new ChannelCore(
      sab,
      meta[META_FIELDS.slots],
      meta[META_FIELDS.slotSize],
      numToMode(meta[META_FIELDS.mode]),
      meta[META_FIELDS.segments],
      meta[META_FIELDS.sweepTimeoutMs]
    );
  }
  private pickSegment(producerId?: number): number {
    return this.segments === 1
      ? 0
      : producerId !== undefined
      ? Math.abs(producerId) % this.segments
      : 0;
  }
  send(payload: ArrayBufferView, producerId?: number): boolean {
    if (this.closed) throw new Error("Channel is closed");
    const binary = new Uint8Array(
      payload.buffer,
      payload.byteOffset,
      payload.byteLength
    );
    if (binary.byteLength > this.messageSize) {
      this.errors++;
      throw new Error(
        `Payload too large (${binary.byteLength}), max=${this.messageSize}`
      );
    }
    const seg = this.pickSegment(producerId);
    const { head, count } = this.segmentMetas[seg];
    const statusArr = this.slotStatus[seg];
    const claimTS = this.slotClaimTimestamp[seg];
    const payloadArr = this.payload[seg];

    for (let tries = 0; tries < this.slots; tries++) {
      const localHead = Atomics.load(head, 0) % this.slots;
      if (Atomics.load(statusArr, localHead) !== STATUS_EMPTY) {
        this.conflicts++; // increment on every contention
        continue;
      }
      if (
        Atomics.compareExchange(
          statusArr,
          localHead,
          STATUS_EMPTY,
          STATUS_CLAIMED
        ) === STATUS_EMPTY
      ) {
        Atomics.store(claimTS, localHead, Number(Date.now() % 0xffffffff));
        const offset = localHead * this.messageSize;
        payloadArr.set(binary.subarray(0, this.messageSize), offset);
        Atomics.store(statusArr, localHead, STATUS_READY);
        Atomics.add(count, 0, 1);
        Atomics.store(head, 0, (localHead + 1) % this.slots);
        return true;
      }
      this.conflicts++; // increment on failed CAS
    }
    return false;
  }
  sendJSON(obj: object, producerId?: number): boolean {
    const bin = new TextEncoder().encode(JSON.stringify(obj));
    return this.send(bin, producerId);
  }
  recv(): Uint8Array | null {
    if (this.closed) return null;
    for (let seg = 0; seg < this.segments; seg++) {
      const { tail, count } = this.segmentMetas[seg];
      const statusArr = this.slotStatus[seg];
      const claimTS = this.slotClaimTimestamp[seg];
      const payloadArr = this.payload[seg];
      for (let tries = 0; tries < this.slots; tries++) {
        const localTail = Atomics.load(tail, 0) % this.slots;
        if (Atomics.load(statusArr, localTail) !== STATUS_READY) {
          this.conflicts++; // increment on every contention
          continue;
        }
        if (
          Atomics.compareExchange(
            statusArr,
            localTail,
            STATUS_READY,
            STATUS_CLAIMED
          ) === STATUS_READY
        ) {
          const offset = localTail * this.messageSize;
          const buf = payloadArr.slice(offset, offset + this.messageSize);
          Atomics.store(statusArr, localTail, STATUS_EMPTY);
          Atomics.store(claimTS, localTail, 0);
          Atomics.sub(count, 0, 1);
          Atomics.store(tail, 0, (localTail + 1) % this.slots);
          return buf;
        }
        this.conflicts++; // increment on failed CAS
      }
    }
    return null;
  }
  recvJSON(): object | null {
    const bin = this.recv();
    if (!bin) return null;
    try {
      return JSON.parse(new TextDecoder().decode(bin));
    } catch {
      return null;
    }
  }
  async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array, void> {
    while (!this.closed) {
      const value = await this.recvAsync();
      if (value != null) yield value;
    }
  }
  async recvAsync(): Promise<Uint8Array | null> {
    while (!this.closed) {
      const val = this.recv();
      if (val !== null) return val;
      await new Promise((r) => setTimeout(r, 1));
    }
    return null;
  }
  full(): boolean {
    if (this.closed) return false;
    for (let seg = 0; seg < this.segments; seg++) {
      if (Atomics.load(this.segmentMetas[seg].count, 0) < this.slots)
        return false;
    }
    return true;
  }
  empty(): boolean {
    if (this.closed) return true;
    for (let seg = 0; seg < this.segments; seg++) {
      if (Atomics.load(this.segmentMetas[seg].count, 0) > 0) return false;
    }
    return true;
  }
  close(): void {
    this.closed = true;
    clearInterval(this.sweeperInterval);
    for (let seg = 0; seg < this.segments; seg++) {
      Atomics.store(this.segmentMetas[seg].head, 0, 0);
      Atomics.store(this.segmentMetas[seg].tail, 0, 0);
      Atomics.store(this.segmentMetas[seg].count, 0, 0);
      const statusArr = this.slotStatus[seg];
      const claimTS = this.slotClaimTimestamp[seg];
      for (let i = 0; i < this.slots; i++) {
        Atomics.store(statusArr, i, STATUS_EMPTY);
        Atomics.store(claimTS, i, 0);
      }
    }
  }
  stats(): ChannelStats {
    let used = 0;
    for (let seg = 0; seg < this.segments; seg++) {
      used += Atomics.load(this.segmentMetas[seg].count, 0);
    }
    return {
      slots: this.segments * this.slots,
      used,
      free: this.segments * this.slots - used,
      stalled: 0,
      errors: this.errors,
      conflicts: this.conflicts,
      reclaimed: this.reclaimed,
    };
  }
  info(): string {
    return `SP8D Channel, mode=${this.mode}, slots=${this.slots}, segments=${this.segments}`;
  }
  validate(): void {
    for (let seg = 0; seg < this.segments; seg++) {
      for (let i = 0; i < this.slots; i++) {
        const st = Atomics.load(this.slotStatus[seg], i);
        if (![STATUS_EMPTY, STATUS_CLAIMED, STATUS_READY].includes(st))
          throw new Error(
            `Protocol violation: Unknown slot status ${st} at seg:${seg} idx:${i}`
          );
      }
    }
  }
  private sweepStaleSlots() {
    if (this.closed) return;
    const now = Number(Date.now() % 0xffffffff);
    for (let seg = 0; seg < this.segments; seg++) {
      const statusArr = this.slotStatus[seg];
      const claimTS = this.slotClaimTimestamp[seg];
      const count = this.segmentMetas[seg].count;
      for (let i = 0; i < this.slots; i++) {
        const status = Atomics.load(statusArr, i);
        const ts = Atomics.load(claimTS, i);
        if (
          status === STATUS_CLAIMED &&
          ts !== 0 &&
          now - Number(ts) > this.sweepTimeoutMs
        ) {
          Atomics.store(statusArr, i, STATUS_EMPTY);
          Atomics.store(claimTS, i, 0);
          const used = Atomics.load(count, 0);
          if (used > 0) Atomics.sub(count, 0, 1);
          this.reclaimed++;
          this.errors++;
        }
      }
    }
  }
}

// In createChannel, fix buffer size calculation for alignment
export function createChannel(opts: {
  slots: number;
  slotSize: number;
  mode?: Mode;
  segments?: number;
  sweepTimeoutMs?: number;
}): { channel: Channel; buffer: SharedArrayBuffer } {
  const slots = opts.slots;
  const segments = opts.segments ?? 1;
  const slotSize = opts.slotSize;
  const metaHeader = new Uint32Array(10);
  metaHeader[META_FIELDS.slots] = slots;
  metaHeader[META_FIELDS.slotSize] = slotSize;
  metaHeader[META_FIELDS.mode] = modeToNum(opts.mode ?? "SPSC");
  metaHeader[META_FIELDS.segments] = segments;
  metaHeader[META_FIELDS.sweepTimeoutMs] = opts.sweepTimeoutMs ?? DEFAULT_SWEEP;
  const perSegHeader = 12;
  const perSegStatus = slots;
  // Align status to 4 bytes
  const perSegStatusAligned =
    perSegStatus + (perSegStatus % 4 === 0 ? 0 : 4 - (perSegStatus % 4));
  const perSegTimestamp = slots * 4;
  const perSegPayload = slots * slotSize;
  const perSeg =
    perSegHeader + perSegStatusAligned + perSegTimestamp + perSegPayload;
  const totalSize = META_BYTES + perSeg * segments;
  const sab = new SharedArrayBuffer(totalSize);
  new Uint32Array(sab, 0, 10).set(metaHeader);
  const channel = new ChannelCore(
    sab,
    slots,
    slotSize,
    opts.mode ?? "SPSC",
    segments,
    opts.sweepTimeoutMs ?? DEFAULT_SWEEP
  );
  return { channel, buffer: sab };
}

export function attachChannel(buffer: SharedArrayBuffer): Channel {
  return ChannelCore.fromBuffer(buffer);
}
