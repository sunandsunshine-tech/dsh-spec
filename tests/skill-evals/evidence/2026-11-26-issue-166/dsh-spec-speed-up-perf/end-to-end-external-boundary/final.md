The checkout route is dominated by the simulated shipping-quote wait, not local order processing. In warm measurements, the complete Node client result had a median of **85.638 ms** at the default 80 ms provider delay: approximately **80.206 ms external**, **0.255 ms local**, and **5.173 ms unattributed path overhead**.

The client timer spans `fetch` plus `response.json()` in [client.mjs](/workspace/evals/files/end-to-end-boundary/client.mjs:3). Server phases come from [server.mjs](/workspace/evals/files/end-to-end-boundary/server.mjs:15): external includes the timer and quote mapping in [external.mjs](/workspace/evals/files/end-to-end-boundary/src/external.mjs:3), while local covers only `buildOrder` in [order.mjs](/workspace/evals/files/end-to-end-boundary/src/order.mjs:9).

### Measured evidence

Three fresh fixture processes per mode were interleaved; the first request in each process was treated as warm-up, leaving six measured calls per mode. The workload was 2,000 order lines over localhost.

| Mode | Complete client median (range) | External median (range) | Local median (range) | Composite residual median (range) |
|---|---:|---:|---:|---:|
| 80 ms | 85.638 ms (84.007–87.893) | 80.206 ms (79.560–80.435) | 0.255 ms (0.222–0.359) | 5.173 ms (3.927–7.266) |
| 0 ms | 7.736 ms (4.225–10.948) | 1.281 ms (0.165–1.424) | 0.294 ms (0.214–0.415) | 6.124 ms (3.846–9.109) |

Raw warm client totals:

- `EXTERNAL_DELAY_MS=80`: `[86.506, 84.007, 86.344, 84.933, 87.893, 84.247]`
- `EXTERNAL_DELAY_MS=0`: `[10.948, 8.111, 5.798, 4.225, 7.637, 7.836]`

Removing the configured external delay reduced median client completion by **77.902 ms, or 91.0%**. The external phase itself fell by 78.925 ms, while local processing changed by only 0.039 ms, consistent with measurement noise. At the default setting, external time is **93.7%** of warm end-to-end completion and local order building is **0.3%**.

The literal fixture runs were consistent:

- `node diagnose.mjs`: totals `[99.984, 85.126, 84.401] ms`
- `EXTERNAL_DELAY_MS=0 node diagnose.mjs`: totals `[21.683, 5.681, 5.104] ms`

The first request in each fresh process was substantially more expensive—roughly 21–27 ms of unattributed overhead and about 1–2 ms of local work.

### Controls and exclusions

- `EXTERNAL_DELAY_MS=0` controls and excludes the configured 80 ms wait, but not the adapter itself. About 1.3 ms remains because `delay(0)` still yields to the event loop and the adapter maps all 2,000 quotes.
- Local transformation is measured independently, but cannot be removed through an existing fixture control without changing behavior.
- The residual is deliberately not called “client processing.” It contains request scheduling, HTTP handling, `JSON.stringify` on `response.end`, localhost transfer, body decoding, `response.json()`, and event-loop scheduling.
- The complete client result remains the correct user-facing boundary; the zero-delay run only identifies and removes the dominant external contribution.

### Remaining limits

The shipping service is simulated by a timer, so real network latency, DNS/TLS, vendor contention, retries, throttling, and failures are not covered. Only sequential calls at 2,000 items on one WSL2 host were measured; concurrency, payload scaling, browser behavior, and production telemetry remain unknown. The residual 5–6 ms was not profiled further, and there is no project performance gate.

Runtime was Node `v26.13.1` on Linux `6.18.58.1-microsoft-standard-WSL2 x86_64`. The functional test passed (`1/1`), all calls returned 2,000 items, repository `5d12725` remains clean, and no code was changed.

The evidence does not justify optimizing `buildOrder` first. Any later optimization should target the external shipping-quote boundary and be validated against a real-service trace.