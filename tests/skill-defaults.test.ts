/**
 * The shared default contract.
 *
 * Concrete defaults stay with the data or behavior that uses them. Each skill that selects a
 * behavior when a valid invocation leaves the choice unspecified and existing project instructions
 * are silent carries one shared paragraph; the forge carries the corresponding future-skill
 * acceptance clause.
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'

const SKILLS = join(REPO_ROOT, 'skills')

const DEFAULT_CONTRACT =
  'A default is the value or strategy this skill declares at its use site. It applies when the current request and existing project instructions leave that choice open. A user turn or explicit parameter supplies a one-off value. Existing project instructions supply a persistent override and are read without being modified or copied. Missing project instructions are valid, so do not ask the user to choose a default or create or modify an instruction file merely to select one.'

const DEFAULT_BEARING = [
  'dsh-spec-agent-notes',
  'dsh-spec-merging-stacked-prs',
  'dsh-spec-pr-description',
  'dsh-spec-prose-standard',
  'dsh-spec-skill-forge',
  'dsh-spec-translate-docs',
]

const USE_SITE_PINS = [
  {
    skill: 'dsh-spec-agent-notes',
    file: 'SKILL.md',
    text: 'The root defaults to `.agents/dsh-spec-agent-notes/`',
  },
  {
    skill: 'dsh-spec-translate-docs',
    file: 'references/pairing-contract.md',
    text: 'The default target is `zh` (display name `中文`).',
  },
  {
    skill: 'dsh-spec-pr-description',
    file: 'SKILL.md',
    text: 'The default structure uses four second-level headings in this order',
  },
  {
    skill: 'dsh-spec-prose-standard',
    file: 'SKILL.md',
    text: 'default to `automatic`',
  },
  {
    skill: 'dsh-spec-merging-stacked-prs',
    file: 'SKILL.md',
    text: 'When neither prescribes one, use `merge`.',
  },
  {
    skill: 'dsh-spec-skill-forge',
    file: 'SKILL.md',
    text: "The additional trigger language defaults to the adopter's review language",
  },
]

const CONCRETE_VALUE_MARKERS: Record<string, string> = {
  'dsh-spec-agent-notes': '.agents/dsh-spec-agent-notes',
  'dsh-spec-merging-stacked-prs': '`merge`',
  'dsh-spec-pr-description': '## Motivation',
  'dsh-spec-prose-standard': '`automatic`',
  'dsh-spec-skill-forge': 'additional trigger language',
  'dsh-spec-translate-docs': '`zh`',
}

function read(skill: string, file = 'SKILL.md'): string {
  return readFileSync(join(SKILLS, skill, file), 'utf8')
}

function defaultsSection(body: string): string {
  const marker = '## Defaults\n\n'
  const start = body.indexOf(marker)
  assert.notEqual(start, -1, 'missing ## Defaults')
  const contentStart = start + marker.length
  const next = body.indexOf('\n## ', contentStart)
  const section = (next === -1 ? body.slice(contentStart) : body.slice(contentStart, next)).trim()
  return section.replace(/\s+/g, ' ')
}

test('each default-bearing skill states one shared default contract', () => {
  const discovered = readdirSync(SKILLS, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => read(name).split('\n').includes('## Defaults'))
    .sort()

  assert.deepEqual(discovered, DEFAULT_BEARING)

  for (const skill of DEFAULT_BEARING) {
    const body = read(skill)
    assert.equal(body.split('\n').filter((line) => line === '## Defaults').length, 1, skill)
    const section = defaultsSection(body)
    assert.equal(section, DEFAULT_CONTRACT, skill)
    assert.doesNotMatch(section, /dsh-spec-agents-md/, skill)
    assert.ok(!section.includes(CONCRETE_VALUE_MARKERS[skill] as string), skill)
  }
})

test('concrete defaults remain at their own use sites', () => {
  for (const pin of USE_SITE_PINS) {
    const body = read(pin.skill, pin.file)
    assert.equal(body.split(pin.text).length - 1, 1, `${pin.skill}/${pin.file}: ${pin.text}`)
  }
})

test('the forge accepts future defaults without project instructions', () => {
  const forge = read('dsh-spec-skill-forge')
  assert.match(
    forge,
    /a forged skill that declares a default applies it when the current request and existing project instructions leave that choice open, without asking for or creating or modifying project instructions merely to select it/,
  )
})
