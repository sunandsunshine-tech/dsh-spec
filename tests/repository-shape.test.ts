/**
 * Repository invariants the workspace tooling relies on.
 *
 * These cases read the working tree rather than a fixture: the package scripts stay single commands,
 * so no shell pipeline can hide a failure, and every landed skill has an installed copy with the
 * same bytes, so `pnpm run skill:refresh` is verified against the tree it just produced.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { test } from 'node:test'
import MarkdownIt, { type Token } from 'markdown-it'
import { REPO_ROOT } from './helpers/fixtures.ts'

/** Test/verification headings that own current evidence; Chinese headings have no \b after CJK. */
const ACTIVE_TEST_HEADING = /^## (?:(?:Testing|Verification)\b|测试|验证)/m

/** Every file under a directory, keyed by its relative path and content hash. */
function hashTree(root: string): Map<string, string> {
  const files = new Map<string, string>()
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name)
      const name = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) walk(path, name)
      else if (entry.isFile()) files.set(name, createHash('sha256').update(readFileSync(path)).digest('hex'))
    }
  }
  walk(root, '')
  return files
}

function repoFile(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), 'utf8')
}

interface MarkdownTable {
  rows: string[][]
}

interface MarkdownDocument {
  path: string
  text: string
  headingDepths: number[]
  tables: MarkdownTable[]
  fences: string[]
  links: string[]
}

type SkillGroup = string[]

const markdown = new MarkdownIt()
const ADOPTER_DOCS = ['README.md', 'README.zh.md', 'docs/choosing-skills.md', 'docs/choosing-skills.zh.md']
const RELATED_DOCS = [
  ...ADOPTER_DOCS,
  '.agents/dsh-spec-agent-notes/implemented/process/2026-11-20-skill-selection-has-one-detailed-home.md',
  '.agents/dsh-spec-agent-notes/implemented/process/2026-11-20-skill-selection-has-one-detailed-home.zh.md',
]
const REQUIRED_UNIVERSAL_SKILLS = ['dsh-spec-agent-experience', 'dsh-spec-translate-docs']

function appendLinks(children: Token[] | null | undefined, links: string[]): void {
  for (const child of children ?? []) {
    const target =
      child.type === 'link_open' ? child.attrGet('href') : child.type === 'image' ? child.attrGet('src') : null
    if (target) links.push(String(target))
  }
}

function parseMarkdown(path: string): MarkdownDocument {
  const text = repoFile(path)
  const tokens = markdown.parse(text, {})
  const headingDepths: number[] = []
  const tables: MarkdownTable[] = []
  const fences: string[] = []
  const links: string[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]!
    if (token.type === 'heading_open') {
      headingDepths.push(Number(token.tag.slice(1)))
    } else if (token.type === 'fence') {
      fences.push(token.content)
    } else if (token.type === 'table_open') {
      const rows: string[][] = []
      let row: string[] | undefined
      let body = false
      while (tokens[index]?.type !== 'table_close') {
        const child = tokens[index]!
        if (child.type === 'tbody_open') body = true
        else if (child.type === 'tr_open' && body) row = []
        else if (child.type === 'inline' && row) {
          row.push(child.content)
          appendLinks(child.children, links)
        } else if (child.type === 'tr_close' && row) {
          rows.push(row)
          row = undefined
        }
        index += 1
      }
      tables.push({ rows })
    }

    if (token.type === 'inline') {
      appendLinks(token.children, links)
    }
  }

  return { path, text, headingDepths, tables, fences, links }
}

function skillIds(text: string, skills: ReadonlySet<string>): string[] {
  return [...new Set([...text.matchAll(/`(dsh-spec-[a-z0-9-]+)`/g)].map((match) => match[1]!))].filter((name) =>
    skills.has(name),
  )
}

function readmeGroups(document: MarkdownDocument, skills: ReadonlySet<string>): SkillGroup[] {
  const tables = document.tables.filter(
    (table) =>
      table.rows.length > 0 &&
      table.rows.every(
        (row) => row.length >= 2 && skillIds(row[0]!, skills).length === 0 && skillIds(row[1]!, skills).length > 0,
      ),
  )
  assert.equal(tables.length, 1, `${document.path}: expected one five-group table`)
  return tables[0]!.rows.map((row) => skillIds(row[1]!, skills))
}

function guideGroups(document: MarkdownDocument, skills: ReadonlySet<string>): SkillGroup[] {
  const tables = document.tables.filter(
    (table) =>
      table.rows.length > 0 && table.rows.every((row) => row.length === 3 && skillIds(row[0]!, skills).length === 1),
  )
  assert.equal(tables.length, 5, `${document.path}: expected five group tables`)
  return tables.map((table) => table.rows.map((row) => skillIds(row[0]!, skills)[0]!))
}

