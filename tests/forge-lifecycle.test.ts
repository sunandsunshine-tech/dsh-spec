/**
 * The skill's own draft lifecycle: the work draft, the review projection and landing.
 *
 * The CLI ships with the forging skill, so each case runs the bundled `scripts/forge.mjs` from the
 * work draft while one exists and from the landed skill afterwards, against a scratch workspace.
 * The cases pin the contract the skill's Review rule states: the work draft is the authority, the
 * review draft is a stamped projection, `review` marks changed sources stale, `review --accept`
 * clears them, and landing refuses a missing, stale or mismatched projection. Landing copies the
 * work draft, removes only the two skill-scoped directories, and leaves the shared directories
 * and every sibling draft in place.
 */

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runScript } from './helpers/cli.ts'
import { REPO_ROOT } from './helpers/fixtures.ts'
import { makeWorkspace } from './helpers/workspace.ts'
import type { Workspace } from './helpers/workspace.ts'

const workDraftCli = '.agents/dsh-spec-skill-forge/draft/dsh-spec-skill-forge/scripts/forge.mjs'
const landedCli = 'skills/dsh-spec-skill-forge/scripts/forge.mjs'
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

/** The sha256 prefix a stamp records for one source text. */
function sha(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 12)
}

interface Stamp {
  readonly source: string
  readonly sourceSha: string
  readonly stale: boolean
}

/** The forge-review metadata entry of one review file. */
function stampOf(ws: Workspace, rel: string): Stamp | undefined {
  const match = /^\s+forge-review: "source=(\S+) source_sha=([0-9a-f]+) stale=(true|false)"$/m.exec(ws.read(rel))
  return match ? { source: match[1], sourceSha: match[2], stale: match[3] === 'true' } : undefined
}

/** A review projection's frontmatter carrying the forge-review metadata entry. */
function stamp(source: string, text: string, stale = false): string {
  return `---\nmetadata:\n  forge-review: "source=${source} source_sha=${sha(text)} stale=${stale}"\n---\n`
}

/**
 * Seed one complete work draft and a matching review projection, plus a sibling draft, a record
 */
function seedDrafts(ws: Workspace): void {
  ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
  ws.write(`${FORGE}/draft/alpha/references/notes.md`, 'Notes.\n')
  ws.write(`${FORGE}/draft/alpha/scripts/forge.mjs`, 'console.log("alpha")\n')
  ws.write(`${FORGE}/draft/beta/SKILL.md`, '# Beta\n')
  ws.write(`${FORGE}/review/alpha/SKILL.md`, `${stamp('SKILL.md', '# Alpha\n')}# Alpha 审查\n`)
  ws.write(`${FORGE}/review/alpha/references/notes.md`, `${stamp('references/notes.md', 'Notes.\n')}笔记。\n`)
  ws.write(`${FORGE}/review/alpha/scripts/forge.mjs`, 'console.log("alpha")\n')
  ws.write(`${FORGE}/review/beta/SKILL.md`, `${stamp('SKILL.md', '# Beta\n')}# Beta 审查\n`)
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

test('a draft that already exists is a no-op without --from', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Kept\n')
    const result = forge(ws, 'draft', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read(`${FORGE}/draft/alpha/SKILL.md`), '# Kept\n')
    assert.match(result.stdout, /already exists/)
  })
})

test('a draft that already exists refuses --from', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Kept\n')
    const result = forge(ws, 'draft', 'alpha', '--from', 'landed/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /already exists/)
    assert.equal(ws.read(`${FORGE}/draft/alpha/SKILL.md`), '# Kept\n')
  })
})

test('review scaffolds a stamped projection and copies script without a stamp', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
    ws.write(`${FORGE}/draft/alpha/references/notes.md`, 'Notes.\n')
    ws.write(`${FORGE}/draft/alpha/scripts/forge.mjs`, 'console.log("alpha")\n')

    const result = forge(ws, 'review', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/SKILL.md`)?.source, 'SKILL.md')
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/references/notes.md`)?.source, 'references/notes.md')
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/SKILL.md`)?.stale, true)
    assert.match(ws.read(`${FORGE}/review/alpha/SKILL.md`), /^---\nmetadata:\n/)
    assert.match(ws.read(`${FORGE}/review/alpha/references/notes.md`), /^---\nmetadata:\n/)
    assert.equal(ws.read(`${FORGE}/review/alpha/scripts/forge.mjs`), 'console.log("alpha")\n')
    assert.match(result.stdout, /ok\s+translate — SKILL\.md, references\/notes\.md/)
  })
})

test('review keeps a translation and marks a changed source stale', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
    forge(ws, 'review', 'alpha')
    ws.write(`${FORGE}/review/alpha/SKILL.md`, `${stamp('SKILL.md', '# Alpha\n')}# Alpha 审查\n`)

    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha changed\n')
    const result = forge(ws, 'review', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/SKILL.md`)?.stale, true)
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/SKILL.md`)?.sourceSha, sha('# Alpha changed\n'))
    assert.equal(ws.read(`${FORGE}/review/alpha/SKILL.md`).endsWith('# Alpha 审查\n'), true)
    assert.match(result.stdout, /ok\s+translate — SKILL\.md/)
  })
})

