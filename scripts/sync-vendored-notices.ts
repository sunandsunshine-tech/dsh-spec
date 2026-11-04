#!/usr/bin/env node
// Regenerate the vendored-packages table in THIRD_PARTY_NOTICES.md from the shipped bundles.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+
// input          --check to compare only
// output         one line: written, unchanged, or out of date
// exit           0 the table is current or was written · 1 --check found it stale · 2 usage error

import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { syncVendoredNotices } from './vendored-notices.ts'

const USAGE = `usage: sync-vendored-notices.ts [--check] [--help]

Regenerate the vendored-packages table in THIRD_PARTY_NOTICES.md from the packages the shipped
script bundles inline.

  --check       compare without writing; exit 1 when the table is stale
  --help, -h    print this and exit 0

exit: 0 the table is current or was written · 1 --check found it stale · 2 usage error`

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    return
  }
  const unknown = args.find((arg) => arg !== '--check')
  if (unknown !== undefined) {
    console.error('sync-vendored-notices.ts: unknown option: ' + unknown)
    console.error('run "sync-vendored-notices.ts --help" for usage')
    process.exitCode = 2
    return
  }
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const check = args.includes('--check')
  try {
    const result = syncVendoredNotices(repoRoot, { write: !check })
    if (check && result.changed) {
      console.error('sync-vendored-notices.ts: the vendored table is stale; run pnpm run notices:sync')
      process.exitCode = 1
      return
    }
    console.log(
      'sync-vendored-notices: ' +
        (result.changed ? 'wrote' : 'unchanged') +
        ' (' +
        result.packages.size +
        ' package(s))',
    )
  } catch (error) {
    console.error('sync-vendored-notices.ts: ' + (error instanceof Error ? error.message : String(error)))
    process.exitCode = 1
  }
}

main()
