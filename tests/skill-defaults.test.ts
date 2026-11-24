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
  "Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default."

const DEFAULT_BEARING = [
  'dsh-spec-agent-notes',
  'dsh-spec-browser-gif-evidence',
  'dsh-spec-client-ui-ux',
  'dsh-spec-error-handling',
  'dsh-spec-merging-stacked-prs',
  'dsh-spec-pr-description',
  'dsh-spec-pre-push-checks',
  'dsh-spec-prose-standard',
  'dsh-spec-skill-forge',
  'dsh-spec-test-reliability',
  'dsh-spec-translate-docs',
]

const USE_SITE_PINS = [
  {
    skill: 'dsh-spec-agent-notes',
    file: 'SKILL.md',
    text: 'The root defaults to `.agents/dsh-spec-agent-notes/`',
  },
  {
    skill: 'dsh-spec-agent-notes',
    file: 'SKILL.md',
    text: "When translation is available, choose this note's target set in this order:",
  },
  {
    skill: 'dsh-spec-error-handling',
    file: 'SKILL.md',
    text: 'when no convention exists, choose one stable machine-readable discriminant for each condition',
  },
  {
    skill: 'dsh-spec-translate-docs',
    file: 'references/pairing-contract.md',
    text: 'The mechanical default target is `zh` (display name `中文`) when `--target` is omitted.',
  },
  {
    skill: 'dsh-spec-translate-docs',
    file: 'SKILL.md',
    text: 'when the workflow responsible for a document scope authorizes a pair',
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
    text: "The landing repository's policy selects the merge method. When its instructions prescribe one, use it; otherwise, when its GitHub merge settings allow exactly one method, use that method; otherwise use `squash`.",
  },
  {
    skill: 'dsh-spec-skill-forge',
    file: 'SKILL.md',
    text: "The additional trigger language defaults to the adopter's review language",
  },
  {
    skill: 'dsh-spec-client-ui-ux',
    file: 'SKILL.md',
    text: 'A user-visible browser UI behavior change produces truthful recorded evidence by default.',
  },
  {
    skill: 'dsh-spec-client-ui-ux',
    file: 'SKILL.md',
    text: 'when it declares none, keep coarse-pointer text inputs at least 16 CSS pixels',
  },
  {
    skill: 'dsh-spec-browser-gif-evidence',
    file: 'SKILL.md',
    text: 'When a change alters user-visible browser UI behavior, generate and verify GIF evidence by default.',
  },
  {
    skill: 'dsh-spec-test-reliability',
    file: 'SKILL.md',
    text: 'By default, split a mixed test into fast contract cases and one shared real-resource scenario',
  },
  {
    skill: 'dsh-spec-test-reliability',
    file: 'SKILL.md',
    text: 'A diagnosis-only request stays read-only until the user also authorizes repair.',
  },
  {
    skill: 'dsh-spec-test-reliability',
    file: 'SKILL.md',
    text: "Do not multiply every test group's timeout because one group is slow.",
  },
]

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
  }
})

test('concrete defaults remain at their own use sites', () => {
  for (const pin of USE_SITE_PINS) {
    const body = read(pin.skill, pin.file)
    assert.equal(body.split(pin.text).length - 1, 1, `${pin.skill}/${pin.file}: ${pin.text}`)
  }
})

test('PR description module details stay under Changes', () => {
  const body = read('dsh-spec-pr-description')
  const changes = body.indexOf('### Changes')
  const moduleDetails = body.indexOf('#### Module responsibilities and dependencies')
  const testing = body.indexOf('### Testing')
  assert.ok(changes >= 0 && changes < moduleDetails && moduleDetails < testing)
  assert.doesNotMatch(body, /^### Module responsibilities and dependencies$/m)
})

test('the forge accepts future defaults without project instructions', () => {
  const forge = read('dsh-spec-skill-forge')
  assert.match(
    forge,
    /a forged skill that declares a default applies it only when neither the request nor existing project instructions choose one, while treating instructions as read-only input and never asking for, creating, modifying, or copying them merely to select a default/,
  )
})

test('companion defaults follow project state and fail closed', () => {
  const notes = read('dsh-spec-agent-notes')
  const ladder = [
    'the current request;',
    'existing project instructions;',
    'a consistent target set from complete pairs in the same owner-defined class;',
    "the primary agent's user language, when it differs from the source language;",
    'no translation companion.',
  ]
  let previous = -1
  for (const step of ladder) {
    const position = notes.indexOf(step)
    assert.ok(position > previous, `missing or out-of-order companion default: ${step}`)
    previous = position
  }
  assert.match(notes, /Failure leaves the unit unfinished.*never becomes English-only/)
  assert.match(notes, /Adding a target is progressive/)
  assert.match(notes, /Removing a target clears every eligible active and unsealed unit/)
  assert.match(
    notes,
    /The model judges comparable files and project evidence; scripts receive resolved companion facts/,
  )
  assert.match(notes, /Translation requires project evidence and availability/)
  assert.match(notes, /Installing a mechanism alone neither enables nor makes it available/)
  assert.doesNotMatch(notes, /\.agents\/skills/)

  const translate = read('dsh-spec-translate-docs')
  assert.match(translate, /Once selected, translation and pairing are required, and failure is handed off unfinished/)
  assert.doesNotMatch(translate, /\.agents\/skills/)
  assert.match(
    translate,
    /New pair\*\* \(standing instructions, explicit instruction or authorization from the responsible workflow\)/,
  )
  assert.match(
    translate,
    /beyond the documents selected by the project instructions, the user or the responsible workflow/,
  )
  assert.match(translate, /add in-scope counterparts/)
  assert.doesNotMatch(translate, /workflow owner's bounded default/)
  assert.doesNotMatch(translate, /dsh-spec-agent-notes/)

  const pairing = read('dsh-spec-translate-docs', 'references/pairing-contract.md')
  assert.match(pairing, /The responsible model or workflow resolves the target set/)
  assert.match(pairing, /The script never infers a target from a sibling file/)
  assert.match(pairing, /An explicit set may contain multiple targets/)
  assert.match(pairing, /Target addition is progressive/)
  assert.match(pairing, /Target removal is a strong cleanup/)
  assert.match(pairing, /Range `check`, `list`, `brief` and `write --all` never create missing targets/)
  assert.match(pairing, /\.agents\/skills/)
})