test('review --accept clears stale and records the current source hash', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
    forge(ws, 'review', 'alpha')
    ws.write(`${FORGE}/review/alpha/SKILL.md`, `${stamp('SKILL.md', '# Alpha\n')}# Alpha 审查\n`)
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha changed\n')
    forge(ws, 'review', 'alpha')
    ws.write(`${FORGE}/review/alpha/SKILL.md`, `${stamp('SKILL.md', '# Alpha changed\n', true)}\n# Alpha 重译\n`)

    const result = forge(ws, 'review', 'alpha', '--accept')
    assert.equal(result.status, 0, result.output)
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/SKILL.md`)?.stale, false)
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/SKILL.md`)?.sourceSha, sha('# Alpha changed\n'))
  })
})

test('review --copy writes a stamped straight copy', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '---\nname: alpha\ndescription: Alpha.\n---\n# Alpha\n')
    const result = forge(ws, 'review', 'alpha', '--copy')
    assert.equal(result.status, 0, result.output)
    const review = ws.read(`${FORGE}/review/alpha/SKILL.md`)
    assert.match(review, /^---\n/)
    assert.match(review, /name: alpha/)
    assert.match(review, /forge-review: "source=SKILL\.md source_sha=[0-9a-f]{12} stale=false"/)
    assert.match(review, /\n# Alpha\n$/)
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/SKILL.md`)?.source, 'SKILL.md')
  })
})

test('review --copy preserves existing frontmatter metadata', () => {
  withWorkspace((ws) => {
    ws.write(
      `${FORGE}/draft/alpha/SKILL.md`,
      '---\nname: alpha\ndescription: Alpha.\nmetadata:\n  author: someone\n---\n\n# Alpha\n',
    )
    const result = forge(ws, 'review', 'alpha', '--copy')
    assert.equal(result.status, 0, result.output)
    const review = ws.read(`${FORGE}/review/alpha/SKILL.md`)
    assert.match(review, /author: someone/)
    assert.match(review, /forge-review: "source=SKILL\.md source_sha=[0-9a-f]{12} stale=false"/)
    assert.equal(stampOf(ws, `${FORGE}/review/alpha/SKILL.md`)?.source, 'SKILL.md')
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

test('review --accept refuses when there is no review draft', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
    const result = forge(ws, 'review', 'alpha', '--accept')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /review draft not found/)
  })
})

test('land copies the draft and removes only the two directories', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), '# Alpha\n')
    assert.equal(ws.read('skills/alpha/references/notes.md'), 'Notes.\n')
    assert.equal(ws.read('skills/alpha/scripts/forge.mjs'), 'console.log("alpha")\n')
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
    ws.write(`${FORGE}/draft/alpha/scripts/forge.mjs`, 'console.log("alpha")\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /no SKILL\.md/)
    assert.equal(ws.exists('skills/alpha'), false)
  })
})

test('land refuses a review draft whose script is stale', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write(`${FORGE}/review/alpha/scripts/forge.mjs`, 'console.log("stale")\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /out of date/)
    assert.equal(ws.exists('skills/alpha'), false)
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), true)
  })
})

test('land refuses a stale projection', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha changed\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /stale|source hash differs/)
    assert.equal(ws.exists('skills/alpha'), false)
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), true)
  })
})

test('land refuses a missing projection file', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.remove(`${FORGE}/review/alpha/references/notes.md`)
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /projection is missing references\/notes\.md/)
    assert.equal(ws.exists('skills/alpha'), false)
  })
})

test('land refuses a review file without a stamp', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write(`${FORGE}/review/alpha/SKILL.md`, '# 手工改写的审查稿\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /no forge-review stamp/)
    assert.equal(ws.exists('skills/alpha'), false)
  })
})

test('land refuses a review file that has no source', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write(`${FORGE}/review/alpha/orphan.md`, `${stamp('orphan.md', 'Orphan.\n')}\n孤儿。\n`)
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /no source in the work draft/)
    assert.equal(ws.exists('skills/alpha'), false)
  })
})

test('land --allow-stale lands a stale projection', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha changed\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha', '--allow-stale')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), '# Alpha changed\n')
  })
})

test('land replaces an existing landing directory exactly', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write('skills/alpha/SKILL.md', '---\nname: alpha\ndescription: An old skill.\n---\n# Old\n')
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
    assert.equal(forge(ws, 'review', 'alpha', '--copy', '--accept').status, 2)
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

test('review --json reports the translate list', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
    const result = forge(ws, 'review', 'alpha', '--json')
    assert.equal(result.status, 0, result.output)
    const summary = JSON.parse(result.stdout) as { results: { action: string; detail: string }[] }
    assert.equal(
      summary.results.some((item) => item.action === 'translate' && item.detail.includes('SKILL.md')),
      true,
    )
  })
})

test('land refuses a landing directory that is not a skill', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write('victim/precious.txt', 'keep\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'victim')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /not a skill/)
    assert.equal(ws.read('victim/precious.txt'), 'keep\n')
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), true)
  })
})

test('land refuses a landing directory for another skill', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write('skills/beta/SKILL.md', '---\nname: beta\ndescription: Another skill.\n---\n# Beta\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/beta')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /not alpha/)
    assert.equal(ws.read('skills/beta/SKILL.md'), '---\nname: beta\ndescription: Another skill.\n---\n# Beta\n')
  })
})

test('land replaces an empty landing directory', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.mkdir('skills/alpha')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), '# Alpha\n')
  })
})

test('--forge selects another forge directory', () => {
  withWorkspace((ws) => {
    const skill = '---\nname: alpha\ndescription: Alpha.\n---\n# Alpha\n'
    ws.write('landed/alpha/SKILL.md', skill)
    const created = forge(ws, 'draft', 'alpha', '--forge', 'custom', '--from', 'landed/alpha')
    assert.equal(created.status, 0, created.output)
    assert.equal(ws.exists('custom/draft/alpha/SKILL.md'), true)
    const landed = forge(ws, 'land', 'alpha', '--forge', 'custom', '--into', 'skills/alpha')
    assert.equal(landed.status, 0, landed.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), skill)
  })
})

test('--help prints the commands and exits 0', () => {
  withWorkspace((ws) => {
    const result = forge(ws, '--help')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /usage: forge\.mjs/)
    assert.match(result.stdout, /^  draft/m)
    assert.match(result.stdout, /^  review/m)
    assert.match(result.stdout, /^  land/m)
    assert.match(result.stdout, /--accept/)
    assert.match(result.stdout, /--copy/)
  })
})

test('draft refuses a missing --from directory', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'draft', 'alpha', '--from', 'absent')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /is not a directory/)
    assert.equal(ws.exists(`${FORGE}/draft/alpha`), false)
  })
})

test('review --remove with no review draft is a no-op', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/draft/alpha/SKILL.md`, '# Alpha\n')
    const result = forge(ws, 'review', 'alpha', '--remove')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /no review draft/)
  })
})

