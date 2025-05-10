// Central source of truth for test cases
export const testCases = [
  {
    id: "live-high-throughput-stress",
    title: "1. <b>Live High-Throughput Stress</b>",
    scenario:
      "Simulates 5,000 message events between async producer and consumer, measuring actual messages processed and time to completion.",
    why: "Legacy <code>postMessage</code> or event bus patterns collapse well below this throughput. Real data science copilots require <b>thousands/sec without UI freezes</b>.",
    metricId: "stress_result",
    outputId: "stress_output",
    keyMetric: "throughput, no missed/lost messages, no lag.",
  },
  {
    id: "slot-reclamation-stale-job-handling",
    title: "2. <b>Slot Reclamation & Stale-Job Handling</b>",
    scenario:
      "Intentionally abandons some job slots to see if protocol reclaims memory/slots automatically.",
    why: "This is vital for long-running browser sessions—leaks or stuck jobs can creep in and kill reliability.",
    metricId: "reclaim_result",
    outputId: "reclaim_output",
    keyMetric: "Reclaimed slot count, protocol recovery visible in logs.",
  },
  {
    id: "race-condition-conflict-resolution",
    title: "3. <b>Race Condition & Conflict Resolution</b>",
    scenario:
      "Multiple producers and consumers hammer the shared channel, purposely colliding on slots.",
    why: "Race bugs in message-passing systems are the #1 hidden browser reliability risk. SP8D must resolve conflicts cleanly.",
    metricId: "race_result",
    outputId: "race_output",
    keyMetric: "# of resolved conflicts and error count.",
  },
  {
    id: "protocol-correctness-data-integrity",
    title: "4. <b>Protocol Correctness & Data Integrity</b>",
    scenario:
      "Sends randomized messages and checks every output for corruption, order, duplicates, or loss.",
    why: "Real-world browsers lose/corrupt data under stress if protocol is weak—financial workflows can't tolerate this.",
    metricId: "correct_result",
    outputId: "correct_output",
    keyMetric: "end-to-end message correctness, reports first failure.",
  },
  {
    id: "slot-generation-cycle-tag-wraparound",
    title: "5. <b>Slot Generation/Cycle Tag Wraparound</b>",
    scenario:
      "Repeatedly fills and drains a slot to force the slot generation/cycle tag (Gen/Cycle Byte) to wrap from 255 to 0.",
    why: "Ensures protocol correctness and no message loss or corruption even after many cycles, validating the slot generation logic.",
    metricId: "gencycle_result",
    outputId: "gencycle_output",
    keyMetric: "No protocol errors, all slots healthy after wraparound.",
  },
  {
    id: "dos-flood-resilience",
    title: "6. <b>DoS/Flood Resilience</b>",
    scenario:
      "Floods the channel with 50,000+ messages as fast as possible, simulating a denial-of-service or buggy producer.",
    why: "Validates protocol stability, error handling, and resource usage under extreme load. Ensures no crash, memory leak, or starvation of legitimate consumers.",
    metricId: "dos_result",
    outputId: "dos_output",
    keyMetric: "No crash, no memory leak, no starvation, error count.",
  },
];
