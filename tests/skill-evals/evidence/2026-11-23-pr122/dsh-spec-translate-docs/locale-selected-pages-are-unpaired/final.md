Checked successfully with the `dsh-spec-translate-docs` checker:

```bash
node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check --root evals/files/locale-pages --select 'docs/*.md' --require-target zh --unpaired 'docs/detail.md' --unpaired 'docs/detail.zh.md'
```

Result: exit 0

```text
translate-pair: 1 pair(s) consistent.
```

`docs/guide.md` and `docs/guide.zh.md` are consistent. Both detail pages were excluded as unpaired locale-selected pages; no detail-page switchers or consistency records were created, and the worktree remains clean.