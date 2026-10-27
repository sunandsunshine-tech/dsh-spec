/**
 * The skill's work-directory, declared-review-draft and simple-copy publish lifecycle.
 *
 * publish is a plain overwrite: copy the work directory, excluding the declared review drafts,
 * then remove the work directory. The gate and review are separate read-only checks; publish
 * does not run them and keeps no backup. The VCS is the rollback.
 */

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { runScript } from './helpers/cli.ts'
import { REPO_ROOT } from './helpers/fixtures.ts'
import { makeWorkspace } from './helpers/workspace.ts'
import type { Workspace } from './helpers/workspace.ts'

const workCli = '.agents/dsh-spec-skill-forge/dsh-spec-skill-forge/scripts/forge.mjs'
const landedCli = 'skills/dsh-spec-skill-forge/scripts/forge.mjs'
const cli = existsSync(join(REPO_ROOT, workCli)) ? workCli : landedCli

const FORGE = '.agents/dsh-spec-skill-forge'

const skillText = (name: string): string =>
  `---\nname: ${name}\ndescription: A ${name} skill.\n---\n\n# ${name}\n\nSee \`references/notes.md\` and run \`scripts/run.mjs\`.\n`

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

/** One complete work directory: SKILL.md, a reference and a script. */
function seedWork(ws: Workspace, name = 'alpha'): void {
  ws.write(`${FORGE}/${name}/SKILL.md`, skillText(name))
  ws.write(`${FORGE}/${name}/references/notes.md`, '# Notes\n')
  ws.write(`${FORGE}/${name}/scripts/run.mjs`, 'console.log("alpha")\n')
}

/** Write a review draft beside one source with a declared suffix. */
function translate(ws: Workspace, name: string, source: string, text: string, suffix = '.zh.md'): void {
  ws.write(`${FORGE}/${name}/${source.replace(/\.md$/, suffix)}`, text)
}

test('draft creates the work directory', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'draft', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.exists(`${FORGE}/alpha`), true)
    assert.match(result.stdout, /ok {3}create/)
  })
})

test('draft reports an existing work directory without --from', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'draft', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /already exists/)
    assert.equal(ws.read(`${FORGE}/alpha/SKILL.md`), skillText('alpha'))
  })
})

test('draft --from copies the skill tree', () => {
  withWorkspace((ws) => {
    ws.write('sources/alpha/SKILL.md', skillText('alpha'))
    ws.write('sources/alpha/references/notes.md', '# Notes\n')
    const result = forge(ws, 'draft', 'alpha', '--from', 'sources/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read(`${FORGE}/alpha/references/notes.md`), '# Notes\n')
  })
})

test('draft --from refuses an existing work directory', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write('sources/alpha/SKILL.md', skillText('alpha'))
    const result = forge(ws, 'draft', 'alpha', '--from', 'sources/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /already exists/)
  })
})

