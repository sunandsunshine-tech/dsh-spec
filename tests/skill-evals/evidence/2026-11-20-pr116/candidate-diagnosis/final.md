**Supported diagnosis**

Both failures in [ci.log](/tmp/dsh-pr116-behavior-final.HOhv5D/diagnosis/ci.log:1) have the same signature: `EADDRINUSE` on `127.0.0.1:43127`. That is a host-resource collision.

The checked-in test exposes the likely mechanism in [server.mjs](/tmp/dsh-pr116-behavior-final.HOhv5D/diagnosis/support/server.mjs:3) and [server.test.mjs](/tmp/dsh-pr116-behavior-final.HOhv5D/diagnosis/tests/server.test.mjs:6):

1. A probe listens on an OS-assigned port.
2. The probe records the number and closes, releasing the port.
3. The test later binds a different server to that number.

Nothing reserves the port between steps 2 and 3. On the shared pool, another shard or local process can claim it first. Whether that happens depends on timing and host activity, explaining the intermittency.

The recorded `SIGTERM` is a separate event and does not establish the cause. Run 1003’s pass on `pool-b` supports environment or contention dependence, but one pass does not prove stability or rule out a product race.

**Remaining limits**

- The failures are for revisions `abc123` and `def456`, but neither object exists locally; HEAD is `b7a449e`. I therefore cannot prove those runs used exactly the inspected source and configuration.
- `43127` appears only in the log; the current source acquires a dynamic port. That is consistent with the race, but not forensic proof for the historical runs.
- No host IDs, timestamps, workflow configuration, or process-owner data are present. The exact host and competing process are unknown, and simultaneous acquisition cannot be proven.
- It is unclear whether the occupant was another live shard or a stale process.
- As requested, no CI or tests were rerun, so there is no concurrent-process reproduction or negative-control result.

Inspected with `cat ci.log`, `rg` for the port and server calls, `git show HEAD`, and `git cat-file` for the logged revisions. No files were changed and no tests or CI runs were started.