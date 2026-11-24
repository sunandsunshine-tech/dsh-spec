Renamed the guide pair and aggregate record:

- [new-guide.md](/workspace/evals/files/source-rename/docs/new-guide.md)
- [new-guide.zh.md](/workspace/evals/files/source-rename/docs/new-guide.zh.md)
- [new-guide.i18n.yaml](/workspace/evals/files/source-rename/docs/new-guide.i18n.yaml)

Updated both switchers and the inbound link in [index.md](/workspace/evals/files/source-rename/docs/index.md). No Chinese prose or terminology was retranslated or changed. No `old-guide` references remain.

Commands run:

```bash
node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs write --all --select docs/new-guide.md
node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check docs/new-guide.md
node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check
```

The record write succeeded, and both pair checks reported: `translate-pair: 1 pair(s) consistent.`