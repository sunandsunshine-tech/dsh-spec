Renamed the pair and record to [new-guide.md](/workspace/evals/files/source-rename/docs/new-guide.md), [new-guide.zh.md](/workspace/evals/files/source-rename/docs/new-guide.zh.md), and [new-guide.i18n.yaml](/workspace/evals/files/source-rename/docs/new-guide.i18n.yaml). Updated both switchers and the inbound [index.md](/workspace/evals/files/source-rename/docs/index.md:3) link. Chinese prose was left unchanged.

Validation:

- `translate-pair.mjs write --all --select docs/new-guide.md` — record written successfully.
- `translate-pair.mjs check docs/new-guide.md` — `1 pair(s) consistent`.
- No remaining `old-guide` references; `git diff --check` passed.