function assertPartition(groups: SkillGroup[], skills: readonly string[], label: string): string[][] {
  assert.equal(groups.length, 5, `${label}: five groups`)
  assert.ok(
    groups.every((group) => group.length > 0),
    `${label}: every group names a skill`,
  )
  const signature = groups.map((group) => [...group].sort())
  const members = signature.flat()
  assert.equal(new Set(members).size, members.length, `${label}: groups do not overlap`)
  assert.deepEqual([...members].sort(), [...skills].sort(), `${label}: groups cover every landed skill`)
  return signature
}

function universalInstallSkills(document: MarkdownDocument): string[] {
  const blocks = document.fences.filter(
    (block) => block.includes('PIN="<tag-or-commit>"') && block.includes('for skill in'),
  )
  assert.equal(blocks.length, 1, `${document.path}: one universal install block`)
  const block = blocks[0]!
  assert.match(block, /^\(\n {2}set -e$/m, `${document.path}: install stops at the first failure`)
  assert.match(block, /^\)$/m, `${document.path}: install restores the caller's shell options`)
  return [...block.matchAll(/^\s+(dsh-spec-[a-z0-9-]+)(?: \\)?$/gm)].map((match) => match[1]!)
}

function combinationRows(document: MarkdownDocument, skills: ReadonlySet<string>): string[][] {
  const tables = document.tables.filter(
    (table) =>
      table.rows.length >= 5 &&
      table.rows.every((row) => row.length === 3 && skillIds(row[0]!, skills).length === 0) &&
      table.rows.some((row) => skillIds(row[2]!, skills).length > 0),
  )
  assert.equal(tables.length, 1, `${document.path}: expected one common-combinations table`)
  return tables[0]!.rows
}

function recommendationRow(rows: string[][], pattern: RegExp, label: string): string[] {
  const matches = rows.filter((row) => pattern.test(row[0]!))
  assert.equal(matches.length, 1, `${label}: one recommendation row`)
  return matches[0]!
}

