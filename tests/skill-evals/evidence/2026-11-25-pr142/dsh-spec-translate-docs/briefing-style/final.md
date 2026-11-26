The source change is committed, but `docs/guide.zh.md` and `docs/guide.i18n.yaml` have not been updated, so the pair remains out of sync. No files were modified in this context, and the working tree is clean.

Observed results:

- `list --root evals/files/briefing-style`: `out-of-sync docs/guide.md [zh]`
- `check docs/guide.md --root evals/files/briefing-style`: exit 1, with `/guide` and `/guide/operations` out of sync
- The canonical briefing was recovered successfully from the committed last-confirmed state using an in-project temporary Git view, which was removed afterward
- The direct `brief` command initially failed because its Git lookup used repository-root paths despite the nested `--root`; the recovered result is below

### Clean-context translator handoff

Work from `/workspace`. Before editing, read:

- `evals/files/briefing-style/AGENTS.md`
- `evals/files/briefing-style/docs/style.md`
- `evals/files/briefing-style/.agents/dsh-spec-translate-docs/terminology.md`
- `/workspace/.agents/skills/dsh-spec-translate-docs/references/translation-rules.md`

Update only `evals/files/briefing-style/docs/guide.zh.md`. The bundled `write` command should update the aggregate record. Do not edit the source, style, or terminology files.

Project-specific requirements:

- Render `failure` as `故障`; reserve `失败` for an unsuccessful user attempt.
- Render `support` as `技术支持`.
- Begin the warning with `注意：`.
- Preserve the first-occurrence terminology form `门禁（gate）` and preserve all unchanged reviewed wording.

Canonical briefing:

````markdown
# Translation update briefing: docs/guide.md

The English side changed; bring `docs/guide.zh.md` along with the smallest edit that covers the change.

## English diff (last-confirmed -> current)

```diff
@@ -3,7 +3,10 @@
 English | [中文](guide.zh.md)
 
-The gate checks requests before dispatch.
+The gate checks every request and records the failure before dispatch.
 
 ## Operations
 
-Operators can retry a failed request once.
+Operators can retry a failed request once. A second failure requires support.
+
+> [!WARNING]
+> Preserve the request identifier.
```

## Changed sections

### Guide

Last-confirmed English:

```markdown
# Guide

English | [中文](guide.zh.md)

The gate checks requests before dispatch.
```

Current English:

```markdown
# Guide

English | [中文](guide.zh.md)

The gate checks every request and records the failure before dispatch.
```

Current 中文:

```markdown
# 指南

[English](guide.md) | 中文

门禁（gate）在执行分派前检查请求。
```

### Operations

Last-confirmed English:

```markdown
## Operations

Operators can retry a failed request once.
```

Current English:

```markdown
## Operations

Operators can retry a failed request once. A second failure requires support.

> [!WARNING]
> Preserve the request identifier.
```

Current 中文:

```markdown
## 运维

运维人员可以重试一次失败的请求。
```

## Binding terminology row

| English | 中文 | First occurrence | Forbidden renderings | Note |
|---|---|---|---|---|
| gate | 门禁 | 门禁（gate） | 检查点 | Keep the project term. |

## Rules

- Edit only what the change requires.
- Add nothing and drop nothing.
- Use natural technical Chinese rather than a word-for-word gloss.
- Mirror the source structure, including the new warning blockquote.
- Preserve code spans, links, heading order, and the language switcher.
- Keep one physical line per paragraph and exactly one trailing newline.
````

After editing, run from `/workspace`:

```bash
node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs write docs/guide.md --target zh --root evals/files/briefing-style
node /workspace/.agents/skills/dsh-spec-translate-docs/scripts/translate-pair.mjs check docs/guide.md --target zh --root evals/files/briefing-style
```

Expected result: `write` exits 0, then `check` exits 0. Do not hand-edit `docs/guide.i18n.yaml`; `write` generates it.