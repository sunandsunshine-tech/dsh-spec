Renamed the English guide to [new-guide.md](/workspace/evals/files/source-rename/docs/new-guide.md) and moved the [Chinese counterpart](/workspace/evals/files/source-rename/docs/new-guide.zh.md) and [aggregate record](/workspace/evals/files/source-rename/docs/new-guide.i18n.yaml) with it. Updated both language switchers and the [index link](/workspace/evals/files/source-rename/docs/index.md). Translated content was left unchanged.

Verification:

- `translate-pair.mjs write --all --root .` → 1 record written.
- `translate-pair.mjs check --root . docs/new-guide.md` → 1 pair consistent.
- `translate-pair.mjs check --root .` → 1 pair consistent.
- No `old-guide` references remain.
- `git diff --check -- .` passed.