## Diagnosis

The checkout route is slow because it waits for the shipping-quote phase, not because of local order processing. In warm runs, the complete client result had a median of **83.026 ms**: **80.302 ms** in the quote phase, **0.173 ms** in local processing, and about **2.682 ms** in the combined client/HTTP/JSON residual.

Setting the simulated quote delay to zero reduced the median to **4.034 ms**, nearly 21× lower. Reintroducing 80 ms restored approximately 79 ms, confirming that dependency delay as the dominant causal factor.

The fixture uses a 2,000-line order. The client timer starts before `fetch()` and ends after JSON parsing; server timing begins immediately before `quoteShipping()` and separately times `buildOrder()` afterward ([client.mjs](/workspace/evals/files/end-to-end-boundary/client.mjs:5), [server.mjs](/workspace/evals/files/end-to-end-boundary/server.mjs:12)).

### Warm interleaved measurements

One warm-up call preceded seven measured calls per mode. Values are milliseconds.

| Mode | Complete client median (range) | Quote phase median (range) | Local processing median (range) | Untraced client/HTTP/JSON median (range) |
|---|---:|---:|---:|---:|
| 80 ms quote delay | **83.026** (82.445–84.995) | **80.302** (79.645–80.621) | **0.173** (0.116–0.299) | **2.682** (2.120–4.444) |
| 0 ms quote delay | **4.034** (3.265–4.624) | **1.203** (1.100–1.349) | **0.114** (0.106–0.301) | **2.725** (2.051–3.227) |

The quote phase remains around 1.2 ms at zero delay because it still creates 2,000 quote objects. Its mapping work is therefore small; the configured 80 ms wait dominates.

The direct `node diagnose.mjs` fixture run also showed first-request warm-up:

```text
80 ms fixture, total/quote/local:
101.793 / 80.993 / 1.113
 85.728 / 80.340 / 0.368
 85.651 / 80.864 / 0.298

0 ms fixture, total/quote/local:
 20.254 / 0.620 / 1.022
  5.710 / 1.206 / 0.266
  4.718 / 1.194 / 0.200
```

The first request carried roughly 16–20 ms of connection/runtime warm-up. It affects the complete result but is separate from the steady external-service contribution.

## Controls and exclusions

- **Controlled:** `EXTERNAL_DELAY_MS` changes only the simulated shipping quote wait ([external.mjs](/workspace/evals/files/end-to-end-boundary/src/external.mjs:3)). Running with it set to zero excludes the 80 ms wait and drops the route to roughly 4 ms.
- **Excluded:** local `buildOrder()` processing is not the bottleneck. It stayed below 0.31 ms in every measured call, including with 2,000 result items ([order.mjs](/workspace/evals/files/end-to-end-boundary/src/order.mjs:11)).
- **Measured but not separately decomposed:** the 2.1–4.4 ms residual combines client fetch overhead, loopback HTTP, response serialization/transfer, and JSON parsing. It remained stable across both quote-delay modes.
- **Not excludable from this fixture:** the “external” service is an in-process timer, not a remote vendor or network path. It cannot establish real DNS, TLS, connection-pool, retry, congestion, or vendor-tail behavior.

## Evidence and limits

All 14 interleaved calls and all six fixture calls returned 2,000 items. The owning path test passed `1/1`. Measurements used Node v26.13.1 on Linux x64 at revision `38ffd3a06ed6e4eab57c59a4ea84b45cebeeed3b`. No files were changed and the worktree remains clean.

Remaining limits are the synthetic in-process external delay, single-machine loopback transport, small sample count, and absence of concurrent-load, percentile-tail, browser, and production telemetry measurements. In particular, these results justify investigating or controlling the real shipping-quote dependency next; they do not quantify a real vendor’s production latency.