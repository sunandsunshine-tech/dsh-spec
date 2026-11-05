# Third-party notices

This repository is an extraction of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness), and one skill adapts the [AGENTS.md](https://agents.md) format description. It ships code and text carried over from the harness project, adapts the AGENTS.md text, and embeds a bundled Markdown parser built from npm packages. All are third-party material; each item keeps its own license, recorded below and in the skill-root notices, and this file carries the notices they require.

## DeepSeek Harness

Upstream: <https://github.com/deepseek-ai/deepseek-harness>, pinned at `dsh-v0.2.2-rc.1` (`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`).

This repository is an extraction of that project: it rewrites the harness's development pattern into a skill set. Where a source file is carried over from upstream, it states its origin, its upstream path and its provenance in its own header, next to its `SPDX-License-Identifier: MIT` line.

A skill is text that an agent loads as instructions, so a header would become part of the skill. A skill whose text is carried over or adapted states the same facts from outside the loaded text: the `license` field in its frontmatter names a `THIRD_PARTY_NOTICES` file at the skill root, and that file carries the origin, the upstream path and revision, the relation, and the notices an installed copy needs. The adapted `agent-experience` skill text declares it this way at `skills/dsh-spec-agent-experience/`, the adapted notes text declares it the same way at `skills/dsh-spec-agent-notes/`, the adapted prose standard declares it at `skills/dsh-spec-prose-standard/`, the adapted find-simplifications skill declares it at `skills/dsh-spec-find-simplifications/`, the adapted pre-push-checks skill declares it at `skills/dsh-spec-pre-push-checks/`, the adapted code-review skill declares it at `skills/dsh-spec-code-review/`, the adapted error-handling skill declares it at `skills/dsh-spec-error-handling/`, the adapted merging-stacked-prs skill declares it at `skills/dsh-spec-merging-stacked-prs/`, the extracted translation skill declares it at `skills/dsh-spec-translate-docs/`, and the adapted PR-description skill declares it at `skills/dsh-spec-pr-description/`. The skill forged from the AGENTS.md format description declares it at `skills/dsh-spec-agents-md/`. `skills/dsh-spec-skill-forge/` carries a skill-root `THIRD_PARTY_NOTICES` for the npm packages its bundled scripts include.

The upstream licence, reproduced in full:

```
MIT License

Copyright (c) 2026 DeepSeek

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## AGENTS.md format

Upstream: <https://agents.md>, repository <https://github.com/agentsmd/agents.md>, read at `main` (`d001185d792eb6402a58e4cbef1c228b309ec25d`) on 2026-10-30.

The `dsh-spec-agents-md` skill adapts the format description published there: the format's statements about purpose, placement, precedence and content classes are restated, and the pointer, inline-form, scope, update and extraction-home rules are derived from that purpose. Its skill-root `THIRD_PARTY_NOTICES` at `skills/dsh-spec-agents-md/` carries the adapted page path and the relation for an installed copy. AGENTS.md is stewarded by the Agentic AI Foundation under the Linux Foundation.

The upstream licence, reproduced in full:

```
MIT License

Copyright (c) 2025 OpenAI

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Vendored npm packages

The dependency submission reads this table. It lists every npm package the shipped script bundles inline, with the version the bundle contains; each package's licence is recorded in the skill-root `THIRD_PARTY_NOTICES` files: the skill-forge notice carries the full texts for its bundled packages, and the translate-docs notice carries the MIT text and copyright lines for its bundled packages. The table is generated from the shipped bundles by `pnpm run notices:sync`; do not edit its rows by hand.

<!-- vendored-packages:start -->
| Package | Version |
|---|---|
| `ccount` | 2.0.1 |
| `character-entities` | 2.0.2 |
| `decode-named-character-reference` | 1.3.0 |
| `entities` | 8.1.0 |
| `escape-string-regexp` | 5.0.0 |
| `linkify-it` | 6.1.0 |
| `markdown-it` | 15.0.3 |
| `mdast-util-find-and-replace` | 3.0.4 |
| `mdast-util-from-markdown` | 2.0.3 |
| `mdast-util-gfm` | 3.1.0 |
| `mdast-util-gfm-autolink-literal` | 2.0.1 |
| `mdast-util-gfm-footnote` | 2.1.0 |
| `mdast-util-gfm-strikethrough` | 2.0.1 |
| `mdast-util-gfm-table` | 2.0.0 |
| `mdast-util-gfm-task-list-item` | 2.0.0 |
| `mdast-util-to-string` | 4.0.0 |
| `mdurl` | 2.1.0 |
| `micromark` | 4.0.3 |
| `micromark-core-commonmark` | 2.0.4 |
| `micromark-extension-gfm` | 3.0.0 |
| `micromark-extension-gfm-autolink-literal` | 2.1.0 |
| `micromark-extension-gfm-footnote` | 2.1.0 |
| `micromark-extension-gfm-strikethrough` | 2.1.0 |
| `micromark-extension-gfm-table` | 2.1.2 |
| `micromark-extension-gfm-task-list-item` | 2.1.0 |
| `micromark-factory-destination` | 2.0.1 |
| `micromark-factory-label` | 2.0.1 |
| `micromark-factory-space` | 2.1.0 |
| `micromark-factory-title` | 2.0.1 |
| `micromark-factory-whitespace` | 2.0.1 |
| `micromark-util-character` | 2.1.1 |
| `micromark-util-chunked` | 2.0.1 |
| `micromark-util-classify-character` | 2.0.1 |
| `micromark-util-combine-extensions` | 2.0.1 |
| `micromark-util-decode-numeric-character-reference` | 2.0.2 |
| `micromark-util-decode-string` | 2.0.1 |
| `micromark-util-edit-map` | 1.0.0 |
| `micromark-util-html-tag-name` | 2.0.1 |
| `micromark-util-normalize-identifier` | 2.0.1 |
| `micromark-util-resolve-all` | 2.0.1 |
| `micromark-util-subtokenize` | 2.1.0 |
| `parse5` | 8.0.1 |
| `punycode.js` | 2.3.1 |
| `uc.micro` | 3.0.0 |
| `unist-util-is` | 6.0.1 |
| `unist-util-stringify-position` | 4.0.0 |
| `unist-util-visit-parents` | 6.1.0 |
| `yaml` | 2.9.1 |
<!-- vendored-packages:end -->

## Scope

This file changes no third-party terms. Each package above keeps its own licence, and the upstream DeepSeek Harness and AGENTS.md notices above stay in force for every ported or adapted file; this repository's own licence is [`LICENSE`](LICENSE).
