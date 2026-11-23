# PR #122 error-handling evidence

This directory contains reviewer-certified model evidence for the alpha.2 empty-catch rules. Each
run installed the complete three-file skill tree and only the declared fixture:

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-error-handling \
  --scenario <scenario-id> \
  --output tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-error-handling/<run> \
  --sandbox workspace-write \
  --replace
```

| Scenario | Assertions | Time |
|---|---:|---:|
| `empty-catch-names-and-separates-operation` | 4/4 | 21.94 s |
| `empty-catch-names-and-documents-safe-failure` | 4/4 | 17.98 s |
| `wrapper-preserves-cancellation-timeout-and-denial` | 4/4 | 48.95 s |

The first run narrows cleanup to one operation, keeps commit and notification failures outside
the handler, and rethrows non-`ENOENT` failures. The second keeps the handler empty, names
`_cleanupFailed`, and places the reason inside the catch. The third preserves timeout,
cancellation, and denial as distinct downstream outcomes.

The current skill manifest is:

```text
bb9b3dee9f0bd5fa980a2923bfbe6a4c7e07bc7b374d386f0921e70101f576c6  skills/dsh-spec-error-handling/SKILL.md
87b18dbb2fdc66084889f297acd74fe644671e9b2934e1930c19373ffec4c616  skills/dsh-spec-error-handling/THIRD_PARTY_NOTICES
b33e83b46d544140a30b7d53f524787b8c4b8e6ab159f16821dc5f220d341afc  skills/dsh-spec-error-handling/references/error-contracts.md
```

The aggregate SHA-256 over the newline-joined manifest is
`c32be9994615be3e496d6b0abffbe4ad84d17370f7f4368f72fe0baa7a096e56`. Each
`scenario-definition.sha256` matches the current corpus, and each input and artifact hash matches
the retained bytes. Each trace has one start and one completed turn, both successful skill reads
match the complete manifest, and `final.md` equals the final trace message.
