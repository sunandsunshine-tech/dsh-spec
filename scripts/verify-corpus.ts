#!/usr/bin/env node
// Check the repository's own corpus: every skill entry, the notes tree and its archive, the
// maintained translation pairs, and the vendored-notices submission.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+; Git for the notes archive baseline
// input          the working directory as the repository root; NOTES_BASE_REF or --base-ref names
//                the archive baseline (default: HEAD)
// output         one line per gate on stdout; failures print the failing output
// exit           0 every gate passed · 1 a gate failed · 2 usage error

import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const USAGE = `usage: verify-corpus.ts [--base-ref=<ref>] [--help]

Check the repository's own corpus: every skill entry, the notes tree and its archive, the
maintained translation pairs and the vendored-notices submission. Run from the repository root.

  --base-ref=<ref>  trusted pre-change commit for the notes archive baseline
                    (default: HEAD; CI passes the base commit)
  --help, -h        print this and exit 0

exit: 0 every gate passed · 1 a gate failed · 2 usage error`

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    return
  }
  let baseRef = process.env.NOTES_BASE_REF ?? ''
  // A first push has no before-commit; GitHub reports zeros. There is no prior baseline to trust yet.
  if (/^0+$/.test(baseRef)) baseRef = ''
  const unknown: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--base-ref') {
      const value = args[index + 1]
      if (value === undefined || value.startsWith('-')) {
        console.error('verify-corpus.ts: --base-ref needs a value')
        console.error('run "verify-corpus.ts --help" for usage')
        process.exitCode = 2
        return
      }
      baseRef = value
      index += 1
    } else if (arg.startsWith('--base-ref=')) {
      baseRef = arg.slice('--base-ref='.length)
      if (baseRef === '' || baseRef.startsWith('-')) {
        console.error('verify-corpus.ts: --base-ref needs a non-empty value')
        console.error('run "verify-corpus.ts --help" for usage')
        process.exitCode = 2
        return
      }
    } else {
      unknown.push(arg)
    }
  }
  if (unknown.length > 0) {
    console.error('verify-corpus.ts: unknown option: ' + unknown.join(' '))
    console.error('run "verify-corpus.ts --help" for usage')
    process.exitCode = 2
    return
  }

  const repoRoot = process.cwd()
  const node = process.execPath
  const skipped = [
    '--skip',
    '.agents/dsh-spec-agent-notes/archived/**',
    '--skip',
    'submodules/**',
    // Node's glob does not descend into hidden segments for the broad submodule pattern;
    // exclude the nested .agents tree explicitly so a populated submodule cannot reach the pair gate.
    '--skip',
    'submodules/**/.*/**',
  ]
  let failed = false

  /** Run one gate and record its outcome; its output is printed only when it fails. */
  function gate(label, args) {
    const result = spawnSync(node, args, { cwd: repoRoot, encoding: 'utf8' })
    if (result.status === 0) {
      process.stdout.write('ok   ' + label + '\n')
      return
    }
    failed = true
    process.stdout.write('FAIL ' + label + '\n')
    for (const stream of [result.stdout, result.stderr]) {
      if (stream) process.stdout.write(stream)
    }
  }

  const skills = readdirSync(join(repoRoot, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  if (skills.length === 0) {
    console.error('verify-corpus.ts: no skills under skills/; nothing to check')
    process.exitCode = 1
    return
  }
  for (const skill of skills) {
    gate('skill ' + skill, [
      'skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs',
      'skills/' + skill,
      '--description-max',
      '500',
    ])
  }

  const notesCheck = spawnSync(
    node,
    [
      'skills/dsh-spec-agent-notes/scripts/notes.mjs',
      'check',
      '--companion',
      '.zh.md',
      '--companion',
      '.i18n.yaml',
      '--json',
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  )
  let notesSummary: { notes?: number } | undefined
  try {
    notesSummary = JSON.parse(notesCheck.stdout ?? '') as { notes?: number }
  } catch {
    notesSummary = undefined
  }
  if (notesCheck.status !== 0 || notesSummary === undefined || (notesSummary.notes ?? 0) === 0) {
    failed = true
    process.stdout.write('FAIL notes tree\n' + (notesCheck.stdout ?? '') + (notesCheck.stderr ?? ''))
  } else {
    process.stdout.write('ok   notes tree (' + notesSummary.notes + ' note(s))\n')
  }
  // Archive verification does not consult companions; sealing (--write) still declares them.
  gate('notes archive', [
    'skills/dsh-spec-agent-notes/scripts/notes.mjs',
    'archive',
    ...(baseRef === '' ? [] : ['--base-ref', baseRef]),
  ])

  const listed = spawnSync(node, ['skills/dsh-spec-translate-docs/scripts/translate-pair.mjs', 'list', ...skipped], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
  const pairs = (listed.stdout ?? '')
    .trim()
    .split('\n')
    .filter((line) => /^(ok|out-of-sync|missing)\s/.test(line))
  if (listed.status !== 0 || pairs.length === 0) {
    failed = true
    process.stdout.write('FAIL translation pairs\n' + (listed.stdout ?? '') + (listed.stderr ?? ''))
  } else {
    gate('translation pairs (' + pairs.length + ')', [
      'skills/dsh-spec-translate-docs/scripts/translate-pair.mjs',
      'check',
      ...skipped,
    ])
  }

  gate('vendored notices', ['scripts/submit-vendored.ts', '--dry-run'])

  if (failed) {
    process.exitCode = 1
    return
  }
  process.stdout.write('verify-corpus: ' + skills.length + ' skill entry points and the maintained corpus passed\n')
  process.exitCode = 0
}

main()
