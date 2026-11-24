Read-only inspection is complete. The project remained unchanged and the working tree stayed clean. No raw content, record identifiers, paths, credentials, recordings, or recognizable snippets are included below.

## Aggregate workload profile

| Dimension | Sanitized evidence | Planning consequence |
|---|---|---|
| Population | 10 valid records in one 2.4 KB structured workload; one 429-byte companion document. No malformed, missing, null, nested, or array-valued records. | Usable for dimension planning, but too small for a production-distribution claim. |
| Request text | Input: 53–82 UTF-8 bytes, median 63.5; output: 22–57 bytes, median 36. All text is single-line ASCII. | Tokenization and multilingual handling are negligible in this corpus. |
| Declared sizes | Input sizes total 15,459 bytes, median 140, p90 4,096, maximum 8,192. Output sizes median 58.5, maximum 109. | Declared input size is highly skewed and is not interchangeable with visible text length. |
| Item counts | Median 6, p90 220, maximum 640; total 900. | Item-proportional work must be a separate workload dimension. |
| Historical latency | 9.2–412.8 ms; median 40.85, p90 233.4, mean 106.29. | Long-tailed workload: the slowest observation contributes 38.8% of total observed latency. |
| Frequency proxy | Per-record occurrence is 4–44, median 13. If it means request frequency, frequency-weighted mean latency is 49.34 ms. | Typical requests dominate event volume, while rare large requests dominate unweighted tail exposure. |
| Distinctness | All records have distinct primary payloads; no repeated-workload scenario is represented. | Cross-request caching and warm-hit behavior cannot be characterized from this corpus. |

The size bands are especially important:

- 6 of 10 records have fewer than 256 declared input bytes.
- One has 512 bytes and one has 2,048 bytes.
- Two have at least 4,096 bytes and account for 79.5% of all declared input bytes.
- Six records complete below 50 ms and represent 140 of 167 frequency-proxy events.
- Declared input size and historical latency have a strong descriptive rank association (Spearman ρ ≈ 0.95), but this is based on only 10 observational records and is not causal.

## Reproducible investigation plan

1. **Define the real operation and stopping condition.** Target one request from the real production entry point through validated response delivery. The exact executable entry point, runtime, model/service configuration, and success validator are absent from the checked-in project, so these must be pinned before measuring. Do not substitute a parse-only microbenchmark.

2. **Preserve the observed workload shape.** Use the 10-record corpus in memory behind the real path. Emit only aggregates. If a shareable fixture is required, construct synthetic inputs from reviewed dimensions: six small, one 512-byte, one 2,048-byte, and two large requests, with item counts spanning 0–640. Do not copy corpus content into fixtures or artifacts.

3. **Stratify results.** Report all records together and separately for:
   - typical requests below 256 declared input bytes;
   - intermediate requests at 512–2,048 bytes;
   - stress requests at 4,096 bytes or more;
   - requests below and above 100 items.

4. **Collect a controlled baseline.** Use a clean, pinned revision and fixed hardware/runtime. Run one warm-up followed by at least five measured passes per branch, with baseline and candidate execution interleaved. Use 20 or more passes when claiming p95 behavior. Record absolute median, range, p50, and p90; no pass/fail threshold is justified yet.

5. **Separate end-to-end and component costs.** Measure ingestion/parsing, validation, size- or item-proportional processing, core execution, serialization, and output validation. Capture CPU time, allocations, peak retained memory, I/O, external calls, and retries. State explicitly whether network and paid-service latency are included or controlled.

6. **Profile before selecting an optimization.** The initial hypothesis ranking should be:
   - work proportional to declared input size;
   - work proportional to item count;
   - fixed overhead affecting the high-frequency small-request cohort.

   These are profiling targets, not established bottlenecks.

7. **Prove causality.** Change one factor at a time and compare on the identical workload and artifact. Use a negative control that restores the targeted cost in the old path. Require the target phase and end-to-end result to move outside run-to-run noise.

8. **Preserve behavior and resources.** Compare full semantics in memory, aggregating only mismatch counts. Check ordering, errors, retries, cancellation, completion, durability, and retained memory. Truncation, skipped validation, stale results, or unbounded retention invalidates a latency gain.

## Decision

The corpus supports a reproducible plan focused on payload-size scaling and tail latency, with frequency weighting tracked separately. It does not support a fresh performance baseline, a production distribution estimate, or a performance gate yet. Missing capabilities are the real request entry point, executable build, runtime and service configuration, hardware profile, cache state, and concurrency/retry policy.