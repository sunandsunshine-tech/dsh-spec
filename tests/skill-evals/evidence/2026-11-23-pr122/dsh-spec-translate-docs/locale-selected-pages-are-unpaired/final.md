The documentation corpus passes.

Exact command run from `/workspace`:

```bash
node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check --root evals/files/locale-pages --target zh --unpaired docs/detail.md --unpaired docs/detail.zh.md
```

Result: exit `0`

```text
translate-pair: 1 pair(s) consistent.
```

The maintained [guide.md](/workspace/evals/files/locale-pages/docs/guide.md) / [guide.zh.md](/workspace/evals/files/locale-pages/docs/guide.zh.md) pair is consistent. The locale-selected detail pages remain unpaired with no switcher and no consistency-record artifacts created.