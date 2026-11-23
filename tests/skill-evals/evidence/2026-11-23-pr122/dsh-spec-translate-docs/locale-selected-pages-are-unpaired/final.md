The documentation corpus check passed with exit code 0:

```bash
node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check --root evals/files/locale-pages --unpaired docs/detail.md --unpaired docs/detail.zh.md
```

Output:

```text
translate-pair: 1 pair(s) consistent.
```

The maintained English-Chinese `docs/guide.md` pair is consistent. The locale-selected detail pages were excluded from pairing. No `detail.i18n.yaml`, switcher, or other pair artifacts were created, and the worktree remains unchanged.