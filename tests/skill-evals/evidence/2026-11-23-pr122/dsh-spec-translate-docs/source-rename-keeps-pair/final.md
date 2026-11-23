Renamed the English guide, Chinese counterpart, and aggregate record:

- [new-guide.md](/workspace/evals/files/source-rename/docs/new-guide.md)
- [new-guide.zh.md](/workspace/evals/files/source-rename/docs/new-guide.zh.md)
- [new-guide.i18n.yaml](/workspace/evals/files/source-rename/docs/new-guide.i18n.yaml)

Updated both switchers and the inbound link in [index.md](/workspace/evals/files/source-rename/docs/index.md). No `old-guide` references remain, and the document prose is unchanged.

Commands run from the project root:

```text
node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs write --all --root .
→ 1 record written

node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check --root .
→ 1 pair consistent
```