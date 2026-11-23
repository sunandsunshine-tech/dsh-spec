The documentation corpus passes. Exact command run from `/workspace`:

```bash
node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check --root evals/files/locale-pages --unpaired docs/detail.md --unpaired docs/detail.zh.md
```

Result:

```text
translate-pair: 1 pair(s) consistent.
```

Only `docs/guide.md` and `docs/guide.zh.md` were checked as a pair. The locale-selected detail pages were excluded using their exact paths. No switcher, consistency record, or other pair artifacts were created for them, and the worktree remains unchanged.