function recommendedSkills(text: string, skills: ReadonlySet<string>): string[] {
  const positiveSentences = text
    .split(/(?<=[.!?])\s+|(?<=[。！？])/u)
    .filter((sentence) => !/(?:\b(?:do not|don't|never)\b|不推荐|不要|不得)/iu.test(sentence))
  return positiveSentences.flatMap((sentence) => skillIds(sentence, skills))
}

function assertLocalLinksResolve(document: MarkdownDocument): void {
  let checked = 0
  for (const rawTarget of document.links) {
    const target = rawTarget.trim()
    if (!target || target.startsWith('#') || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)) continue
    const targetPath = decodeURIComponent(target.split(/[?#]/, 1)[0]!)
    assert.ok(!isAbsolute(targetPath), `${document.path}: absolute local link ${target}`)
    const resolved = resolve(dirname(join(REPO_ROOT, document.path)), targetPath)
    const fromRoot = relative(REPO_ROOT, resolved)
    assert.ok(
      fromRoot === '' || (!fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot)),
      `${document.path}: link escapes the repository: ${target}`,
    )
    assert.ok(existsSync(resolved), `${document.path}: missing local link ${target}`)
    checked += 1
  }
  assert.ok(checked > 0, `${document.path}: local links are checked`)
}

test('the split note modules carry their SPDX and provenance headers', () => {
  const root = 'package/dsh-spec-agent-notes'
  const files = [
    ...readdirSync(join(REPO_ROOT, root))
      .filter((name) => name.endsWith('.ts') && name !== 'build.ts' && name !== 'vite.config.ts')
      .map((name) => root + '/' + name),
    ...readdirSync(join(REPO_ROOT, root, 'cli'))
      .filter((name) => name.endsWith('.ts'))
      .map((name) => root + '/cli/' + name),
  ]
  assert.ok(files.length >= 9, 'expected the split notes modules')
  for (const file of files) {
    const text = repoFile(file)
    assert.match(text.slice(0, 500), /SPDX-License-Identifier: MIT/, file)
    assert.match(text.slice(0, 500), /Adapted from the DeepSeek Harness note-gate scripts/, file)
  }
})

test('active record test sections do not name removed commands', () => {
  const root = '.agents/dsh-spec-agent-notes'
  const files = readdirSync(join(REPO_ROOT, root), { recursive: true }).filter(
    (name): name is string => typeof name === 'string' && name.endsWith('.md') && name.split(/[\\/]/)[0] !== 'archived',
  )
  assert.ok(files.length > 0)
  for (const file of files) {
    const text = repoFile(root + '/' + file)
    for (const section of text.split(/\n(?=## )/)) {
      if (!ACTIVE_TEST_HEADING.test(section)) continue
      assert.doesNotMatch(section, /dsh-spec\.ts|dsh-spec-manager|verify-skill-structure/, file)
    }
  }
})

test('the active-record guard recognizes English and Chinese headings', () => {
  for (const heading of ['## Testing', '## Verification', '## 验证', '## 验证锚点']) {
    assert.match(heading + '\n- `dsh-spec.ts`', ACTIVE_TEST_HEADING)
  }
  assert.doesNotMatch('### 验证\n- `dsh-spec.ts`', ACTIVE_TEST_HEADING)
})

test('every package script is one command', () => {
  const scripts = JSON.parse(repoFile('package.json')).scripts as Record<string, string>
  assert.ok(Object.keys(scripts).length > 0)
  for (const [name, command] of Object.entries(scripts)) {
    assert.doesNotMatch(command, /&&|\|\||;|\$\(|`|\||\brsync\b|\brm -rf\b/, name)
  }
})

test('the functional suite does not discover development eval fixtures', () => {
  const evalRoot = join(REPO_ROOT, 'tests', 'skill-evals')
  const testFiles = readdirSync(evalRoot, { recursive: true })
    .filter((path): path is string => typeof path === 'string' && path.endsWith('.test.ts'))
    .sort()
  assert.deepEqual(testFiles, [], 'development eval inputs match the functional suite glob')
})

test('every landed skill has an identical installed copy', () => {
  const skills = readdirSync(join(REPO_ROOT, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()
  assert.ok(skills.length > 0)
  for (const name of skills) {
    const landed = join(REPO_ROOT, 'skills', name)
    const installed = join(REPO_ROOT, '.agents', 'skills', name)
    assert.equal(existsSync(join(landed, 'evals')), false, `${name} ships developer eval inputs`)
    assert.equal(existsSync(installed), true, `${name} is not installed`)
    const left = hashTree(landed)
    const right = hashTree(installed)
    assert.deepEqual([...right.keys()], [...left.keys()], `${name} file list`)
    for (const [path, hash] of left) {
      assert.equal(right.get(path), hash, `${name}/${path}`)
    }
  }
})

test('agent-experience provenance names the revision and source path it actually adapted', () => {
  const notice = repoFile('skills/dsh-spec-agent-experience/THIRD_PARTY_NOTICES')
  assert.match(
    notice,
    /^- Historical adapted revision: `dsh-v[^`]+` \(`[0-9a-f]{40}`\)\.$/m,
    'agent-experience does not declare its historical adapted revision',
  )
  const sourcePath = 'packages/preset/agent-preset/skills/agent-experience/SKILL.md'
  assert.ok(notice.includes(`\`${sourcePath}\``), 'agent-experience does not name its adapted source path')
})

test('adopter documentation has one complete, bilingual skill-selection map', () => {
  const skills = readdirSync(join(REPO_ROOT, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort()
  assert.equal(skills.length, 15, 'the landed skill corpus contains 15 skills')
  const known = new Set(skills)
  const documents = new Map(RELATED_DOCS.map((path) => [path, parseMarkdown(path)]))

  const readmeEnglish = documents.get(ADOPTER_DOCS[0]!)!
  const readmeChinese = documents.get(ADOPTER_DOCS[1]!)!
  const guideEnglish = documents.get(ADOPTER_DOCS[2]!)!
  const guideChinese = documents.get(ADOPTER_DOCS[3]!)!

  const groups = {
    readmeEnglish: readmeGroups(readmeEnglish, known),
    readmeChinese: readmeGroups(readmeChinese, known),
    guideEnglish: guideGroups(guideEnglish, known),
    guideChinese: guideGroups(guideChinese, known),
  }
  const canonical = assertPartition(groups.readmeEnglish, skills, 'README.md')
  for (const [label, value] of Object.entries(groups).slice(1)) {
    assert.deepEqual(assertPartition(value, skills, label), canonical, `${label}: same groups and members as README.md`)
  }

  const universal = groups.readmeEnglish[0]!
  const universalChinese = groups.readmeChinese[0]!
  assert.equal(universal.length, 5, 'the README universal group contains five skills')
  assert.deepEqual([...universal].sort(), canonical[0])
  assert.deepEqual([...universalChinese].sort(), canonical[0])
  for (const required of REQUIRED_UNIVERSAL_SKILLS) {
    assert.ok(universal.includes(required), `universal group: ${required}`)
  }
  assert.deepEqual(universalInstallSkills(readmeEnglish), universal, 'README.md: install block and group table agree')
  assert.deepEqual(
    universalInstallSkills(readmeChinese),
    universalChinese,
    'README.zh.md: install block and group table agree',
  )

  assert.match(
    guideEnglish.text,
    /Install the universal group in full at the start\. For a specialized group, install only the skills the project's work uses\./,
  )
  assert.match(guideChinese.text, /起步时完整安装通用组。对于专项组，只安装项目当前工作会用到的技能。/)
  assert.deepEqual(guideChinese.headingDepths, guideEnglish.headingDepths, 'guide headings match across languages')
  assert.deepEqual(
    guideChinese.tables.map((table) => table.rows.map((row) => row.length)),
    guideEnglish.tables.map((table) => table.rows.map((row) => row.length)),
    'guide tables match across languages',
  )

  for (const [document, ordinaryPattern, officialPattern] of [
    [guideEnglish, /ordinary/i, /official/i],
    [guideChinese, /普通/, /官方/],
  ] as const) {
    const rows = combinationRows(document, known)
    const ordinary = recommendedSkills(recommendationRow(rows, ordinaryPattern, document.path)[2]!, known)
    const official = recommendedSkills(recommendationRow(rows, officialPattern, document.path)[2]!, known)
    assert.ok(ordinary.includes('dsh-spec-pr-description'), `${document.path}: ordinary PR recommends pr-description`)
    assert.ok(
      !ordinary.includes('dsh-spec-merging-stacked-prs'),
      `${document.path}: ordinary PR does not recommend stack landing`,
    )
    assert.ok(official.includes('dsh-spec-pr-description'), `${document.path}: stacked PR recommends pr-description`)
    assert.ok(
      official.includes('dsh-spec-merging-stacked-prs'),
      `${document.path}: stacked PR recommends stack landing`,
    )
    assert.equal(
      rows.filter((row) => recommendedSkills(row[2]!, known).includes('dsh-spec-merging-stacked-prs')).length,
      1,
      `${document.path}: only the official stacked-PR row recommends stack landing`,
    )
  }

  for (const document of documents.values()) assertLocalLinksResolve(document)
})

test('independently installed DeepSeek Harness skills name the current repository pin', () => {
  const rootNotice = repoFile('THIRD_PARTY_NOTICES.md')
  const pin = /^Upstream: .*pinned at `(dsh-v[^`]+)`\s+\(`([0-9a-f]{40})`\)\.$/m.exec(rootNotice)
  assert.ok(pin, 'the root notice does not declare the DeepSeek Harness pin')

  for (const name of readdirSync(join(REPO_ROOT, 'skills'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)) {
    const noticePath = join(REPO_ROOT, 'skills', name, 'THIRD_PARTY_NOTICES')
    if (!existsSync(noticePath)) continue
    const notice = readFileSync(noticePath, 'utf8')
    if (!notice.includes('github.com/deepseek-ai/deepseek-harness')) continue
    const upstream =
      /^- Upstream: <https:\/\/github\.com\/deepseek-ai\/deepseek-harness>, pinned at `(dsh-v[^`]+)`\s+\(`([0-9a-f]{40})`\)\.$/m.exec(
        notice,
      )
    assert.ok(upstream, name + ' has a malformed DeepSeek Harness pin')
    assert.equal(upstream[1], pin[1], name + ' does not name the current pin tag')
    assert.equal(upstream[2], pin[2], name + ' does not name the current pin commit')

    const pathStart = notice.search(/^- Upstream paths?:/m)
    assert.notEqual(pathStart, -1, name + ' declares no upstream source paths')
    const relation = notice.indexOf('\n- Relation:', pathStart)
    const sourceSection = notice.slice(pathStart, relation === -1 ? undefined : relation)
    const sourcePaths = [...sourceSection.matchAll(/`((?:\.agents|docs|packages|scripts)\/[^`]+)`/g)].map(
      (match) => match[1] as string,
    )
    assert.ok(sourcePaths.length > 0, name + ' declares no resolvable upstream source path')
    for (const sourcePath of sourcePaths) {
      const object: ReturnType<typeof spawnSync> = spawnSync('git', [
        '-C',
        join(REPO_ROOT, 'submodules/dsh'),
        'cat-file',
        '-e',
        `${pin[2]}:${sourcePath}`,
      ])
      assert.equal(object.status, 0, name + ' names an upstream path absent from its pin: ' + sourcePath)
    }
  }
})
