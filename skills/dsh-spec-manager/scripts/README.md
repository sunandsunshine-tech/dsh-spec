---
description: "The dependency-free gates this package runs, and the vendored bundles they import."
kind: "module-contract-group"
---
# Vendored dependencies

## Summary

The gates this collection ships, and the two bundles they import so an adopting project needs no `node_modules` and no `package.json` of its own. Read this page before changing a gate, or before the vendored Markdown parser is regenerated from a new pinned version.

Generated artifacts, not hand-authored source. `vendor-mdast.mjs` bundles the Markdown parsing dependencies the documentation gates import, so a consuming project needs no `node_modules` and no `package.json` of its own.

## Modules

| Bundle | Contents | Consumed by |
|---|---|---|
| `vendor-mdast.mjs` | `mdast-util-from-markdown@2.0.3`, `mdast-util-gfm@3.1.0`, `micromark-extension-gfm@3.0.0` | `scripts/markdown.ts`, `scripts/translation-pairing.ts` |

Regenerate after changing a pinned version:

```sh
mkdir -p /tmp/vendor-build && cd /tmp/vendor-build
pnpm add --ignore-workspace-root-check --allow-build=esbuild \
  mdast-util-from-markdown@2.0.3 mdast-util-gfm@3.1.0 micromark-extension-gfm@3.0.0 esbuild
printf "export * from 'mdast-util-from-markdown'\nexport * from 'mdast-util-gfm'\nexport * from 'micromark-extension-gfm'\n" > entry.ts
./node_modules/.bin/esbuild entry.ts --bundle --platform=node --format=esm --target=node22 \
  --outfile=vendor-mdast.mjs
cp vendor-mdast.mjs <manager>/scripts/vendor-mdast.mjs
```

The bundle is ESM for Node 22 and later. Its exports are the union of the three packages' named exports; the gates import `fromMarkdown`, `gfmFromMarkdown`, and `gfm` from it.
