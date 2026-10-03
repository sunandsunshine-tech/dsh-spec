# Third-party notices

This repository is an extraction of [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It ships code and text carried over from that project, and it embeds a bundled Markdown parser built from npm packages. Both are third-party material, both are MIT-licensed, and this file carries the notices they require.

## DeepSeek Harness

Upstream: <https://github.com/deepseek-ai/deepseek-harness>, pinned at `dsh-v0.2.0-rc.2` (`639ed015397290b3745d163aafe02ffee4aa3f84`).

This repository is an extraction of that project: it rewrites the harness's development pattern into an installable skill set, so the engine files here are ports rather than new work. [`scripts/ports.json`](scripts/ports.json) is the registry — it names each ported file, its upstream path and sha, and how far it diverged (16 files: 13 adapted, 2 verbatim, 1 split) — and every ported file states the same fact in its own header, next to its `SPDX-License-Identifier: MIT` line. [`scripts/verify-port-provenance.ts`](scripts/verify-port-provenance.ts) holds the registry, those headers and the pinned baseline against each other.

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

## Vendored npm packages

`skills/dsh-spec-manager/scripts/vendor-mdast.mjs` bundles the Markdown parser its documentation gates import, so an adopting project needs no `node_modules` and no `package.json` of its own. The bundle inlines these packages, each of them MIT-licensed:

| Package | Version |
|---|---|
| `ccount` | 2.0.1 |
| `character-entities` | 2.0.2 |
| `decode-named-character-reference` | 1.3.0 |
| `devlop` | 1.1.0 |
| `escape-string-regexp` | 5.0.0 |
| `longest-streak` | 3.1.0 |
| `markdown-table` | 3.0.4 |
| `mdast-util-find-and-replace` | 3.0.2 |
| `mdast-util-from-markdown` | 2.0.3 |
| `mdast-util-gfm` | 3.1.0 |
| `mdast-util-gfm-autolink-literal` | 2.0.1 |
| `mdast-util-gfm-footnote` | 2.1.0 |
| `mdast-util-gfm-strikethrough` | 2.0.0 |
| `mdast-util-gfm-table` | 2.0.0 |
| `mdast-util-gfm-task-list-item` | 2.0.0 |
| `mdast-util-phrasing` | 4.1.0 |
| `mdast-util-to-markdown` | 2.1.2 |
| `mdast-util-to-string` | 4.0.0 |
| `micromark` | 4.0.2 |
| `micromark-core-commonmark` | 2.0.3 |
| `micromark-extension-gfm` | 3.0.0 |
| `micromark-extension-gfm-autolink-literal` | 2.1.0 |
| `micromark-extension-gfm-footnote` | 2.1.0 |
| `micromark-extension-gfm-strikethrough` | 2.1.0 |
| `micromark-extension-gfm-table` | 2.1.2 |
| `micromark-extension-gfm-tagfilter` | 2.0.0 |
| `micromark-extension-gfm-task-list-item` | 2.1.0 |
| `micromark-factory-destination` | 2.0.1 |
| `micromark-factory-label` | 2.0.1 |
| `micromark-factory-space` | 2.0.1 |
| `micromark-factory-title` | 2.0.1 |
| `micromark-factory-whitespace` | 2.0.1 |
| `micromark-util-character` | 2.1.1 |
| `micromark-util-chunked` | 2.0.1 |
| `micromark-util-classify-character` | 2.0.1 |
| `micromark-util-combine-extensions` | 2.0.1 |
| `micromark-util-decode-numeric-character-reference` | 2.0.2 |
| `micromark-util-decode-string` | 2.0.1 |
| `micromark-util-encode` | 2.0.1 |
| `micromark-util-html-tag-name` | 2.0.1 |
| `micromark-util-normalize-identifier` | 2.0.1 |
| `micromark-util-resolve-all` | 2.0.1 |
| `micromark-util-sanitize-uri` | 2.0.1 |
| `micromark-util-subtokenize` | 2.1.0 |
| `unist-util-is` | 6.0.1 |
| `unist-util-stringify-position` | 4.0.0 |
| `unist-util-visit` | 5.1.0 |
| `unist-util-visit-parents` | 6.0.2 |

The list is what the bundle records; regenerate it after a vendor update with:

```sh
grep -o 'node_modules/\.pnpm/[a-z0-9@._-]*' skills/dsh-spec-manager/scripts/vendor-mdast.mjs \
  | sed 's|node_modules/\.pnpm/||' | sort -u
```

## Scope

This file changes no third-party terms. Each package above keeps its own licence, and the upstream DeepSeek Harness notice above stays in force for every ported file; this repository's own licence is [`LICENSE`](LICENSE).
