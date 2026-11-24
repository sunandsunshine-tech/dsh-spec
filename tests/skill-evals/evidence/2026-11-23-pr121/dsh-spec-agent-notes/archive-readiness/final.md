**Result: not sealed.**

The seal preparation succeeded with plan `bddfd304a6b393221589e57d1db4ba3ce8f8aeed1f070b90a04bcb89f3cdbe90`, covering the [candidate note](/workspace/evals/files/archive-readiness/.agents/dsh-spec-agent-notes/archived/process/2026-10-01-candidate.md) and its `.meta.json` companion.

The required external readiness check failed:

```text
review metadata is inconsistent
exit status: 1
```

The archive was left unsealed. Both unit hashes still match the prepared plan, [manifest.json](/workspace/evals/files/archive-readiness/.agents/dsh-spec-agent-notes/archived/manifest.json) remains `{"version":1,"files":{}}`, and Git reports no changes.

Repair the companion metadata so the readiness check passes, then rerun `archive --prepare` to generate a fresh plan before using `archive --write`.