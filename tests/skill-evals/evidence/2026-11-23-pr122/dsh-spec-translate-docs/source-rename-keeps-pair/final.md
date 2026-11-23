Renamed the guide and kept its pair coherent:

- [new-guide.md](/workspace/evals/files/source-rename/docs/new-guide.md)
- [new-guide.zh.md](/workspace/evals/files/source-rename/docs/new-guide.zh.md)
- [new-guide.i18n.yaml](/workspace/evals/files/source-rename/docs/new-guide.i18n.yaml)
- Updated the inbound link in [index.md](/workspace/evals/files/source-rename/docs/index.md)

Only switcher destinations and the index link changed; document prose was not retranslated. No `old-guide` references remain.

```bash
node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs write --all --root evals/files/source-rename
# recorded docs/new-guide.i18n.yaml; 1 record written

node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check --root evals/files/source-rename
# 1 pair(s) consistent
```

`git diff --check` also passed.