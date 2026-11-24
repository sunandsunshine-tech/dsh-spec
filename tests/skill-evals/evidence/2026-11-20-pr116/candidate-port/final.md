Fixed the scan-then-bind race. The original `findFreePort()` released its probe before the real server claimed the port, leaving a TOCTOU window. The pre-fix `npm test` reproduced it deterministically:

```text
Error: listen EADDRINUSE: address already in use 127.0.0.1:44855
```

The test now calls `listen(0)` directly in [server.test.mjs](/workspace/evals/files/port-collision/tests/server.test.mjs:7). The listener waits for its callback before reading `server.address().port` in [server.mjs](/workspace/evals/files/port-collision/support/server.mjs:13), and cleanup awaits `server.close()`.

Verification:

- Focused `npm test`: **1 passed, 0 failed**
- Eight independent `npm test` processes run concurrently: **all eight passed**
- `git diff --check`: passed

That concurrent-process success is the required evidence for this host-resource fix. Global serialization would hide rather than remove the collision, and a timeout increase is irrelevant because no timeout is involved. I deliberately added neither, nor any retry.