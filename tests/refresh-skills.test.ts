/**
 * The installed-copy refresh: each skill under `skills/` replaces its copy under `.agents/skills/`.
 *
 * The repository keeps the installed copies tracked so every collaborator runs the same revision.
 * A case pins the contract: the copy is exact, other installed skills are untouched, the staging
 * directory is cleaned, a dry run changes nothing, and an empty `skills/` corpus fails instead of
 * passing silently.
 */

import assert from 'node:assert/strict'
import { chmodSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runScript } from './helpers/cli.ts'
import { makeWorkspace } from './helpers/workspace.ts'
import type { Workspace } from './helpers/workspace.ts'

const refresh = 'scripts/refresh-skills.ts'

/** Run the refresh script inside one workspace. */
function run(ws: Workspace, ...args: string[]) {
  return runScript(refresh, args, ws.root)
}

/** Run one case against a fresh workspace and dispose it afterwards. */
function withWorkspace(check: (ws: Workspace) => void): void {
  const ws = makeWorkspace()
  try {
    check(ws)
  } finally {
    ws.dispose()
  }
}

test('refresh mirrors every skill and leaves other installed skills alone', () => {
  withWorkspace((ws) => {
    ws.write('skills/alpha/SKILL.md', '# Alpha\n')
    ws.write('skills/alpha/script/run.mjs', 'console.log("alpha")\n')
    ws.write('skills/beta/SKILL.md', '# Beta\n')
    ws.write('.agents/skills/alpha/SKILL.md', '# Old alpha\n')
    ws.write('.agents/skills/alpha/stale.md', 'stale\n')
    ws.write('.agents/skills/other/SKILL.md', '# Other\n')

    const result = run(ws)
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('.agents/skills/alpha/SKILL.md'), '# Alpha\n')
    assert.equal(ws.read('.agents/skills/alpha/script/run.mjs'), 'console.log("alpha")\n')
    assert.equal(ws.exists('.agents/skills/alpha/stale.md'), false)
    assert.equal(ws.read('.agents/skills/beta/SKILL.md'), '# Beta\n')
    assert.equal(ws.read('.agents/skills/other/SKILL.md'), '# Other\n')
    assert.equal(ws.exists('.agents/.refresh'), false)
  })
})

test('refresh --dry-run changes nothing', () => {
  withWorkspace((ws) => {
    ws.write('skills/alpha/SKILL.md', '# Alpha\n')
    ws.write('.agents/skills/alpha/SKILL.md', '# Old alpha\n')
    const result = run(ws, '--dry-run')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /would/)
    assert.equal(ws.read('.agents/skills/alpha/SKILL.md'), '# Old alpha\n')
    assert.equal(ws.exists('.agents/.refresh'), false)
  })
})

test('refresh fails on an empty skills corpus', () => {
  withWorkspace((ws) => {
    const result = run(ws)
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /no skills/)
  })
})

test('refresh rejects an unknown option', () => {
  withWorkspace((ws) => {
    const result = run(ws, '--all')
    assert.equal(result.status, 2, result.output)
    assert.match(result.stderr, /unknown option/)
  })
})

test('refresh is idempotent', () => {
  withWorkspace((ws) => {
    ws.write('skills/alpha/SKILL.md', '# Alpha\n')
    assert.equal(run(ws).status, 0)
    const before = ws.read('.agents/skills/alpha/SKILL.md')
    const second = run(ws)
    assert.equal(second.status, 0, second.output)
    assert.equal(ws.read('.agents/skills/alpha/SKILL.md'), before)
    assert.equal(ws.exists('.agents/.refresh'), false)
  })
})

test(
  'refresh removes its staging after a failed copy',
  { skip: typeof process.getuid === 'function' && process.getuid() === 0 },
  () => {
    withWorkspace((ws) => {
      ws.write('skills/alpha/SKILL.md', '# Alpha\n')
      ws.write('skills/alpha/secret.md', 'secret\n')
      chmodSync(join(ws.root, 'skills/alpha/secret.md'), 0o000)
      try {
        const result = run(ws)
        assert.equal(result.status, 1, result.output)
        assert.equal(ws.exists('.agents/.refresh'), false)
      } finally {
        chmodSync(join(ws.root, 'skills/alpha/secret.md'), 0o644)
      }
    })
  },
)
