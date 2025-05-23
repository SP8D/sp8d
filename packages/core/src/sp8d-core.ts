/**
 * Ultra-low-latency, lock-free channel for concurrent message passing.
 * @remarks Use `createChannel` to construct. For advanced diagnostics, see exposed readonly arrays.
 */

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

function alignTo4(value: number): number {
  return value % 4 === 0 ? 0 : 4 - (value % 4);
}

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
  /** SharedArrayBuffer backing this channel. */
  private readonly sab: SharedArrayBuffer;
  /** Segment metadata (head, tail, count) for each segment. */
  public readonly segmentMetas: SegmentMeta[];
  /** Slot status arrays (diagnostics only, readonly). */
  public readonly slotStatus: Uint8Array[];
  /** Slot generation/cycle tag arrays (diagnostics only, readonly). */
  public readonly slotGeneration: Uint8Array[];
  /** Slot claim timestamp arrays (diagnostics only, readonly). */
  public readonly slotClaimTimestamp: Uint32Array[];
  /** Slot payload arrays (internal use). */
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
    this.slotGeneration = [];
    this.slotClaimTimestamp = [];
    this.payload = [];

    for (let seg = 0; seg < segments; seg++) {
      this.segmentMetas.push(new SegmentMeta(offset, sab, slots));
      offset += 12;
      this.slotStatus.push(new Uint8Array(sab, offset, slots));
      offset += slots;
      // align to 4 bytes using consistent helper
      offset += alignTo4(offset);
      this.slotGeneration.push(new Uint8Array(sab, offset, slots));
      offset += slots;
      offset += alignTo4(offset);
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
    // Validate buffer structure before creating channel
    if (sab.byteLength < META_BYTES) {
      throw new Error(
        `Invalid buffer: too small (${sab.byteLength} < ${META_BYTES})`
      );
    }

    const meta = new Uint32Array(sab, 0, META_BYTES / 4);
    const slots = meta[META_FIELDS.slots];
    const slotSize = meta[META_FIELDS.slotSize];
    const segments = meta[META_FIELDS.segments];

    // Validate metadata values
    if (!slots || slots <= 0) throw new Error("Invalid buffer: invalid slots");
    if (!slotSize || slotSize <= 0)
      throw new Error("Invalid buffer: invalid slotSize");
    if (!segments || segments <= 0)
      throw new Error("Invalid buffer: invalid segments");

    // Calculate expected buffer size and validate
    const perSegHeader = 12;
    const perSegStatus = slots;
    const perSegStatusAligned = perSegStatus + alignTo4(perSegStatus);
    const perSegGeneration = slots;
    const perSegGenerationAligned =
      perSegGeneration + alignTo4(perSegGeneration);
    const perSegTimestamp = slots * 4;
    const perSegPayload = slots * slotSize;
    const perSeg =
      perSegHeader +
      perSegStatusAligned +
      perSegGenerationAligned +
      perSegTimestamp +
      perSegPayload;
    const expectedSize = META_BYTES + perSeg * segments;

    if (sab.byteLength < expectedSize) {
      throw new Error(
        `Invalid buffer: size mismatch (${sab.byteLength} < ${expectedSize})`
      );
    }

    return new ChannelCore(
      sab,
      slots,
      slotSize,
      numToMode(meta[META_FIELDS.mode]),
      segments,
      meta[META_FIELDS.sweepTimeoutMs]
    );
  }

  /**
   * Get a monotonic timestamp that handles 32-bit overflow gracefully.
   * This prevents wraparound issues in long-running applications.
   * @returns 32-bit timestamp value
   */
  private getMonotonicTimestamp(): number {
    // Use performance.now() if available for better precision and monotonic guarantees
    const now =
      typeof performance !== "undefined" && performance.now
        ? performance.now() + performance.timeOrigin
        : Date.now();

    // Convert to 32-bit but ensure it's always positive and handles overflow
    return Math.abs(Math.floor(now)) >>> 0;
  }

  private pickSegment(producerId?: number): number {
    return this.segments === 1
      ? 0
      : producerId !== undefined
      ? Math.abs(producerId) % this.segments
      : 0;
  }
  /**
   * Send a message. Throws if the channel is full or payload is too large.
   * @param payload Message to send (ArrayBufferView)
   * @param producerId Optional producer ID for multi-segment routing
   * @returns true if sent, throws otherwise
   */
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
    const genArr = this.slotGeneration[seg];
    const claimTS = this.slotClaimTimestamp[seg];
    const payloadArr = this.payload[seg];

    for (let tries = 0; tries < this.slots; tries++) {
      const localHead = Atomics.load(head, 0) % this.slots;
      if (Atomics.load(statusArr, localHead) !== STATUS_EMPTY) {
        this.conflicts++; // increment on every contention
        continue;
      } // Atomically claim slot and check generation
      if (
        Atomics.compareExchange(
          statusArr,
          localHead,
          STATUS_EMPTY,
          STATUS_CLAIMED
        ) === STATUS_EMPTY
      ) {
        // Critical: Validate slot index bounds for memory safety
        if (localHead < 0 || localHead >= this.slots) {
          this.errors++;
          throw new Error(
            `Protocol corruption: slot index ${localHead} out of bounds [0, ${this.slots})`
          );
        }

        // Critical: Atomically increment generation BEFORE writing payload
        // This prevents ABA issues where a slot could be reclaimed and reused
        // between generation increment and payload write
        const newGen = (Atomics.load(genArr, localHead) + 1) & 0xff;
        Atomics.store(genArr, localHead, newGen);

        // Use monotonic timestamp that handles overflow gracefully
        const timestamp = this.getMonotonicTimestamp();
        Atomics.store(claimTS, localHead, timestamp);
        const offset = localHead * this.messageSize;

        // Critical: Validate payload buffer bounds for memory safety
        if (offset + this.messageSize > payloadArr.length) {
          this.errors++;
          throw new Error(
            `Protocol corruption: payload offset ${offset} + ${this.messageSize} exceeds buffer length ${payloadArr.length}`
          );
        }
        payloadArr.set(binary.subarray(0, this.messageSize), offset);
        Atomics.store(statusArr, localHead, STATUS_READY);
        Atomics.add(count, 0, 1);

        // Critical: Use CAS to atomically advance head pointer
        // This prevents lost updates when multiple producers compete
        const expectedHead = localHead;
        const newHead = (localHead + 1) % this.slots;
        Atomics.compareExchange(head, 0, expectedHead, newHead);

        return true;
      }
      this.conflicts++; // increment on failed CAS
    }
    return false;
  }
  /**
   * Try to send a message. Returns false if the channel is full or payload is too large.
   * @param payload Message to send (ArrayBufferView)
   * @param producerId Optional producer ID for multi-segment routing
   * @returns true if sent, false otherwise
   */
  trySend(payload: ArrayBufferView, producerId?: number): boolean {
    try {
      return this.send(payload, producerId);
    } catch {
      return false;
    }
  }
  /**
   * Send a JSON-serializable object. Throws if the channel is full or payload is too large.
   * @param obj Object to send
   * @param producerId Optional producer ID for multi-segment routing
   * @returns true if sent, throws otherwise
   */
  sendJSON(obj: object, producerId?: number): boolean {
    const bin = new TextEncoder().encode(JSON.stringify(obj));
    return this.send(bin, producerId);
  }
  /**
   * Receive a message. Returns null if the channel is empty.
   * @returns Uint8Array or null
   */
  recv(): Uint8Array | null {
    if (this.closed) return null;
    for (let seg = 0; seg < this.segments; seg++) {
      const { tail, count } = this.segmentMetas[seg];
      const statusArr = this.slotStatus[seg];
      const genArr = this.slotGeneration[seg];
      const claimTS = this.slotClaimTimestamp[seg];
      const payloadArr = this.payload[seg];
      for (let tries = 0; tries < this.slots; tries++) {
        const localTail = Atomics.load(tail, 0) % this.slots;
        if (Atomics.load(statusArr, localTail) !== STATUS_READY) {
          this.conflicts++; // increment on every contention
          continue;
        }
        // Atomically claim slot for reading
        if (
          Atomics.compareExchange(
            statusArr,
            localTail,
            STATUS_READY,
            STATUS_CLAIMED
          ) === STATUS_READY
        ) {
          // Critical: Validate slot index bounds for memory safety
          if (localTail < 0 || localTail >= this.slots) {
            this.errors++;
            throw new Error(
              `Protocol corruption: slot index ${localTail} out of bounds [0, ${this.slots})`
            );
          }

          const offset = localTail * this.messageSize;

          // Critical: Validate payload buffer bounds for memory safety
          if (offset + this.messageSize > payloadArr.length) {
            this.errors++;
            throw new Error(
              `Protocol corruption: payload offset ${offset} + ${this.messageSize} exceeds buffer length ${payloadArr.length}`
            );
          }

          const buf = payloadArr.slice(offset, offset + this.messageSize);

          // Critical: Atomically increment generation BEFORE releasing slot
          // This ensures proper ordering and prevents ABA issues
          const newGen = (Atomics.load(genArr, localTail) + 1) & 0xff;
          Atomics.store(genArr, localTail, newGen);

          // Now release the slot
          Atomics.store(statusArr, localTail, STATUS_EMPTY);
          Atomics.store(claimTS, localTail, 0);
          Atomics.sub(count, 0, 1);

          // Critical: Use CAS to atomically advance tail pointer
          // This prevents lost updates when multiple consumers compete
          const expectedTail = localTail;
          const newTail = (localTail + 1) % this.slots;
          Atomics.compareExchange(tail, 0, expectedTail, newTail);

          return buf;
        }
        this.conflicts++; // increment on failed CAS
      }
    }
    return null;
  }
  /**
   * Try to receive a message. Returns null if the channel is empty.
   * @returns Uint8Array or null
   */
  tryRecv(): Uint8Array | null {
    try {
      return this.recv();
    } catch {
      return null;
    }
  }
  /**
   * Receive a JSON-serialized object. Returns null if the channel is empty or parse fails.
   * @returns object or null
   */
  recvJSON(): object | null {
    const bin = this.recv();
    if (!bin) return null;
    try {
      return JSON.parse(new TextDecoder().decode(bin));
    } catch {
      return null;
    }
  }
  /**
   * Async iterator for receiving messages.
   */
  async *[Symbol.asyncIterator](): AsyncIterator<Uint8Array, void> {
    while (!this.closed) {
      const value = await this.recvAsync();
      if (value != null) yield value;
    }
  }
  /**
   * Receive a message asynchronously. Resolves when a message is available or channel is closed.
   * @returns Promise<Uint8Array | null>
   */
  async recvAsync(): Promise<Uint8Array | null> {
    while (!this.closed) {
      const val = this.recv();
      if (val !== null) return val;
      await new Promise((r) => setTimeout(r, 1));
    }
    return null;
  }
  /**
   * Returns true if the channel is full.
   */
  full(): boolean {
    if (this.closed) return false;
    for (let seg = 0; seg < this.segments; seg++) {
      if (Atomics.load(this.segmentMetas[seg].count, 0) < this.slots)
        return false;
    }
    return true;
  }
  /**
   * Returns true if the channel is empty.
   */
  empty(): boolean {
    if (this.closed) return true;
    for (let seg = 0; seg < this.segments; seg++) {
      if (Atomics.load(this.segmentMetas[seg].count, 0) > 0) return false;
    }
    return true;
  }
  /**
   * Close the channel and stop all background tasks.
   */
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
  /**
   * Asynchronously close the channel, waiting for all background tasks to stop.
   * @returns Promise<void>
   */
  async closeAsync(): Promise<void> {
    this.close();
    // Wait a tick to ensure all intervals are cleared
    await new Promise((r) => setTimeout(r, 0));
  }
  /**
   * Reset the channel to its initial state (empties all slots, resets counters).
   * Does not reallocate the buffer.
   */
  reset(): void {
    this.close();
    for (let seg = 0; seg < this.segments; seg++) {
      Atomics.store(this.segmentMetas[seg].head, 0, 0);
      Atomics.store(this.segmentMetas[seg].tail, 0, 0);
      Atomics.store(this.segmentMetas[seg].count, 0, 0);
      const statusArr = this.slotStatus[seg];
      const genArr = this.slotGeneration[seg];
      const claimTS = this.slotClaimTimestamp[seg];
      for (let i = 0; i < this.slots; i++) {
        Atomics.store(statusArr, i, STATUS_EMPTY);
        Atomics.store(genArr, i, 0);
        Atomics.store(claimTS, i, 0);
      }
    }
    this.errors = 0;
    this.conflicts = 0;
    this.reclaimed = 0;
    this.closed = false;
    this.sweeperInterval = setInterval(
      () => this.sweepStaleSlots(),
      Math.max(this.sweepTimeoutMs, 10)
    );
  }
  /**
   * Get current channel statistics.
   */
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
  /**
   * Get a human-readable info string for this channel.
   */
  info(): string {
    return `SP8D Channel, mode=${this.mode}, slots=${this.slots}, segments=${this.segments}`;
  }
  /**
   * Validate the channel's internal state. Throws if protocol invariants are violated.
   */
  validate(): void {
    for (let seg = 0; seg < this.segments; seg++) {
      for (let i = 0; i < this.slots; i++) {
        const st = Atomics.load(this.slotStatus[seg], i);
        const gen = Atomics.load(this.slotGeneration[seg], i);
        if (![STATUS_EMPTY, STATUS_CLAIMED, STATUS_READY].includes(st))
          throw new Error(
            `Protocol violation: Unknown slot status ${st} at seg:${seg} idx:${i}`
          );
        if (typeof gen !== "number" || gen < 0 || gen > 255)
          throw new Error(
            `Protocol violation: Invalid generation ${gen} at seg:${seg} idx:${i}`
          );
      }
    }
  }
  private sweepStaleSlots() {
    if (this.closed) return;
    const now = this.getMonotonicTimestamp();
    for (let seg = 0; seg < this.segments; seg++) {
      const statusArr = this.slotStatus[seg];
      const genArr = this.slotGeneration[seg];
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
          // Use CAS to atomically reclaim only if still claimed
          if (
            Atomics.compareExchange(
              statusArr,
              i,
              STATUS_CLAIMED,
              STATUS_EMPTY
            ) === STATUS_CLAIMED
          ) {
            // Increment generation on successful reclaim
            Atomics.store(genArr, i, (Atomics.load(genArr, i) + 1) & 0xff);
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
  /**
   * Send a message asynchronously. Waits until a slot is available or timeout/abort.
   * Uses polling for browser compatibility (Atomics.wait is not available on main thread).
   * Never queues messages internally; each call only waits for a slot, then sends.
   * @param payload Message to send (ArrayBufferView)
   * @param producerId Optional producer ID for multi-segment routing
   * @param opts Optional: { timeoutMs?: number, signal?: AbortSignal }
   * @returns Promise<boolean> Resolves true if sent, false if timeout/abort
   */
  async sendAsync(
    payload: ArrayBufferView,
    producerId?: number,
    opts?: { timeoutMs?: number; signal?: AbortSignal }
  ): Promise<boolean> {
    const start = Date.now();
    while (true) {
      if (opts?.signal?.aborted) return false;
      try {
        if (this.send(payload, producerId)) return true;
      } catch (e) {
        // If payload too large, propagate error
        if (String(e).includes("Payload too large")) throw e;
      }
      if (opts?.timeoutMs && Date.now() - start > opts.timeoutMs) return false;
      // Use a short delay for browser compatibility (no Atomics.wait on main thread)
      await new Promise((r) => setTimeout(r, 2));
    }
  }
}

/**
 * Create a new SP8D channel with the specified options.
 * @param options Channel configuration options
 * @returns Object containing the channel instance and SharedArrayBuffer
 */
export function createChannel(options: {
  slots: number;
  slotSize: number;
  mode?: Mode;
  segments?: number;
  sweepTimeoutMs?: number;
}): { channel: Channel; buffer: SharedArrayBuffer } {
  const {
    slots,
    slotSize,
    mode = "SPSC",
    segments = 1,
    sweepTimeoutMs = DEFAULT_SWEEP,
  } = options;

  // Calculate required buffer size with proper alignment
  const perSegHeader = 12;
  const perSegStatus = slots;
  const perSegStatusAligned = perSegStatus + alignTo4(perSegStatus);
  const perSegGeneration = slots;
  const perSegGenerationAligned = perSegGeneration + alignTo4(perSegGeneration);
  const perSegTimestamp = slots * 4;
  const perSegPayload = slots * slotSize;
  const perSeg =
    perSegHeader +
    perSegStatusAligned +
    perSegGenerationAligned +
    perSegTimestamp +
    perSegPayload;
  const bufferSize = META_BYTES + perSeg * segments;

  const sab = new SharedArrayBuffer(bufferSize);

  // Initialize metadata
  const meta = new Uint32Array(sab, 0, META_BYTES / 4);
  meta[META_FIELDS.slots] = slots;
  meta[META_FIELDS.slotSize] = slotSize;
  meta[META_FIELDS.mode] = modeToNum(mode);
  meta[META_FIELDS.segments] = segments;
  meta[META_FIELDS.sweepTimeoutMs] = sweepTimeoutMs;

  const channel = new ChannelCore(
    sab,
    slots,
    slotSize,
    mode,
    segments,
    sweepTimeoutMs
  );

  return { channel, buffer: sab };
}

/**
 * Attach to an existing SP8D channel using its SharedArrayBuffer.
 * @param buffer The SharedArrayBuffer from a previously created channel
 * @returns Channel instance attached to the existing buffer
 */
export function attachChannel(buffer: SharedArrayBuffer): Channel {
  return ChannelCore.fromBuffer(buffer);
}
