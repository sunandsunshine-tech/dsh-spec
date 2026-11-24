# Agent Note: The model evidence runner treats model output as hostile

Status: implemented

English | [中文](2026-11-24-model-evidence-runner-bounds-hostile-output.zh.md)

## Problem

The model evidence runner gives model-controlled text and processes access to a project namespace. A credential embedded in an allowed catalog string can cross into that namespace, and a model can create sparse or dense files faster than the host can inspect them. A stdio byte limit alone therefore does not bound the final response, retained artifacts, Git inspection or hashing.

## Decision

Credential-like query names are normalized across case and separators. Compound key names such as `authkey`, `authkeyid`, `clientsecret` and `subscriptionkey` fail closed. Every URL candidate in every catalog string is validated as an absolute HTTP(S) URL with no userinfo and no credential-like query parameter. Malformed and unsupported URL forms fail without routing on parser message text.

Writable model directories are bounded tmpfs mounts: workspace 512 MiB, Codex home 64 MiB, response 8 MiB, home 128 MiB and temporary files 512 MiB. A read-only seed is copied into workspace and Codex home by a wrapper before Codex starts. The trusted Git directory and installed skills remain read-only overlays.

The wrapper owns a one-connection Unix socket, reports the model exit, kills remaining processes in its PID namespace, and waits while the host copies workspace and response through `/proc/<child-pid>/root`. No host result directory is mounted into the model namespace. A non-zero model exit skips final-response and artifact processing.

The final response is limited to 2 MiB. Each artifact is limited to 16 MiB, with at most 256 files and 64 MiB total. Logical sizes are checked before reading, copying or retaining a file, which also rejects sparse files ignored by tmpfs block quotas. Hashes stream through a 64 KiB buffer and accept an independent byte limit.

## Verification

`tests/runner-safety.test.ts` covers credential names, embedded and malformed catalog URLs, exact final and artifact limits, streaming-hash memory, bounded tree copies, generated tmpfs arguments, a real bwrap workspace quota, a real model-runner success path, and a failing model that creates oversized outputs. `tests/skill-scenarios.test.ts` verifies that historical evidence helpers ignore every inherited `GIT_*` variable and that PR #121 evidence remains bound to its recorded revisions rather than being described as current behavior.

## Alternatives considered

**Bind host workspace, Codex home and response directories directly.** This preserves the old data flow, but a sparse file can exceed the host filesystem before any post-run check runs.

**Depend on tmpfs quotas alone.** tmpfs limits allocated blocks and permits sparse logical files much larger than the quota, so host-side logical-size checks remain necessary.

**Classify URL parse errors by message text.** Parser text is not a stable security discriminator; malformed and unsupported URLs must fail regardless of the text in the thrown error.

**Read and hash complete files before deciding whether they fit.** The decision would consume the resource it is meant to bound. Size checks precede allocation, and hashing streams fixed-size chunks.

**Mount the host result directory for collection.** The model could write directly into the retained result area. Keeping the result directory outside the namespace and copying through a private, post-exit control path preserves one bounded collection point.

## Consequences

- A model cannot allocate more than the declared workspace, home, response and temporary quotas.
- Sparse files that fit block quotas but exceed logical output limits fail before Git or artifact processing.
- A model that produces oversized final responses or artifacts without failing still has those outputs rejected by the host before retention.
- The runner depends on `bubblewrap --size` and a Linux `/proc` namespace view.
- The evidence corpus still requires reviewer grading; these resource guarantees do not make a model trace an execution attestation.
