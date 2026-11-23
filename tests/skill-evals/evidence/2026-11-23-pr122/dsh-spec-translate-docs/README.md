# PR #122 translation evidence

This directory records the source-renaming workflow against the current
`dsh-spec-translate-docs` skill tree.

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-translate-docs \
  --scenario source-rename-keeps-pair \
  --output tests/skill-evals/evidence/2026-11-23-pr122/dsh-spec-translate-docs/source-rename-keeps-pair \
  --sandbox workspace-write \
  --replace
```

| Scenario | Assertions | Status | Time |
|---|---:|---|---:|
| `source-rename-keeps-pair` | 4/4 | pass | 53.17 s |

The response renames the source, Chinese counterpart, aggregate record and inbound link together,
leaves the prose unchanged, and passes both the named-pair and full-corpus checks.

The retained scenario hash is
`bb887705bb97e7714279ab238644a24f30b2eae393421f201a1611df1b7141b5`. The complete current skill
manifest is:

```text
22cf8a4bad8e6eb8a6a659e5386c5d5ac07b3ee0249b4adbd7af7e04b7448df9  skills/dsh-spec-translate-docs/SKILL.md
dcc7d8c61e8e4de2ed3ebd7810acf5ac1c215b5b6ceab4defacf867b153c4be1  skills/dsh-spec-translate-docs/THIRD_PARTY_NOTICES
81fb63da09f52175fdf86c46bdc905ff7f35b75a63b511dceb52d0d14e65d8fb  skills/dsh-spec-translate-docs/references/pairing-contract.md
1fedc09be6c2758aacb590e992dff2b6a90c28eaafa957656d315176ee03f486  skills/dsh-spec-translate-docs/references/style-examples.md
b9c24c46d36fb3aa7cd17de9932d1e4a06ed1955f7ea1744a1b22f76ff87c5c2  skills/dsh-spec-translate-docs/references/translation-rules.md
f1b691f5f240a609426792467fc42999d0f23089a68ec28d992cec2a26a3e61c  skills/dsh-spec-translate-docs/scripts/translate-pair.mjs
```

Its aggregate SHA-256, without a trailing newline, is
`d651450ce6cbd7a66b1f844040a4192ed9127b074940e3e5ccb8a692c2b9e394`. The trace has one
completed turn and 29 completed command records; its four changed paths and patch replay consistently.
