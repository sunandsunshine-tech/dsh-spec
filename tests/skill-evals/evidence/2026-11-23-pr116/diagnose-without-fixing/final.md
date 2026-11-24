## Supported diagnosis

This is a **host-resource collision caused by non-atomic port allocation in the test fixture**.

[findFreePort](/workspace/evals/files/diagnosis-only/support/server.mjs:3) binds port `0`, reads the kernel-assigned port, closes that listener, and returns only the number. [The test](/workspace/evals/files/diagnosis-only/tests/server.test.mjs:6) then binds the same number later. During the gap between closing the probe and opening the real server, the port is unreserved and can be claimed by another process on the shared host.

That produces exactly the logged `EADDRINUSE` at `127.0.0.1:43127`. The failures span different revisions and shards on `pool-a`, while the same `def456` shard passes on `pool-b`; the [README](/workspace/evals/files/diagnosis-only/README.md:3) confirms independent shards share a self-hosted pool. This supports a pool-host resource collision, not a product concurrency defect.

The exact process holding `43127` remains unknown. It could have been another shard, a stale child, or an unrelated co-tenant.

## Timeout versus signal evidence

**Timeout: unsupported.** [ci.log](/workspace/evals/files/diagnosis-only/ci.log:1) contains no timeout threshold, elapsed duration, deadline message, or cancellation reason.

**Signal: directly observed.** `SIGTERM` is logged after each `EADDRINUSE`. The supported statement is that a process received `SIGTERM` following the bind error; its sender and causal role are unknown. It may be runner teardown or job cancellation, but it does not explain the port collision. No exit-code evidence establishes whether the signal killed the test or was cleanup after its failure.

## Smallest relevant reproduction

Use two independent processes in the same host network namespace:

1. Process A calls `findFreePort()` and obtains `P`.
2. Pause A after the probe closes.
3. Process C binds `127.0.0.1:P`.
4. Resume A and call `listen(P)`.

A deterministically receives `EADDRINUSE`. One contender is sufficient; running many test copies would only make the race probabilistically easier to hit. I did not execute this or rerun the project because the fixture is explicitly diagnosis-only.

## Remaining limits

The available repository contains no CI workflow, runner configuration, timestamps, process IDs, Node version, or host metrics. Therefore:

- The exact occupant of port `43127` cannot be identified.
- The failure rate cannot be measured.
- A persistent pool-local listener cannot be distinguished from a transient co-tenant collision.
- `pool-a` contention is strongly supported, but runner infrastructure failure cannot be assigned from these logs.
- The passing `pool-b` run does not prove the allocation race is absent; it only avoided the contender.
- No shipped application race is demonstrated. The defect is established in the fixture’s port reservation strategy.