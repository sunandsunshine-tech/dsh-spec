Used the installed `dsh-spec-translate-docs` skill with this exact command:

```bash
node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check --root evals/files/locale-pages --unpaired 'docs/detail.md' --unpaired 'docs/detail.zh.md'
```

Result: exit code `0`

```text
translate-pair: 1 pair(s) consistent.
```

The English-Chinese guide pair passed. Both locale-selected detail pages were excluded through `--unpaired`; no switchers, consistency records, or other pair artifacts were created for them. The corpus remains unchanged.