test('draft --from requires a SKILL.md', () => {
  withWorkspace((ws) => {
    ws.write('sources/alpha/notes.md', '# Notes\n')
    const result = forge(ws, 'draft', 'alpha', '--from', 'sources/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /has no SKILL\.md/)
  })
})

test('draft refuses an existing work path that is a file', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/alpha`, 'not a directory\n')
    const result = forge(ws, 'draft', 'alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /not a directory/)
  })
})

test('draft --dry-run changes nothing', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'draft', 'alpha', '--dry-run')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.exists(`${FORGE}/alpha`), false)
    assert.match(result.stdout, /would/)
  })
})

test('draft --json summarizes the actions', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'draft', 'alpha', '--json')
    assert.equal(result.status, 0, result.output)
    const summary = JSON.parse(result.stdout) as { command: string; results: { ok: boolean }[] }
    assert.equal(summary.command, 'draft')
    assert.equal(summary.results[0]?.ok, true)
  })
})

test('--forge selects another forge directory', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'draft', 'alpha', '--forge', 'custom/forge')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.exists('custom/forge/alpha'), true)
  })
})

test('pair with no declared drafts succeeds', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'pair', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /no review drafts or possible companions/)
  })
})

test('pair lists possible review drafts without declarations', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    translate(ws, 'alpha', 'SKILL.md', '# Alpha 译文\n')
    ws.write(`${FORGE}/alpha/SKILL.i18n.yaml`, 'en: 0\nzh: 0\n')
    const result = forge(ws, 'pair', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /SKILL\.zh\.md → SKILL\.md \(undeclared\)/)
    assert.match(result.stdout, /SKILL\.i18n\.yaml → SKILL\.md \(undeclared\)/)
  })
})

test('pair reports undeclared candidates beside declared pairs', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    translate(ws, 'alpha', 'SKILL.md', '# Alpha 译文\n')
    ws.write(`${FORGE}/alpha/SKILL.i18n.yaml`, 'en: 0\nzh: 0\n')
    const result = forge(ws, 'pair', 'alpha', '--companion', '.zh.md')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /pair — SKILL\.zh\.md → SKILL\.md/)
    assert.match(result.stdout, /candidate — SKILL\.i18n\.yaml → SKILL\.md \(undeclared\)/)
  })
})

test('pair candidate discovery is heuristic', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write(`${FORGE}/alpha/SKILL.backup`, '# backup\n')
    ws.write(`${FORGE}/alpha/SKILL.notes.md`, '# notes\n')
    const result = forge(ws, 'pair', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /SKILL\.backup → SKILL\.md \(undeclared\)/)
    assert.match(result.stdout, /SKILL\.notes\.md → SKILL\.md \(undeclared\)/)
  })
})

test('pair candidate discovery uses the shortest dotted suffix', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write(`${FORGE}/alpha/SKILL.i18n.md`, '# record\n')
    ws.write(`${FORGE}/alpha/SKILL.i18n.yaml`, 'en: 0\nzh: 0\n')
    const result = forge(ws, 'pair', 'alpha')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /SKILL\.i18n\.yaml → SKILL\.i18n\.md \(undeclared\)/)
  })
})

test('pair reports declared pairs and writes no records', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    translate(ws, 'alpha', 'SKILL.md', '# Alpha 译文\n')
    const result = forge(ws, 'pair', 'alpha', '--companion', '.zh.md')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /SKILL\.zh\.md → SKILL\.md/)
    assert.equal(ws.exists(`${FORGE}/alpha/SKILL.i18n.yaml`), false)
  })
})

test('pair does not require a draft for every source', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    translate(ws, 'alpha', 'SKILL.md', '# Alpha 译文\n')
    const result = forge(ws, 'pair', 'alpha', '--companion', '.zh.md')
    assert.equal(result.status, 0, result.output)
    assert.doesNotMatch(result.stdout, /references\/notes\.zh\.md/)
  })
})

test('pair pairs several declared companions with one source', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    translate(ws, 'alpha', 'SKILL.md', '# Alpha 译文\n', '.zh.md')
    translate(ws, 'alpha', 'SKILL.md', '# Alpha français\n', '.fr.md')
    ws.write(`${FORGE}/alpha/SKILL.i18n.yaml`, 'en: 0\nzh: 0\n')
    const result = forge(
      ws,
      'pair',
      'alpha',
      '--companion',
      '.zh.md',
      '--companion',
      '.fr.md',
      '--companion',
      '.i18n.yaml',
    )
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /SKILL\.zh\.md → SKILL\.md/)
    assert.match(result.stdout, /SKILL\.fr\.md → SKILL\.md/)
    assert.match(result.stdout, /SKILL\.i18n\.yaml → SKILL\.md/)
  })
})

test('pair refuses a declared draft without a source', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write(`${FORGE}/alpha/references/ghost.zh.md`, '# 无源\n')
    const result = forge(ws, 'pair', 'alpha', '--companion', '.zh.md')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /declared review drafts without a source: references\/ghost\.zh\.md/)
  })
})

test('pair resolves overlapping suffixes by the longest declaration', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write(`${FORGE}/alpha/SKILL.zh.review.md`, '# Alpha review\n')
    let result = forge(ws, 'pair', 'alpha', '--companion', '.review.md', '--companion', '.zh.review.md')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /SKILL\.zh\.review\.md → SKILL\.md/)
    result = forge(ws, 'pair', 'alpha', '--companion', '.zh.review.md', '--companion', '.review.md')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /SKILL\.zh\.review\.md → SKILL\.md/)
  })
})

test('pair accepts a declared pairing record as a companion', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write(`${FORGE}/alpha/SKILL.i18n.yaml`, 'en: 0\nzh: 0\n')
    const result = forge(ws, 'pair', 'alpha', '--companion', '.i18n.yaml')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /SKILL\.i18n\.yaml → SKILL\.md/)
  })
})

test('pair reports a declaration that matches no draft', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'pair', 'alpha', '--companion', '.zh.md')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /declared suffixes matched no review drafts: \.zh\.md/)
  })
})

test('pair refuses invalid companion suffixes', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    for (const suffix of ['.md', '.', 'zh.md', '.zh/']) {
      const result = forge(ws, 'pair', 'alpha', '--companion', suffix)
      assert.equal(result.status, 2, result.output)
      assert.match(result.stderr, /--companion must be a suffix such as \.zh\.md/)
    }
  })
})

test('review is no longer a command', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'review', 'alpha')
    assert.equal(result.status, 2, result.output)
    assert.match(result.stderr, /unknown command: review/)
  })
})

test('pair refuses --check', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'pair', 'alpha', '--check')
    assert.equal(result.status, 2, result.output)
    assert.match(result.stderr, /unknown option: --check/)
  })
})

test('pair --json summarizes declared pairs without writing', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    translate(ws, 'alpha', 'SKILL.md', '# Alpha 译文\n')
    const result = forge(ws, 'pair', 'alpha', '--companion', '.zh.md', '--json')
    assert.equal(result.status, 0, result.output)
    const summary = JSON.parse(result.stdout) as { command: string; results: { action: string }[] }
    assert.equal(summary.command, 'pair')
    assert.deepEqual(
      summary.results.map((row) => row.action),
      ['pair'],
    )
    assert.equal(ws.exists(`${FORGE}/alpha/SKILL.i18n.yaml`), false)
  })
})

test('pair --dry-run changes nothing', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    translate(ws, 'alpha', 'SKILL.md', '# Alpha 译文\n')
    const result = forge(ws, 'pair', 'alpha', '--companion', '.zh.md', '--dry-run')
    assert.equal(result.status, 0, result.output)
    assert.match(result.stdout, /would pair — SKILL\.zh\.md → SKILL\.md/)
  })
})

test('publish copies the work directory and removes it', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), skillText('alpha'))
    assert.equal(ws.exists('skills/alpha/references/notes.md'), true)
    assert.equal(ws.exists(`${FORGE}/alpha`), false)
  })
})

test('publish excludes declared companions from the target', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    translate(ws, 'alpha', 'SKILL.md', '# Alpha 译文\n')
    ws.write(`${FORGE}/alpha/SKILL.i18n.yaml`, 'en: 0\nzh: 0\n')
    assert.equal(forge(ws, 'pair', 'alpha', '--companion', '.zh.md', '--companion', '.i18n.yaml').status, 0)
    const result = forge(
      ws,
      'publish',
      'alpha',
      '--into',
      'skills/alpha',
      '--companion',
      '.zh.md',
      '--companion',
      '.i18n.yaml',
    )
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.exists('skills/alpha/SKILL.zh.md'), false)
    assert.equal(ws.exists('skills/alpha/SKILL.i18n.yaml'), false)
    assert.equal(ws.exists('skills/alpha/SKILL.md'), true)
  })
})

test('publish copies a file whose suffix is not declared', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write(`${FORGE}/alpha/references/extra.fr.md`, '# Extra\n')
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/alpha', '--companion', '.zh.md')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.exists('skills/alpha/references/extra.fr.md'), true)
  })
})

test('publish refuses a declared draft without a source', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write(`${FORGE}/alpha/references/ghost.zh.md`, '# 无源\n')
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/alpha', '--companion', '.zh.md')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /declared review drafts without a source/)
    assert.equal(ws.exists('skills/alpha'), false)
    assert.equal(ws.exists(`${FORGE}/alpha/references/ghost.zh.md`), true)
  })
})

test('publish overwrites an existing target', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    ws.write('skills/alpha/SKILL.md', 'old\n')
    ws.write('skills/alpha/keep.txt', 'keep\n')
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.read('skills/alpha/SKILL.md'), skillText('alpha'))
    assert.equal(ws.exists('skills/alpha/keep.txt'), false)
    assert.equal(ws.exists(`${FORGE}/alpha`), false)
  })
})

test('publish refuses a work directory whose declared name differs', () => {
  withWorkspace((ws) => {
    ws.write(`${FORGE}/alpha/SKILL.md`, skillText('other'))
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/alpha')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /declares other/)
  })
})

test('publish refuses a landing directory under another name', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/beta')
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /not alpha/)
  })
})

test('publish refuses a landing path inside the forge or work directory', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'publish', 'alpha', '--into', `${FORGE}/landing/alpha`)
    assert.equal(result.status, 1, result.output)
    assert.match(result.stderr, /outside the forge and work directories/)
  })
})

test('publish --dry-run changes nothing', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/alpha', '--dry-run')
    assert.equal(result.status, 0, result.output)
    assert.equal(ws.exists('skills/alpha'), false)
    assert.equal(ws.exists(`${FORGE}/alpha`), true)
    assert.match(result.stdout, /would/)
  })
})

test('publish --json summarizes the actions', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/alpha', '--json')
    assert.equal(result.status, 0, result.output)
    const summary = JSON.parse(result.stdout) as { command: string; results: { ok: boolean }[] }
    assert.equal(summary.command, 'publish')
    assert.equal(
      summary.results.every((item) => item.ok),
      true,
    )
  })
})

test('publish no longer takes --force', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    const result = forge(ws, 'publish', 'alpha', '--into', 'skills/alpha', '--force')
    assert.equal(result.status, 2, result.output)
    assert.match(result.output, /unknown option/)
  })
})

test('publish requires --into, and empty option values are refused', () => {
  withWorkspace((ws) => {
    seedWork(ws)
    assert.equal(forge(ws, 'publish', 'alpha').status, 2)
    assert.equal(forge(ws, 'draft', 'alpha', '--from=').status, 2)
    assert.equal(forge(ws, 'draft', 'alpha', '--forge=').status, 2)
  })
})

test('a reserved skill name is refused', () => {
  withWorkspace((ws) => {
    const result = forge(ws, 'draft', 'record')
    assert.equal(result.status, 2, result.output)
    assert.match(result.stderr, /reserved/)
  })
})
