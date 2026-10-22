/**
 * The skill's own draft lifecycle: the work draft, the review draft and landing.
 *
 * The CLI ships with the forging skill, so each case runs the bundled `script/forge.mjs` from the
 * work draft while one exists and from the landed skill afterwards, against a scratch workspace.
 * The cases pin the contract the skill's Drafts rule states: landing copies the work draft, refuses
 * a stale or incomplete draft, removes only the two skill-scoped directories and leaves the shared
 * directories and every sibling draft in place.
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runScript } from './helpers/cli.ts'
import { REPO_ROOT } from './helpers/fixtures.ts'
import { makeWorkspace } from './helpers/workspace.ts'
import type { Workspace } from './helpers/workspace.ts'

const workDraftCli = '.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/script/forge.mjs'
const landedCli = 'skills/dsh-spec-skill-forge/script/forge.mjs'
const cli = existsSync(join(REPO_ROOT, workDraftCli)) ? workDraftCli : landedCli

const FORGE = '.agents/dsh-spec-skill-forge'

/** Run the lifecycle CLI inside one workspace. */
function forge(ws: Workspace, ...args: string[]) {
  return runScript(cli, args, ws.root)
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

/** Seed one complete work draft, a matching review draft, and a sibling draft. */
function seedDrafts(ws: Workspace): void {
  ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
  ws.write(`${FORGE}/draft/alpha/references/notes.md`, 'Notes.\n')
  ws.write(`${FORGE}/draft/alpha/script/forge.mjs`, 'console.log("alpha")\n')
  ws.write(`${FORGE}/draft/beta/SKILL.md`, '# Beta\n')
  ws.write(`${FORGE}/review/alpha/SKILL.md`, '# Alpha review\n')
  ws.write(`${FORGE}/review/alpha/script/forge.mjs`, 'console.log("alpha")\n')
  ws.write(`${FORGE}/review/beta/SKILL.md`, '# Beta review\n')
  ws.write(`${FORGE}/record/record.md`, 'Decisions.\n')
}

test('a draft creates the work draft', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'draft', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), true)
    assert.match(result.stdout, /ok\s+create — /)
  })
})

test('a draft seeded from a skill copies its tree', () => {
  withWorkspace((ws) => {
    ws.write('landed/alpha/SKILL.md', '# Alpha\n')
    ws.write('landed/alpha/references/notes.md', 'Notes.\n')
    const result = forge(ws, 'draft', 'alpha', '--from', 'landed/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read(`${FORGE}/draft/alpha/SKILL.md`), '# Alpha\n')
    assert.equal(ws.read(`${FORGE}/draft/alpha/references/notes.md`), 'Notes.\n')
    assert.match(result.stdout, /ok\s+verify — /)
  })
})

test('a draft that already exists is a no-op', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Kept\n')
    const result = forge(ws, 'draft', 'alpha', '--from', 'elsewhere')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read(`${FORGE}/draft/alpha/SKILL.md`), '# Kept\n')
    assert.match(result.stdout, /already exists/)
  })
})

test('review mirrors the work script and leaves the review prose alone', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
    ws.write(`${FORGE}/draft/alpha/script/forge.mjs`, 'console.log("new")\n')
    ws.write(`${FORGE}/draft/alpha/script/check.mjs`, 'console.log("check")\n')
    ws.write(`${FORGE}/review/alpha/SKILL.md`, '# Alpha 审查\n')
    ws.write(`${FORGE}/review/alpha/script/forge.mjs`, 'console.log("old")\n')
    ws.write(`${FORGE}/review/alpha/script/stale.mjs`, 'console.log("stale")\n')

    const result = forge(ws, 'review', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read(`${FORGE}/review/alpha/SKILL.md`), '# Alpha 审查\n')
    assert.equal(ws.read(`${FORGE}/review/alpha/script/forge.mjs`), 'console.log("new")\n')
    assert.equal(ws.read(`${FORGE}/review/alpha/script/check.mjs`), 'console.log("check")\n')
    assert.equal(ws.exists(`${FORGE}/review/alpha/script/stale.mjs`), false)
  })
})

test('review removes the review draft when asked', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    const result = forge(ws, 'review', 'alpha', '--remove')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.exists(`${FORGE}/review/alpha`), false)
    assert.equal(ws.exists(`${FORGE}/review`), true)
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), true)
  })
})

test('review refuses when the work draft is missing', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'review', 'absent')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /work draft not found/)
    assert.equal(ws.exists(`${FORGE}/review/absent`), false)
  })
})

test('land copies the draft and removes only the two directories', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), '# Alpha\n')
    assert.equal(ws.read('skills/alpha/references/notes.md'), 'Notes.\n')
    assert.equal(ws.read('skills/alpha/script/forge.mjs'), 'console.log("alpha")\n')
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), false)
    assert.equal(ws.exists(`${FORGE}/review/alpha`), false)
    assert.equal(ws.exists(`${FORGE}/draft`), true)
    assert.equal(ws.exists(`${FORGE}/review`), true)
    assert.equal(ws.exists(`${FORGE}/draft/beta/SKILL.md`), true)
    assert.equal(ws.exists(`${FORGE}/review/beta/SKILL.md`), true)
    assert.equal(ws.exists(`${FORGE}/record/record.md`), true)
    assert.equal(ws.exists(`${FORGE}/staging`), false)
  })
})

test('land refuses a missing work draft', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'land', 'absent', '--into', 'skills/absent')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /work draft not found/)
    assert.equal(ws.exists('skills/absent'), false)
  })
})

test('land refuses a work draft without SKILL.md', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/script/forge.mjs`, 'console.log("alpha")\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /no SKILL\.md/)
    assert.equal(ws.exists('skills/alpha'), false)
  })
})

test('land refuses a review draft whose script is stale', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write(`${FORGE}/review/alpha/script/forge.mjs`, 'console.log("stale")\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /out of date/)
    assert.equal(ws.exists('skills/alpha'), false)
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), true)
  })
})

test('land replaces an existing landing directory exactly', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write('skills/alpha/SKILL.md', '# Old\n')
    ws.write('skills/alpha/stale.md', 'stale\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), '# Alpha\n')
    assert.equal(ws.exists('skills/alpha/stale.md'), false)
  })
})

test('land --dry-run changes nothing', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha', '--dry-run')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /would/)
    assert.equal(ws.exists('skills/alpha'), false)
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), true)
    assert.equal(ws.exists(`${FORGE}/review/alpha`), true)
    assert.equal(ws.exists(`${FORGE}/staging`), false)
  })
})

test('land keeps the forge directory outside its landing directory', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    const result = forge(ws, 'land', 'alpha', '--into', '.')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /outside the forge directory/)
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), true)
  })
})

test('usage errors exit 2', () => {
  withWorkspace((ws) => {
    assert.equal(forge(ws).status, 2)
    assert.equal(forge(ws, 'unknown').status, 2)
    assert.equal(forge(ws, 'draft', 'Bad_Name').status, 2)
    assert.equal(forge(ws, 'land', 'alpha').status, 2)
  })
})

test('--json reports the actions', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'draft', 'alpha', '--json')
    assert.equal(result.status, 0, result.output)
    const summary = JSON.parse(result.stdout) as { command: string; results: { action: string; ok: boolean }[] }
    assert.equal(summary.command, 'draft')
    assert.equal(
      summary.results.some((item) => item.action === 'create' && item.ok),
      true,
    )
  })
})
