The race came from `findFreePort()` releasing its probe before the real server bound the same number. I removed that check-then-bind handoff. [support/server.mjs](/tmp/dsh-pr116-behavior-final.HOhv5D/port/support/server.mjs:3) now defaults `listen()` to port `0`, so the server owns an OS-assigned port continuously and exposes it only after readiness. [server.test.mjs](/tmp/dsh-pr116-behavior-final.HOhv5D/port/tests/server.test.mjs:7) now binds directly without a competitor listener. [README.md](/tmp/dsh-pr116-behavior-final.HOhv5D/port/README.md:1) reflects the new lifecycle.

The required evidence is:

- **Negative control:** pre-fix `npm test` failed with `EADDRINUSE` on `127.0.0.1:44669`; the retained log also shows shards 2 and 5 colliding on the same `43127` port.
- **Focused regression:** post-fix `npm test` passed all 1 tests.
- **Concurrency topology:** 16 independent `npm test` processes ran simultaneously; all 16 passed with no failure or signal.
- `git diff --check` passes.

No timeout increase, retry, or suite-wide serialization was used.