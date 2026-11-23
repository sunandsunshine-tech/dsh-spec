Removed Japanese from the eligible active documentation:

- Deleted `docs/active/first.ja.md` and `docs/active/second.ja.md`.
- Removed Japanese switcher links from both active source documents.
- Used bundled `write --all` to refresh `first.i18n.yaml` without Japanese and remove the now-empty `second.i18n.yaml`.
- Left `docs/archived/` unchanged.

Commands run:

```bash
node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs write --all --select 'docs/active/**'
node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check --select 'docs/active/**'
```

Result: `translate-pair: 1 pair(s) consistent.` The remaining active Chinese pair is consistent, and `git diff --check` passes.