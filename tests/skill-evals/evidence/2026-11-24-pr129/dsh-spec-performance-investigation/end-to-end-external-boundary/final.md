## Diagnosis

The checkout route is dominated by the external shipping-quote wait. At the fixture’s default 80 ms setting, the complete client call had a median of **82.779 ms**, while local order assembly took **0.129 ms**. Setting the documented external delay control to 0 ms reduced complete client latency to **3.314 ms**.

The complete result is measured by [client.mjs](/workspace/evals/files/end-to-end-boundary/client.mjs:3) from immediately before `fetch()` until the full response JSON has been parsed. The server’s phase boundaries are in [server.mjs](/workspace/evals/files/end-to-end-boundary/server.mjs:15): `externalMs` covers `quoteShipping`, and `localMs` covers only `buildOrder`. The quote simulation is in [external.mjs](/workspace/evals/files/end-to-end-boundary/src/external.mjs:3), and local assembly is in [order.mjs](/workspace/evals/files/end-to-end-boundary/src/order.mjs:9).

### Controlled measurement

One warm-up per condition was excluded, followed by seven measured, interleaved calls per condition. Values are milliseconds.

| Condition | Complete client median (range) | External quote median (range) | Local order median (range) | Client/HTTP/serialization remainder median (range) |
|---|---:|---:|---:|---:|
| 80 ms baseline | 82.779 (82.101–83.527) | 80.150 (79.414–80.390) | 0.129 (0.111–0.234) | 2.551 (2.354–3.369) |
| 0 ms control | 3.314 (3.065–4.320) | 1.168 (1.119–1.331) | 0.126 (0.106–0.287) | 2.038 (1.833–2.724) |

The 80 ms delay accounts for essentially all route latency. The control reduced median completion by **79.465 ms**, about **25×** in this synthetic comparison—not a production speedup prediction.

The fixture’s own `node diagnose.mjs` run produced:

- Default totals: 103.266, 85.828, 84.846 ms; external phases: 81.083, 80.289, 80.929 ms; local phases: 1.093, 0.334, 0.307 ms.
- `EXTERNAL_DELAY_MS=0` totals: 21.187, 4.514, 5.142 ms; external phases: 1.768, 0.163, 1.249 ms; local phases: 0.928, 0.257, 0.194 ms.
- The first sample in each fresh process is cold and materially slower.

## Control and exclusions

- The external delay can be controlled without code changes through `EXTERNAL_DELAY_MS`.
- Process startup and server creation/listening are excluded because timing begins after the server is ready.
- The external phase and local application phase are separately exposed, but response serialization, loopback HTTP transport, fetch handling, and JSON parsing are only derivable as the remainder `client total - external - local`.
- The external service cannot be fully excluded with the current path: the route unconditionally calls `quoteShipping`, and the 0 ms control still performs its 2,000-item mapping. That residual computation measured about 1.17 ms.
- Local `buildOrder` is not the bottleneck at this workload.

## Remaining limits

This is a single-host, sequential loopback observation using Node `v26.13.1`, revision `a907d4940ffbffc3fa7afd9c399fbbd0ae9a96bb`, with 2,000 order lines and 700 unique SKUs. It does not model real remote-service DNS, TLS, connection reuse, upstream load, retries, queueing, or latency percentiles. The “external” implementation is an in-process simulated delay rather than a network service.

Functional behavior was retained: every run returned all 2,000 items. `npm test` passed 1/1, and the repository remains clean with no code changes.

**Decision:** the next meaningful investigation should target real shipping-quote service and transport latency. Reconsider quote-mapping or response serialization costs only after that delay is reduced; optimizing local `buildOrder` has negligible current impact.