test('land --dry-run prints each action once', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha', '--dry-run')
    assert.equal(result.status, 0, result.output)
    assert.doesNotMatch(result.stdout, /would \w+ — would/)
  })
})

test('land refuses a landing path that is a file', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write('target-file', 'keep\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'target-file')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /not a directory/)
    assert.equal(ws.read('target-file'), 'keep\n')
  })
})

test('land refuses a skill directory whose SKILL.md names another skill', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write('skills/alpha/SKILL.md', '---\nname: beta\ndescription: Another skill.\n---\n# Beta\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /holds beta at alpha/)
    assert.equal(ws.read('skills/alpha/SKILL.md'), '---\nname: beta\ndescription: Another skill.\n---\n# Beta\n')
  })
})

test('land refuses a skill directory under another name', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write('skills/other/SKILL.md', '---\nname: alpha\ndescription: Alpha elsewhere.\n---\n# Alpha\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/other')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /holds alpha at other/)
    assert.equal(ws.exists('skills/other/SKILL.md'), true)
  })
})

test('land accepts a name line with a comment and CRLF', () => {
  withWorkspace((ws) => {
    seedDrafts(ws)
    ws.write('skills/alpha/SKILL.md', '---\r\nname: alpha # keep\r\ndescription: Old.\r\n---\r\n# Old\r\n')
    const result = forge(ws, 'land', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), '# Alpha\n')
  })
})
