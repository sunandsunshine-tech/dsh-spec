**Result**

The corpus supports workload planning but not a performance verdict. It contains 10 valid single-turn records, all with distinct session identifiers. No production entry point, benchmark harness, or profiler configuration exists elsewhere in the current project, so no benchmark was run.

| Workload axis | Aggregate observation | Planning use |
|---|---:|---|
| Input size | 64–8,192 bytes; median 140; upper quartile 1,664 | Exercise approximately 144 B, 2 KiB, and 8 KiB |
| Item count | 0–640; median 6 | Exercise approximately 0, 6, 12, and 640 |
| Output size | 28–109 bytes; median 59 | Validate output and retained-memory behavior |
| Occurrence weight | 167 total; median 13 per record; top three records account for 58% | Frequency weighting only, not concurrency |
| Supplied latency | 9.2–412.8 ms; median 40.9; 2 records above 200 ms | Historical lead only, not a local baseline |

Large inputs and large item counts coincide, so their effects are confounded in this sample. The descriptive rank association was strong for input size versus supplied latency, weaker for item count versus latency, and weak between input size and item count. With only ten observations, this does not establish causality or a stable percentile.

The declared byte fields do not equal the encoded lengths of the accompanying text fields in any record. Treat them as workload metadata rather than direct fixture sizes. The mapping from production input to declared bytes and item count must be confirmed from the production call site. The sample also contains no multi-turn, multiline, or non-ASCII cases.

**Reproducible Investigation Plan**

1. Freeze the exact production operation, entry artifact, completion condition, included setup, and excluded network/model/service costs before measuring.

2. Generate deterministic fixtures from reviewed constants rather than corpus content. Use a fixed seed and controlled byte length, item count, ordering, and output cardinality.

3. Start with these synthetic cells: 144 B/6 items, 2 KiB/12 items, 8 KiB/6 items, 144 B/640 items, 8 KiB/640 items, and 64 B/0 items. The separate input-tail and item-tail cells test the correlation structure rather than assuming one cause. Add output-size or representation cells only when they can change the measured path.

4. Use one warm-up and at least five measured samples per baseline/cell, retaining every sample and reporting median plus range. Use fresh processes for cold-start cases. For a p95 claim, collect at least 30 samples per side; do not derive a stable tail from the ten-record corpus.

5. Measure phase latency, CPU, allocations or retained memory, I/O, call counts, and lock contention as applicable. Keep produced results reachable through the endpoint, apply a declared GC policy, and distinguish transient allocation from retained endpoint memory.

6. Preserve the workload, fixture checksum, cache state, runtime, source revision, command, platform, sampling policy, and validation result across baseline and candidate. Interleave baseline and candidate runs. Report absolute values, ratios, and all raw samples.

7. Profile before proposing a change. After a candidate exists, rerun the original implementation or deliberately reintroduce the suspected work as a negative control. A confirmed effect must survive on the parent production path and must not regress the typical cell.

8. Set no performance gate yet. Establish a project-owned threshold only after repeated measurements reveal noise and the owner supplies the required budget.

Missing capabilities are the production entry path/artifact, approved benchmark package, approved profiler, and confirmation of how declared byte/item metadata maps to the exercised operation. Measurement stops at planning until those become available; no substitute package or network service should be used.

The corpus is planning evidence only and will not become a fixture, log, or benchmark input. Final evidence is aggregate-only. No raw prompts, outputs, paths, session identifiers, credentials, recordings, or recognizable snippets are included. The project remains unchanged.