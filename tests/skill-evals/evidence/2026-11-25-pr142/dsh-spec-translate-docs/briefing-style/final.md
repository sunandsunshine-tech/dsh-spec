**Handoff to clean-context translator**

The pair is intentionally unchanged and still out of sync. No project files were modified, the worktree is clean, and temporary recovery metadata was removed.

Affected target: [docs/guide.zh.md](/workspace/evals/files/briefing-style/docs/guide.zh.md)

Committed source diff:

```diff
-The gate checks requests before dispatch.
+The gate checks every request and records the failure before dispatch.

-Operators can retry a failed request once.
+Operators can retry a failed request once. A second failure requires support.
+
+> [!WARNING]
+> Preserve the request identifier.
```

Translate minimally within these current Chinese sections:

```markdown
# 指南

[English](guide.md) | 中文

门禁（gate）在执行分派前检查请求。

## 运维

运维人员可以重试一次失败的请求。
```

Before editing, read the project instructions and binding sources:

- [AGENTS.md](/workspace/evals/files/briefing-style/AGENTS.md)
- [style.md](/workspace/evals/files/briefing-style/docs/style.md)
- [terminology.md](/workspace/evals/files/briefing-style/.agents/dsh-spec-translate-docs/terminology.md)
- `.agents/skills/dsh-spec-translate-docs/SKILL.md`
- The skill’s `references/translation-rules.md`

Required calibration:

- Preserve the switcher, headings, paragraph structure, and `[!WARNING]` callout structure.
- `gate` remains `门禁`; its first occurrence keeps `门禁（gate）`.
- Render `failure` as `故障`; reserve `失败` for an unsuccessful user attempt.
- Render `support` as `技术支持`.
- Begin the warning text with `注意：`.
- There is no unresolved terminology decision blocking this update. `request` already has the in-pair precedent `请求`.

Observed baseline:

- `list ... --root evals/files/briefing-style`: `out-of-sync`, exit 0.
- `check ... --root evals/files/briefing-style`: exit 1; `/guide` and `/guide/operations` changed since confirmation.
- The bundled `brief` was recovered successfully and identified heading-level updates for both sections; no `--apply` is valid because this is prose work.

After the smallest natural Chinese edit, run from `/workspace`:

```bash
node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs write 'docs/guide.md' --target 'zh=中文' --root 'evals/files/briefing-style'
node .agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check 'docs/guide.md' --target 'zh=中文' --root 'evals/files/briefing-style'
```

The requested end state is a minimal Chinese counterpart update plus the corresponding generated record update, with `check` exiting 0.