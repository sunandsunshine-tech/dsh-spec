# PR #113 outcome-classification evidence

> **Historical status:** this run predates later error-handling edits and is retained as provenance.
> Current targeted evidence for the later changes is under
> [the issue #147 evidence](../2026-11-26-issue-147/dsh-spec-error-handling/).

This directory records the model check for the error contract added by PR #113.

```sh
node tests/skill-evals/run-model-eval.mjs \
  --skill dsh-spec-error-handling \
  --scenario outcome-classification-and-extensible-codes \
  --output tests/skill-evals/evidence/2026-11-23-pr113/outcome-classification-and-extensible-codes \
  --sandbox workspace-write \
  --replace
```

| Scenario | Assertions | Status | Time |
|---|---:|---|---:|
| `outcome-classification-and-extensible-codes` | 4/4 | pass | 44.78 s |

The response keeps documented exit status `1` as a successful empty search, preserves the plugin
family as an open code type, exports its known constants, and keeps unknown provider codes instead
of rejecting or reclassifying them.

The retained scenario hash is
`1b50c21040d751a42f983d8e3d2a1e94b5a6cbc6927de85a89327ed16959297b`. The skill manifest at run
time was:

```text
d0fcc4336a5ce2d71d357447fc13ac25a9ede594d721db0fcd40db237b075990  skills/dsh-spec-error-handling/SKILL.md
134def8b2ef7592d000f9ceba4da58153ad2a2bf98365fb671ce0632f5eeef14  skills/dsh-spec-error-handling/THIRD_PARTY_NOTICES
b33e83b46d544140a30b7d53f524787b8c4b8e6ab159f16821dc5f220d341afc  skills/dsh-spec-error-handling/references/error-contracts.md
```

The aggregate SHA-256, without a trailing newline, is
`aca88e4a6f6ab13d8600cbc6a4ad239b5d03af70919850bb76a66ac863af1626`. The trace is answer-blind,
`final.md` equals its final agent message, and the retained patch contains only the declared fixture.
