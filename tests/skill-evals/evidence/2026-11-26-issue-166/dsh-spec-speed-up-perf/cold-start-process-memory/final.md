## Result

The first-use slowdown is dominated by fresh-process overhead. Warm batch execution is roughly 7× faster end to end, but that ratio includes Node bootstrap, import, GC, and process exit—not a sevenfold improvement in batch computation.

The post-batch worker growth has two distinct components:

- **Reachable state:** exactly 32 KiB of `arrayBuffers` per distinct batch ID remains in the module-level `retained` map. At 30 batches this is 983,040 bytes; releasing the map reduces it to zero.
- **Resident process footprint:** RSS remains elevated after release. In the 30-batch diagnostic it stayed approximately 10.2 MiB above baseline, even with endpoint-reachable buffers at zero. This is allocator/high-water memory, not live batch state.

The temporary parsed-row arrays do not remain reachable: immediate heap garbage was approximately 452 KiB per batch, falling to approximately 0.5–1.7 KiB after a synchronous major GC.

## Method

Measured [probe.mjs](/workspace/evals/files/cold-start-process-memory/probe.mjs), [worker.mjs](/workspace/evals/files/cold-start-process-memory/worker.mjs), and [session.mjs](/workspace/evals/files/cold-start-process-memory/src/session.mjs) at clean commit `397a3532759bda5b39be1f005126694e215513ca`.

Runtime was Node.js `v26.13.1`, V8 `14.6.202.34-node.40`, Linux x64, 22 available CPUs. No code or configuration was changed; the worktree was clean before and after.

The workload was fixed at 30 batches × 2,000 rows, matching the fixture. Timing used:

- `node probe.mjs` for five independent fresh-process samples.
- A same-process warm harness with one untimed 30-batch warm-up, followed by five timed 30-batch samples.
- A fresh-child harness to break cold time into bootstrap, import, first workload, and GC phases.

Memory sampling used `process.memoryUsage()` with synchronous `global.gc({ type: 'major', execution: 'sync' })`. The negative control released the retained map and collected again.

## Timing evidence

| Path | Raw samples (ms) | Median | Range |
|---|---|---:|---:|
| Provided fresh-process fixture, end to end | 38.436, 40.021, 39.940, 37.688, 37.953 | **38.436** | 37.688–40.021 |
| Fresh child, first 30-batch workload after import | 12.317, 12.085, 11.681, 11.629, 11.513 | **11.681** | 11.513–12.317 |
| Warm 30-batch workload | 6.034, 5.503, 5.837, 5.256, 5.152 | **5.503** | 5.152–6.034 |

The provided cold fixture median was about **6.98×** the warm workload median. The warm timer excludes startup, import, explicit GC, and exit; the fresh fixture timer includes them.

Supplementary cold phase medians:

- Node pre-script/bootstrap: 16.452 ms
- Module import: 0.514 ms
- First 30-batch workload: 11.681 ms
- Exit-end major GC: 1.560 ms
- Child elapsed through that GC: 30.157 ms
- Instrumented parent spawn-to-exit wall: 40.908 ms

The instrumented parent value is higher than the provided fixture because `-e` evaluation, output serialization, spawn/IPC, and reaping add overhead.

## Memory evidence

One-batch lifecycle over five trials:

| Measurement | Median | Range |
|---|---:|---:|
| Immediate `heapUsed` delta, before GC | +451,904 B | +448,760 to +452,560 B |
| `heapUsed` after major GC | +712 B | +536 to +1,712 B |
| `arrayBuffers` after major GC | +32,768 B | exactly +32,768 B in all trials |
| `arrayBuffers` after map release and GC | 0 B | 0 B in all trials |
| `external` after map release and GC | +32,768 B | +32,768 B in all trials |

The immediate heap result is garbage-visible memory, not total allocation volume. Its collapse after GC shows the row and parsing intermediates are transient.

For accumulated batches, after forced GC:

| Retained batches | `arrayBuffers` delta |
|---:|---:|
| 1 | 32,768 B |
| 5 | 163,840 B |
| 10 | 327,680 B |
| 20 | 655,360 B |
| 30 | 983,040 B |
| 0 after release | 0 B |

All five provided fresh-process fixtures independently reported +983,040 bytes of `arrayBuffers` with 30 retained batches and 0 after release. Their post-GC `heapUsed` delta was 128,448–134,896 bytes, which is observational and not attributable byte-for-byte.

At the 30-batch checkpoint, RSS was +10,174,464 bytes and remained exactly there after release. `external` remained +950,312 bytes. Thus process residency stayed high after reachable buffer memory reached zero.

## Interpretation and limits

The source explains retained growth: every unique `batch.id` places a 32 KiB unpooled buffer and summary into the module-level map, and the fixture provides no eviction except explicit `releaseRetainedBatches()`. The release control distinguishes that reachable state from temporary parsing allocations and allocator/page high-water.

Limits:

- Fresh-process samples are not machine-cold; the Node executable and project modules were already in the OS page cache.
- Five sequential samples on one unpinned runner are enough for a bounded local diagnosis, not percentile or gate claims.
- The warm timer and cold fixture timer have deliberately different inclusions.
- No CPU profile, heap retainer graph, or allocation profiler was collected. Immediate heap deltas are snapshots and can miss allocations already collected.
- `process.memoryUsage()` is coarse and allocator-dependent. Elevated RSS after release does not prove a JavaScript object leak; conversely, `arrayBuffers === 0` does not mean those pages were returned to the OS.
- No performance gate is defined, and no optimization was attempted.

The owning test passed: deterministic summary returned and retained state cleared successfully.