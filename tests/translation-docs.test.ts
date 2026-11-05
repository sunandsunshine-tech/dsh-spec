/**
 * The pairing mechanism's functional cases: aggregate multi-language records, per-file source
 * languages, existing-pair discovery and selection, switchers, structure, generated regions,
 * briefing, the region helper CLI and the CLI's failure modes. The suite invokes the built bundle
 * at the work-draft path with the landed fallback, and imports the split corpus and switcher
 * modules directly for their pure-logic cases.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { makeFixture, REPO_ROOT } from './helpers/fixtures.ts'
import { skillBundlePath } from './helpers/bundles.ts'
import type { Fixture } from './helpers/fixtures.ts'
import { bindTarget } from '../package/dsh-spec-translate-docs/signature.ts'
import type { PairCorpus } from '../package/dsh-spec-translate-docs/corpus.ts'
import { buildCorpus, discoverPairs, pairLanguages } from '../package/dsh-spec-translate-docs/corpus.ts'
import { parseMarkdown } from '../package/dsh-spec-translate-docs/markdown.ts'
import { locateSwitchers } from '../package/dsh-spec-translate-docs/switchers.ts'
import { pairPaths } from '../package/dsh-spec-translate-docs/targets.ts'

const binary = skillBundlePath('dsh-spec-translate-docs', 'translate-pair.mjs')

interface Outcome {
  status: number
  stdout: string
  stderr: string
  output: string
}

function spawnPair(cwd: string, args: string[], input?: string): Outcome {
  const result = spawnSync(process.execPath, [binary, ...args], { cwd, encoding: 'utf8', input })
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  return { status: result.status ?? -1, stdout, stderr, output: stdout + stderr }
}

function run(cwd: string, ...args: string[]): Outcome {
  return spawnPair(cwd, args)
}

function runWithInput(cwd: string, input: string, ...args: string[]): Outcome {
  return spawnPair(cwd, args, input)
}

interface TargetSpec {
  code: string
  name: string
  suffix: string
  title: string
  body: string
}

function target(code: string, name: string, title: string, body: string): TargetSpec {
  return { code, name, suffix: code === 'zh' ? '.zh.md' : '.' + code + '.md', title, body }
}

function sourceSwitcher(sourceLabel: string, sourcePath: string, targets: TargetSpec[]): string {
  const sourceName = sourcePath.split('/').at(-1) as string
  const links = [...targets]
    .sort((left, right) => left.code.localeCompare(right.code))
    .map((entry) => '[' + entry.name + '](' + sourceName.replace(/\.md$/, entry.suffix) + ')')
    .join(' | ')
  return sourceLabel + ' | ' + links
}

/** Write one source/counterpart pair and its source-side switcher listing all targets. */
function pair(
  fixture: Fixture,
  sourcePath: string,
  sourceLabel: string,
  sourceTitle: string,
  sourceBody: string,
  targets: TargetSpec[],
  metadata = '',
): void {
  const base = sourcePath.replace(/\.md$/, '')
  fixture.write(
    sourcePath,
    '# ' +
      sourceTitle +
      '\n\n' +
      metadata +
      sourceSwitcher(sourceLabel, sourcePath, targets) +
      '\n\n' +
      sourceBody +
      '\n',
  )
  const sourceName = sourcePath.split('/').at(-1) as string
  for (const entry of targets) {
    fixture.write(
      base + entry.suffix,
      '# ' + entry.title + '\n\n[' + sourceLabel + '](' + sourceName + ') | ' + entry.name + '\n\n' + entry.body + '\n',
    )
  }
}

function terminology(fixture: Fixture, rows: string, targetName = '中文', code = 'zh'): void {
  const name = code === 'zh' ? 'terminology.md' : 'terminology.' + code + '.md'
  fixture.write(
    '.agents/dsh-spec-translate-docs/' + name,
    [
      '# Terminology',
      '',
      '| English | ' + targetName + ' | First occurrence | Forbidden renderings | Note |',
      '|---|---|---|---|---|',
      rows,
      '',
    ].join('\n'),
  )
}

function writeRecord(fixture: Fixture, sourcePath: string, targetArg = 'zh=中文'): Outcome {
  return run(fixture.root, 'write', sourcePath, '--target', targetArg)
}

function zh(title = '指南', body = '简介段落。'): TargetSpec {
  return target('zh', '中文', title, body)
}

test('init writes a terminology template and never overwrites it', () => {
  const fixture = makeFixture()
  try {
    const first = run(fixture.root, 'init', '--target', 'zh=中文')
    assert.equal(first.status, 0, first.output)
    const template = fixture.read('.agents/dsh-spec-translate-docs/terminology.md')
    assert.match(template, /\| English \| 中文 \| First occurrence \| Forbidden renderings \| Note \|/)
    const second = run(fixture.root, 'init', '--target', 'zh=中文')
    assert.equal(second.status, 0, second.output)
    assert.match(second.output, /already exists/)
    assert.equal(fixture.read('.agents/dsh-spec-translate-docs/terminology.md'), template)
  } finally {
    fixture.dispose()
  }
})

test('init resolves a relative --root against the working directory', () => {
  const fixture = makeFixture()
  try {
    fixture.write('nested/.keep', '')
    const first = run(fixture.root, 'init', '--root', 'nested', '--target', 'zh=中文')
    assert.equal(first.status, 0, first.output)
    const path = 'nested/.agents/dsh-spec-translate-docs/terminology.md'
    const template = fixture.read(path)
    const second = run(fixture.root, 'init', '--root', 'nested', '--target', 'zh=中文')
    assert.equal(second.status, 0, second.output)
    assert.match(second.output, /already exists/)
    assert.equal(fixture.read(path), template)
  } finally {
    fixture.dispose()
  }
})

test('init resolves a relative --terminology under --root and never overwrites cwd', () => {
  const fixture = makeFixture()
  try {
    fixture.write('custom-terms.md', 'KEEP ME\n')
    fixture.write('nested/.keep', '')
    const first = run(
      fixture.root,
      'init',
      '--root',
      'nested',
      '--target',
      'zh=中文',
      '--terminology',
      'zh=custom-terms.md',
    )
    assert.equal(first.status, 0, first.output)
    assert.match(fixture.read('nested/custom-terms.md'), /# Terminology/)
    assert.equal(fixture.read('custom-terms.md'), 'KEEP ME\n')
    const second = run(
      fixture.root,
      'init',
      '--root',
      'nested',
      '--target',
      'zh=中文',
      '--terminology',
      'zh=custom-terms.md',
    )
    assert.equal(second.status, 0, second.output)
    assert.match(second.output, /already exists/)
    assert.equal(fixture.read('custom-terms.md'), 'KEEP ME\n')
  } finally {
    fixture.dispose()
  }
})

test('init takes exactly one target and rejects corpus flags', () => {
  const fixture = makeFixture()
  try {
    assert.equal(run(fixture.root, 'init', '--target', 'zh=中文', '--target', 'ja=日本語').status, 2)
    assert.equal(run(fixture.root, 'init', '--target', 'zh=中文', '--generated', 'docs/**').status, 2)
    assert.equal(run(fixture.root, 'init', '--target', 'zh=中文', '--select', 'docs/**').status, 2)
  } finally {
    fixture.dispose()
  }
})

test('write records an aggregate pair and check accepts it', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro paragraph.', [zh()])
    const write = writeRecord(fixture, 'docs/foo.md')
    assert.equal(write.status, 0, write.output)
    assert.match(write.output, /recorded docs\/foo\.i18n\.yaml/)
    const record = fixture.read('docs/foo.i18n.yaml')
    assert.match(record, /^# Pairing consistency record for foo\.md/)
    assert.match(record, /^  en: [0-9a-f]{16}$/m)
    assert.match(record, /^  zh: [0-9a-f]{16}$/m)
    const check = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(check.status, 0, check.output)
    assert.match(check.output, /1 pair\(s\) consistent/)
  } finally {
    fixture.dispose()
  }
})

test('an edit without a re-record is out of sync, and a comment header is provenance', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro paragraph.', [zh()])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro paragraph.', 'Intro paragraph changed.'))
    const stale = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(stale.status, 1, stale.output)
    assert.match(stale.output, /changed since confirmation/)
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const record = fixture.read('docs/foo.i18n.yaml')
    fixture.write('docs/foo.i18n.yaml', '# another mechanism header\n' + record)
    const commentOnly = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(commentOnly.status, 0, commentOnly.output)
    const reordered = record.replace(
      /\/guide:\n  en: ([0-9a-f]{16})\n  zh: ([0-9a-f]{16})/,
      '/guide:\n  zh: $2\n  en: $1',
    )
    fixture.write('docs/foo.i18n.yaml', reordered)
    const canonical = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(canonical.status, 1, canonical.output)
    assert.match(canonical.output, /out of sync|not in canonical form/)
  } finally {
    fixture.dispose()
  }
})

test('a malformed record is rejected', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    fixture.write('docs/foo.i18n.yaml', '/guide:\n  en: not-a-hash\n  zh: also-bad\n')
    const check = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(check.status, 1, check.output)
    assert.match(check.output, /malformed consistency record/)
  } finally {
    fixture.dispose()
  }
})

test('per-file source languages use their own record source key', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/fr.md', 'Français', 'Guide', 'Bonjour.', [zh('指南', '简介。')])
    pair(fixture, 'docs/en.md', 'English', 'Guide', 'Hello.', [zh('指南', '你好。')])
    const fr = run(fixture.root, 'write', 'docs/fr.md', '--source-lang', 'fr=Français', '--target', 'zh=中文')
    assert.equal(fr.status, 0, fr.output)
    assert.match(fixture.read('docs/fr.i18n.yaml'), /^  fr: [0-9a-f]{16}$/m)
    assert.match(fixture.read('docs/fr.i18n.yaml'), /^  zh: [0-9a-f]{16}$/m)
    assert.equal(writeRecord(fixture, 'docs/en.md').status, 0)
    const check = run(fixture.root, 'check')
    assert.equal(check.status, 0, check.output)
    assert.match(check.output, /2 pair\(s\) consistent/)
  } finally {
    fixture.dispose()
  }
})

test('one aggregate record holds several targets and preserves the others on write', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [
      zh('指南', '简介。'),
      target('ja', '日本語', 'ガイド', 'はじめに。'),
    ])
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'zh=中文').status, 0)
    const before = fixture.read('docs/foo.i18n.yaml')
    assert.match(before, /^  en: [0-9a-f]{16}$/m)
    assert.match(before, /^  zh: [0-9a-f]{16}$/m)
    assert.doesNotMatch(before, /^  ja:/m)
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'ja=日本語').status, 0)
    const after = fixture.read('docs/foo.i18n.yaml')
    assert.match(after, /^  en: [0-9a-f]{16}$/m)
    assert.match(after, /^  ja: [0-9a-f]{16}$/m)
    assert.match(after, /^  zh: [0-9a-f]{16}$/m)
    assert.ok(!existsSync(join(fixture.root, 'docs/foo.ja.i18n.yaml')))
    const check = run(fixture.root, 'check', 'docs/foo.md')
    assert.equal(check.status, 0, check.output)
    assert.match(check.output, /2 pair\(s\) consistent/)
    const changed = after.replace(/^(  ja: [0-9a-f]{16})$/m, '  ja: 0000000000000000')
    fixture.write('docs/foo.i18n.yaml', changed)
    const stale = run(fixture.root, 'check', 'docs/foo.md', '--target', 'ja=日本語')
    assert.equal(stale.status, 1, stale.output)
  } finally {
    fixture.dispose()
  }
})

test('per-file target sets need no completeness and no missing rows appear', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    pair(fixture, 'docs/bar.md', 'English', 'Bar', 'Body.', [target('ja', '日本語', 'バー', '本文。')])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/bar.md', 'ja=日本語').status, 0)
    const list = run(fixture.root, 'list')
    assert.equal(list.status, 0, list.output)
    assert.match(list.stdout, /ok +docs\/foo\.md \[zh\]/)
    assert.match(list.stdout, /ok +docs\/bar\.md \[ja\]/)
    assert.doesNotMatch(list.stdout, /^missing /m)
    const check = run(fixture.root, 'check')
    assert.equal(check.status, 0, check.output)
  } finally {
    fixture.dispose()
  }
})

test('a known pair with a missing counterpart is reported as missing', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.remove('docs/foo.zh.md')
    const list = run(fixture.root, 'list')
    assert.equal(list.status, 0, list.output)
    assert.match(list.stdout, /missing +docs\/foo\.md \[zh\]/)
    const check = run(fixture.root, 'check')
    assert.equal(check.status, 1, check.output)
    assert.match(check.output, /incomplete pair/)
  } finally {
    fixture.dispose()
  }
})

test('select and skip filter existing pairs; empty selection and malformed globs fail', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    pair(fixture, 'docs/bar.md', 'English', 'Bar', 'Body.', [zh('栏', '正文。')])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/bar.md').status, 0)
    const selected = run(fixture.root, 'check', '--select', 'docs/foo.md')
    assert.equal(selected.status, 0, selected.output)
    assert.match(selected.output, /1 pair\(s\) consistent/)
    const empty = run(fixture.root, 'check', '--select', 'missing/**')
    assert.equal(empty.status, 2, empty.output)
    const list = run(fixture.root, 'list', '--skip', 'docs/bar.md')
    assert.equal(list.status, 0, list.output)
    assert.match(list.stdout, /docs\/foo\.md/)
    assert.doesNotMatch(list.stdout, /docs\/bar\.md/)
    assert.equal(run(fixture.root, 'check', '--select', '[').status, 2)
    assert.equal(run(fixture.root, 'list', '--skip', '{').status, 2)
  } finally {
    fixture.dispose()
  }
})

test('the corpus skip patterns exclude a populated submodule', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'submodules/dsh/.agents/skills/example/SKILL.md', 'English', 'Example', 'Body.', [zh()])
    assert.equal(writeRecord(fixture, 'submodules/dsh/.agents/skills/example/SKILL.md').status, 0)
    const list = run(fixture.root, 'list', '--skip', 'submodules/**', '--skip', 'submodules/**/.*/**')
    assert.equal(list.status, 0, list.output)
    assert.doesNotMatch(list.stdout, /submodules\/dsh/)
  } finally {
    fixture.dispose()
  }
})

test('a pair naming no files is a usage error; an empty list is clean', () => {
  const fixture = makeFixture()
  try {
    assert.equal(run(fixture.root, 'check', 'docs/none.md').status, 2)
    assert.equal(run(fixture.root, 'check').status, 2)
    assert.equal(run(fixture.root, 'list').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('the switcher is structural: metadata may precede it and a generated source may omit it', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()], 'Status: active\n\n')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文').status, 0)
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace(/^English \| \[中文\]\(foo\.zh\.md\)\n\n/m, ''))
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const missing = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(missing.status, 1, missing.output)
    assert.match(missing.output, /language switcher/)
    const generated = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文', '--generated', 'docs/foo.md')
    assert.equal(generated.status, 0, generated.output)
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace(/^\[English\]\(foo\.md\) \| 中文\n\n/m, ''))
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const noBacklink = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文', '--generated', 'docs/foo.md')
    assert.equal(noBacklink.status, 1, noBacklink.output)
    assert.match(noBacklink.output, /language switcher/)
  } finally {
    fixture.dispose()
  }
})

test('missing, duplicate and inline-code switchers fail; an absolute destination passes', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.write('docs/foo.md', fixture.read('docs/foo.md') + '\nEnglish | [中文](foo.zh.md)\n')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const duplicate = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(duplicate.status, 1, duplicate.output)
    assert.match(duplicate.output, /more than one canonical language switcher/)
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const tick = String.fromCharCode(96)
    fixture.write(
      'docs/foo.md',
      fixture
        .read('docs/foo.md')
        .replace('English | [中文](foo.zh.md)', 'The switcher is ' + tick + 'English | [中文](foo.zh.md)' + tick + '.'),
    )
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const quote = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(quote.status, 1, quote.output)
    assert.match(quote.output, /language switcher/)
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    fixture.write(
      'docs/foo.md',
      fixture
        .read('docs/foo.md')
        .replace(
          'English | [中文](foo.zh.md)',
          'English | [中文](https://example.invalid/o/r/blob/main/docs/foo.zh.md)',
        ),
    )
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const absolute = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(absolute.status, 0, absolute.output)
  } finally {
    fixture.dispose()
  }
})

test('a multi-target source lists every existing counterpart', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh(), target('ja', '日本語', 'ガイド', 'はじめに。')])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.write(
      'docs/foo.md',
      fixture
        .read('docs/foo.md')
        .replace('English | [日本語](foo.ja.md) | [中文](foo.zh.md)', 'English | [中文](foo.zh.md)'),
    )
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const check = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(check.status, 1, check.output)
    assert.match(check.output, /language switcher/)
  } finally {
    fixture.dispose()
  }
})

test('structure and link locale violations are reported', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.\n\n- one', [zh('指南', '简介。\n\n- 一')])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('- 一', '- 一\n- 二'))
    const lists = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(lists.status, 1, lists.output)
    assert.match(lists.output, /lists differs/)
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('- 一\n- 二', '- 一'))
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro.', 'See [other](other.md).'))
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('简介。', '见 [other](other.md)。'))
    fixture.write('docs/other.md', '# Other\n\nEnglish | [中文](other.zh.md)\n\nBody.\n')
    fixture.write('docs/other.zh.md', '# 其他\n\n[English](other.md) | 中文\n\n正文。\n')
    const locale = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(locale.status, 1, locale.output)
    assert.match(locale.output, /wrong locale/)
  } finally {
    fixture.dispose()
  }
})

test('regions use the upstream marker shell with the stricter own-block rules', () => {
  const fixture = makeFixture()
  try {
    const region =
      '<!-- BEGIN GENERATED config-catalog:@scope/package -->\n| key | value |\n|---|---|\n| a | 1 |\n<!-- END GENERATED config-catalog:@scope/package -->'
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.\n\n' + region, [zh('指南', '简介。\n\n' + region)])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文').status, 0)
    const before = fixture.read('docs/foo.i18n.yaml')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('| a | 1 |', '| a | 2 |'))
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('| a | 1 |', '| a | 2 |'))
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文').status, 0)
    assert.equal(fixture.read('docs/foo.i18n.yaml'), before)
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('| a | 2 |', '| a | 3 |'))
    const drift = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(drift.status, 1, drift.output)
    assert.match(drift.output, /regenerate both sides/)
    fixture.write(
      'docs/foo.md',
      fixture
        .read('docs/foo.md')
        .replace(
          '<!-- BEGIN GENERATED config-catalog:@scope/package -->',
          '  <!-- BEGIN GENERATED config-catalog:@scope/package -->',
        ),
    )
    const bad = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(bad.status, 1, bad.output)
    assert.match(bad.output, /generated-region marker/)
  } finally {
    fixture.dispose()
  }
})

test('a region heading is opaque to the record and a section anchor mismatch fails', () => {
  const fixture = makeFixture()
  try {
    const region = '<!-- BEGIN GENERATED catalog -->\n## Generated\n| a |\n|---|\n| 1 |\n<!-- END GENERATED catalog -->'
    fixture.write(
      'docs/foo.md',
      '# Guide\n\nEnglish | [中文](foo.zh.md)\n\n## Install\n\n' + region + '\n\n## Usage\n\nIntro.\n',
    )
    fixture.write(
      'docs/foo.zh.md',
      '# 指南\n\n[English](foo.md) | 中文\n\n## 安装\n\n' + region + '\n\n## 使用\n\n简介。\n',
    )
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const before = fixture.read('docs/foo.i18n.yaml')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('## Generated', '## Generated changed'))
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('## Generated', '## Generated changed'))
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文').status, 0)
    assert.equal(fixture.read('docs/foo.i18n.yaml'), before)
    const start = fixture.read('docs/foo.zh.md')
    const regionStart = start.indexOf('<!-- BEGIN GENERATED catalog -->')
    const regionEnd = start.indexOf('<!-- END GENERATED catalog -->') + '<!-- END GENERATED catalog -->'.length
    const moved = start.slice(0, regionStart) + start.slice(regionEnd)
    const withMoved = moved.replace(
      '## 使用\n\n简介。\n',
      '## 使用\n\n简介。\n\n' + start.slice(regionStart, regionEnd) + '\n',
    )
    fixture.write('docs/foo.zh.md', withMoved)
    const anchor = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(anchor.status, 1, anchor.output)
    assert.match(anchor.output, /different authored section/)
  } finally {
    fixture.dispose()
  }
})

test('the region helper CLI renders and splices, and refuses an unknown slug', () => {
  const fixture = makeFixture()
  try {
    const region = '<!-- BEGIN GENERATED catalog -->\nold\n<!-- END GENERATED catalog -->'
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.\n\n' + region, [zh('指南', '简介。\n\n' + region)])
    fixture.write('body.md', 'new\n')
    const rendered = run(fixture.root, 'region', 'render', '--slug', 'catalog', '--body', 'body.md')
    assert.equal(rendered.status, 0, rendered.output)
    assert.equal(rendered.stdout, '<!-- BEGIN GENERATED catalog -->\nnew\n<!-- END GENERATED catalog -->\n')
    assert.equal(
      run(fixture.root, 'region', 'splice', 'docs/foo.md', '--slug', 'catalog', '--body', 'body.md').status,
      0,
    )
    assert.equal(
      run(fixture.root, 'region', 'splice', 'docs/foo.md', '--slug', 'missing', '--body', 'body.md').status,
      2,
    )
    fixture.write('bad-body.md', '<!-- BEGIN GENERATED x -->\n')
    assert.equal(run(fixture.root, 'region', 'render', '--slug', 'catalog', '--body', 'bad-body.md').status, 2)
  } finally {
    fixture.dispose()
  }
})

test('the region helper reads a body from stdin', () => {
  const fixture = makeFixture()
  try {
    const rendered = runWithInput(fixture.root, 'new', 'region', 'render', '--slug', 'catalog', '--body', '-')
    assert.equal(rendered.status, 0, rendered.output)
    assert.equal(rendered.stdout, '<!-- BEGIN GENERATED catalog -->\nnew\n<!-- END GENERATED catalog -->\n')
    const region = '<!-- BEGIN GENERATED catalog -->\nold\n<!-- END GENERATED catalog -->'
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.\n\n' + region, [zh('指南', '简介。\n\n' + region)])
    const spliced = runWithInput(
      fixture.root,
      'new',
      'region',
      'splice',
      'docs/foo.md',
      '--slug',
      'catalog',
      '--body',
      '-',
    )
    assert.equal(spliced.status, 0, spliced.output)
    assert.match(fixture.read('docs/foo.md'), /<!-- BEGIN GENERATED catalog -->\nnew\n<!-- END GENERATED catalog -->/)
  } finally {
    fixture.dispose()
  }
})

test('a generated source passes with --generated and fails without it', () => {
  const fixture = makeFixture()
  try {
    fixture.write('docs/gen.md', '# Generated\n\nIntro.\n')
    fixture.write('docs/gen.zh.md', '# 生成\n\n[English](gen.md) | 中文\n\n简介。\n')
    assert.equal(writeRecord(fixture, 'docs/gen.md').status, 0)
    assert.equal(run(fixture.root, 'check', 'docs/gen.md', '--target', 'zh=中文').status, 1)
    const check = run(fixture.root, 'check', 'docs/gen.md', '--target', 'zh=中文', '--generated', 'docs/gen.md')
    assert.equal(check.status, 0, check.output)
  } finally {
    fixture.dispose()
  }
})

test('brief maps a prose change and mechanical --apply splices a fence-only change', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro paragraph.', [zh('指南', '简介段落。')])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.commit('pair')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro paragraph.', 'Intro paragraph changed.'))
    const brief = run(fixture.root, 'brief', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(brief.status, 0, brief.output)
    assert.match(brief.stdout, /Intro paragraph changed\./)
    assert.match(brief.stdout, /translate-pair\.mjs write/)
    assert.match(brief.stdout, /--target 'zh=中文'/)
    const proseApply = run(fixture.root, 'brief', 'docs/foo.md', '--target', 'zh=中文', '--apply')
    assert.equal(proseApply.status, 2, proseApply.output)
    const fence = String.fromCharCode(96).repeat(3)
    pair(fixture, 'docs/code.md', 'English', 'Code', fence + ' text\nold value\n' + fence, [
      zh('代码', fence + ' text\nold value\n' + fence),
    ])
    assert.equal(writeRecord(fixture, 'docs/code.md').status, 0)
    fixture.commit('code pair')
    fixture.write('docs/code.md', fixture.read('docs/code.md').replace('old value', 'new value'))
    const apply = run(fixture.root, 'brief', 'docs/code.md', '--target', 'zh=中文', '--apply')
    assert.equal(apply.status, 0, apply.output)
    assert.match(fixture.read('docs/code.zh.md'), /new value/)
    assert.equal(run(fixture.root, 'check', 'docs/code.md', '--target', 'zh=中文').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('brief handles target-to-source, both sides changed, terminology and preconditions', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'The widget runs.', [zh('指南', '部件运行。')])
    terminology(fixture, '| widget | 部件 | | | a component |')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.commit('pair')
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('部件运行。', '部件现在运行。'))
    const toSource = run(fixture.root, 'brief', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(toSource.status, 0, toSource.output)
    assert.match(toSource.stdout, /target-to-source|side changed/)
    fixture.commit('counterpart change')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('The widget runs.', 'The widget runs fast.'))
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('部件现在运行。', '部件现在快速运行。'))
    const both = run(fixture.root, 'brief', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(both.status, 0, both.output)
    assert.match(both.stdout, /BOTH sides changed/)
    fixture.remove('.agents/dsh-spec-translate-docs/terminology.md')
    pair(fixture, 'docs/no-table.md', 'English', 'No table', 'Intro.', [zh('无表', '简介。')])
    assert.equal(writeRecord(fixture, 'docs/no-table.md').status, 0)
    fixture.commit('no table')
    fixture.write('docs/no-table.md', fixture.read('docs/no-table.md').replace('Intro.', 'Intro changed.'))
    const missingTable = run(fixture.root, 'brief', 'docs/no-table.md', '--target', 'zh=中文')
    assert.equal(missingTable.status, 2, missingTable.output)
    assert.match(missingTable.output, /terminology table missing/)
  } finally {
    fixture.dispose()
  }
})

test('a pair-less brief finds drifted pairs and aligned region regeneration says nothing', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    pair(fixture, 'docs/bar.md', 'English', 'Bar', 'Body.', [zh('栏', '正文。')])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/bar.md').status, 0)
    fixture.commit('pairs')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro.', 'Intro changed.'))
    const all = run(fixture.root, 'brief', '--target', 'zh=中文')
    assert.equal(all.status, 0, all.output)
    assert.match(all.stdout, /docs\/foo\.md/)
    assert.doesNotMatch(all.stdout, /docs\/bar\.md/)
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro changed.', 'Intro.'))
    fixture.commit('restore foo')
    const region = '<!-- BEGIN GENERATED catalog -->\nold\n<!-- END GENERATED catalog -->'
    pair(fixture, 'docs/reg.md', 'English', 'Region', 'Intro.\n\n' + region, [zh('区域', '简介。\n\n' + region)])
    assert.equal(writeRecord(fixture, 'docs/reg.md').status, 0)
    fixture.commit('region')
    fixture.write('docs/reg.md', fixture.read('docs/reg.md').replace('old', 'new'))
    fixture.write('docs/reg.zh.md', fixture.read('docs/reg.zh.md').replace('old', 'new'))
    const aligned = run(fixture.root, 'brief', '--target', 'zh=中文')
    assert.equal(aligned.status, 0, aligned.output)
    assert.match(aligned.output, /nothing to brief/)
    assert.equal(run(fixture.root, 'check', 'docs/reg.md', '--target', 'zh=中文').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('a pair-less brief reports pairs it cannot brief instead of declaring them consistent', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    pair(fixture, 'docs/bar.md', 'English', 'Bar', 'Body.', [zh('栏', '正文。')])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/bar.md').status, 0)
    // foo's confirmed state is unrecoverable: nothing is committed, and the record no longer matches the edited pair.
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro.', 'Intro changed.'))
    // bar's record is malformed.
    fixture.write('docs/bar.i18n.yaml', 'not a pairing record\n')
    const all = run(fixture.root, 'brief', '--target', 'zh=中文')
    assert.equal(all.status, 2, all.output)
    assert.match(all.stderr, /no recoverable last-confirmed commit/)
    assert.match(all.stderr, /malformed consistency record/)
    assert.doesNotMatch(all.stdout, /every recorded pair matches/)
  } finally {
    fixture.dispose()
  }
})

test('a pair-less brief emits briefable pairs and reports skipped ones with exit 2', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/good.md', 'English', 'Good', 'Intro.', [zh('好', '简介。')])
    pair(fixture, 'docs/bad.md', 'English', 'Bad', 'Body.', [zh('坏', '正文。')])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/good.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/bad.md').status, 0)
    fixture.commit('pairs')
    fixture.write('docs/good.md', fixture.read('docs/good.md').replace('Intro.', 'Intro changed.'))
    fixture.write('docs/bad.i18n.yaml', 'not a pairing record\n')
    const all = run(fixture.root, 'brief', '--target', 'zh=中文')
    assert.equal(all.status, 2, all.output)
    assert.match(all.stdout, /docs\/good\.md/)
    assert.match(all.stdout, /Intro changed\./)
    assert.match(all.stderr, /docs\/bad\.i18n\.yaml/)
    assert.match(all.stderr, /malformed consistency record/)
    assert.match(all.stderr, /could not be briefed/)
  } finally {
    fixture.dispose()
  }
})

test('--apply with a skipped pair stays atomic and writes nothing', () => {
  const fixture = makeFixture()
  try {
    const fence = String.fromCharCode(96).repeat(3)
    pair(fixture, 'docs/code.md', 'English', 'Code', fence + '\ntext\nold value\n' + fence, [
      zh('代码', fence + '\ntext\nold value\n' + fence),
    ])
    pair(fixture, 'docs/bad.md', 'English', 'Bad', 'Body.', [zh('坏', '正文。')])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/code.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/bad.md').status, 0)
    fixture.commit('pairs')
    fixture.write('docs/code.md', fixture.read('docs/code.md').replace('old value', 'new value'))
    fixture.write('docs/bad.i18n.yaml', 'not a pairing record\n')
    const counterpart = fixture.read('docs/code.zh.md')
    const blocked = run(fixture.root, 'brief', '--apply', '--target', 'zh=中文')
    assert.equal(blocked.status, 2, blocked.output)
    assert.equal(blocked.stdout, '')
    assert.match(blocked.stderr, /malformed consistency record/)
    assert.match(blocked.stderr, /--apply wrote nothing/)
    assert.equal(fixture.read('docs/code.zh.md'), counterpart)
    fixture.remove('docs/bad.md')
    fixture.remove('docs/bad.zh.md')
    fixture.remove('docs/bad.i18n.yaml')
    const applied = run(fixture.root, 'brief', '--apply', '--target', 'zh=中文')
    assert.equal(applied.status, 0, applied.output)
    assert.match(fixture.read('docs/code.zh.md'), /new value/)
    assert.equal(run(fixture.root, 'check', 'docs/code.md', '--target', 'zh=中文').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('write naming a pair that does not exist exits 2', () => {
  const fixture = makeFixture()
  try {
    assert.equal(run(fixture.root, 'write', 'docs/missing.md').status, 2)
    assert.equal(run(fixture.root, 'write', 'docs/missing.md', '--target', 'zh=中文').status, 2)
  } finally {
    fixture.dispose()
  }
})

test('a named argument that selects no pair fails even beside a valid one', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/good.md', 'English', 'Good', 'Intro.', [zh('好', '简介。')])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/good.md').status, 0)
    fixture.commit('pair')
    assert.equal(run(fixture.root, 'check', 'docs/missing.md', 'docs/good.md').status, 2)
    assert.equal(run(fixture.root, 'write', 'docs/missing.md', 'docs/good.md').status, 2)
    fixture.write('docs/good.md', fixture.read('docs/good.md').replace('Intro.', 'Intro changed.'))
    const brief = run(fixture.root, 'brief', 'docs/missing.md', 'docs/good.md')
    assert.equal(brief.status, 2)
    assert.equal(brief.stdout, '')
    assert.match(brief.stderr, /brief selected no existing pair/)
  } finally {
    fixture.dispose()
  }
})

test('hidden and vendored trees follow the default prune list', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, '.agents/notes/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    pair(fixture, 'submodules/module/x.md', 'English', 'Sub', 'Intro.', [zh('子', '简介。')])
    pair(fixture, 'node_modules/x/n.md', 'English', 'Dep', 'Intro.', [zh('依赖', '简介。')])
    pair(fixture, '.agents/skills/s.md', 'English', 'Skill', 'Intro.', [zh('技能', '简介。')])
    for (const source of ['.agents/notes/foo.md', 'docs/foo.md', 'submodules/module/x.md']) {
      assert.equal(writeRecord(fixture, source).status, 0)
    }
    const list = run(fixture.root, 'list')
    assert.equal(list.status, 0, list.output)
    assert.match(list.stdout, /\.agents\/notes\/foo\.md/)
    assert.match(list.stdout, /docs\/foo\.md/)
    assert.match(list.stdout, /submodules\/module\/x\.md/)
    assert.doesNotMatch(list.stdout, /node_modules/)
    assert.doesNotMatch(list.stdout, /\.agents\/skills/)
  } finally {
    fixture.dispose()
  }
})

test('--root resolves the repository from any working directory', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.commit('pair')
    const listed = run(REPO_ROOT, 'list', '--root', fixture.root)
    assert.equal(listed.status, 0, listed.output)
    assert.match(listed.stdout, /ok +docs\/foo\.md \[zh\]/)
    const checked = run(REPO_ROOT, 'check', 'docs/foo.md', '--target', 'zh=中文', '--root', fixture.root)
    assert.equal(checked.status, 0, checked.output)
    assert.match(checked.output, /1 pair\(s\) consistent/)
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro.', 'Intro changed.'))
    const brief = run(REPO_ROOT, 'brief', 'docs/foo.md', '--target', 'zh=中文', '--root', fixture.root)
    assert.equal(brief.status, 0, brief.output)
    // Commands printed by the briefing repeat --root so they run from the caller's directory.
    assert.ok(brief.stdout.includes('--root ' + "'" + fixture.root + "'"), brief.stdout)
  } finally {
    fixture.dispose()
  }
})

test('CLI failure modes: legacy flags, malformed targets, write modes and source language', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    assert.equal(run(fixture.root, 'list', '--scope', 'docs/**').status, 2)
    assert.equal(run(fixture.root, 'list', '--exclude', 'docs/**').status, 2)
    assert.equal(run(fixture.root, 'list', '--target', 'ja').status, 2)
    assert.equal(run(fixture.root, 'write', '--all').status, 0)
    assert.equal(run(fixture.root, 'write', 'docs/foo.md', '--apply').status, 2)
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--source-lang', 'en=English').status, 2)
    assert.equal(run(fixture.root, 'list', '--unknown').status, 2)
    assert.equal(run(fixture.root, 'nonsense').status, 2)
    assert.equal(run(fixture.root, 'write', 'docs/missing.md', '--target', 'zh=中文').status, 2)
    assert.equal(run(fixture.root, 'write', 'docs/foo.md', '--target', 'zh=中文').status, 0)
    assert.equal(
      run(fixture.root, 'write', 'docs/foo.md', '--source-lang', 'fr=Français', '--target', 'zh=中文').status,
      2,
    )
  } finally {
    fixture.dispose()
  }
})

test('the shipped description and style references reflect the declared design', () => {
  const workDraft = join(REPO_ROOT, '.agents/dsh-spec-skill-forge/dsh-spec-translate-docs')
  const skillDir = existsSync(join(workDraft, 'SKILL.md'))
    ? workDraft
    : join(REPO_ROOT, 'skills/dsh-spec-translate-docs')
  const skill = readFileSync(join(skillDir, 'SKILL.md'), 'utf8')
  assert.match(skill, /多语言|multi-language|target languages/)
  assert.match(skill, /Markdown/)
  assert.doesNotMatch(skill, /## The project's declaration/)
  assert.match(skill, /parameter-driven/)
  assert.ok(!existsSync(join(skillDir, 'references/style-guide.md')))
  assert.ok(existsSync(join(skillDir, 'references/style-examples.md')))
  const rules = readFileSync(join(skillDir, 'references/translation-rules.md'), 'utf8')
  assert.match(rules, /outrank/)
  assert.match(rules, /when available, use the `dsh-spec-prose-standard` skill/)
})

test('the default style examples carry upstream sample text and provenance lives in notices', () => {
  const workDraft = join(REPO_ROOT, '.agents/dsh-spec-skill-forge/dsh-spec-translate-docs')
  const skillDir = existsSync(join(workDraft, 'SKILL.md'))
    ? workDraft
    : join(REPO_ROOT, 'skills/dsh-spec-translate-docs')
  const examples = readFileSync(join(skillDir, 'references/style-examples.md'), 'utf8')
  assert.match(examples, /DeepSeek Harness/)
  assert.match(examples, /本文介绍/)
  assert.match(examples, /误报／/)
  assert.match(examples, /bilingual from birth/)
  assert.match(examples, /grandfathered/)
  assert.match(examples, /cookbook/)
  assert.match(examples, /## Defensive pattern rules/)
  assert.match(examples, /## Testing policy/)
  assert.match(examples, /## Long-paragraph split/)
  assert.match(examples, /Rewriting natively is not deletion/)
  assert.match(examples, /code identifiers/)
  assert.match(examples, /binding priority is in \[translation rules\]/)
  assert.match(examples, /Default voice is technical documentation/)
  assert.doesNotMatch(examples, /complete predication/)
  assert.doesNotMatch(examples, /THIRD_PARTY_NOTICES/)
  const notices = readFileSync(join(skillDir, 'THIRD_PARTY_NOTICES'), 'utf8')
  assert.match(notices, /style-examples\.md/)
})

test('a one-sided generated region fails check and brief, and list reports it', () => {
  const fixture = makeFixture()
  try {
    const region = '<!-- BEGIN GENERATED catalog -->\nold\n<!-- END GENERATED catalog -->'
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.\n\n' + region, [zh('指南', '简介。\n\n' + region)])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.commit('pair')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('old', 'new'))
    const list = run(fixture.root, 'list')
    assert.equal(list.status, 0, list.output)
    assert.match(list.stdout, /out-of-sync +docs\/foo\.md \[zh\]/)
    const named = run(fixture.root, 'brief', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(named.status, 2, named.output)
    const all = run(fixture.root, 'brief', '--target', 'zh=中文')
    assert.equal(all.status, 2, all.output)
    assert.match(all.output, /regenerate both sides/)
  } finally {
    fixture.dispose()
  }
})

test('write --all records every complete existing pair and skips an incomplete one', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    pair(fixture, 'docs/bar.md', 'English', 'Bar', 'Body.', [zh('栏', '正文。')])
    fixture.write('docs/half.md', '# Half\n\nEnglish | [中文](half.zh.md)\n\nBody.\n')
    const write = run(fixture.root, 'write', '--all')
    assert.equal(write.status, 0, write.output)
    assert.match(write.output, /2 record\(s\) written/)
    assert.ok(existsSync(join(fixture.root, 'docs/foo.i18n.yaml')))
    assert.ok(existsSync(join(fixture.root, 'docs/bar.i18n.yaml')))
    assert.ok(!existsSync(join(fixture.root, 'docs/half.i18n.yaml')))
  } finally {
    fixture.dispose()
  }
})

test('an aggregate record missing the selected target entry is incomplete', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh(), target('ja', '日本語', 'ガイド', 'はじめに。')])
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'zh=中文').status, 0)
    const record = fixture.read('docs/foo.i18n.yaml')
    fixture.write('docs/foo.i18n.yaml', record.replace(/\n  ja: [0-9a-f]{16}/g, ''))
    const check = run(fixture.root, 'check', 'docs/foo.md', '--target', 'ja=日本語')
    assert.equal(check.status, 1, check.output)
    assert.match(check.output, /unconfirmed translated content for ja|no recorded ja signature/)
  } finally {
    fixture.dispose()
  }
})

test('a source edit recorded for one target leaves the other target out of sync', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [
      zh('指南', '简介。'),
      target('ja', '日本語', 'ガイド', 'はじめに。'),
    ])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'ja=日本語').status, 0)
    fixture.commit('pair')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro.', 'Intro changed.'))
    fixture.write('docs/foo.ja.md', fixture.read('docs/foo.ja.md').replace('はじめに。', 'はじめに changed。'))
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'ja=日本語').status, 0)
    const zhCheck = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(zhCheck.status, 1, zhCheck.output)
    assert.match(zhCheck.output, /changed since confirmation/)
    const jaCheck = run(fixture.root, 'check', 'docs/foo.md', '--target', 'ja=日本語')
    assert.equal(jaCheck.status, 0, jaCheck.output)
  } finally {
    fixture.dispose()
  }
})

test('write --all drops a target whose counterpart was deleted', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [
      zh('指南', '简介。'),
      target('ja', '日本語', 'ガイド', 'はじめに。'),
    ])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'ja=日本語').status, 0)
    fixture.remove('docs/foo.ja.md')
    fixture.write(
      'docs/foo.md',
      fixture
        .read('docs/foo.md')
        .replace('English | [日本語](foo.ja.md) | [中文](foo.zh.md)', 'English | [中文](foo.zh.md)'),
    )
    const write = run(fixture.root, 'write', '--all', '--select', 'docs/foo.md')
    assert.equal(write.status, 0, write.output)
    const record = fixture.read('docs/foo.i18n.yaml')
    assert.doesNotMatch(record, /ja:/)
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('a BEGIN trailing note and a region before the first heading follow shell A and anchor 0', () => {
  const fixture = makeFixture()
  try {
    const region = '<!-- BEGIN GENERATED catalog note for readers -->\nold\n<!-- END GENERATED catalog -->'
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.\n\n' + region, [zh('指南', '简介。\n\n' + region)])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文').status, 0)
    const counterpart = fixture.read('docs/foo.zh.md')
    const start = counterpart.indexOf('<!-- BEGIN GENERATED catalog')
    const end = counterpart.indexOf('<!-- END GENERATED catalog -->') + '<!-- END GENERATED catalog -->'.length
    const withoutRegion = counterpart.slice(0, start) + counterpart.slice(end)
    fixture.write('docs/foo.zh.md', counterpart.slice(start, end) + '\n\n' + withoutRegion.replace(/\n\n\n+/g, '\n\n'))
    const moved = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(moved.status, 1, moved.output)
    assert.match(moved.output, /different authored section/)
  } finally {
    fixture.dispose()
  }
})

test('named arguments select the documented aggregate sets', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh(), target('ja', '日本語', 'ガイド', 'はじめに。')])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'ja=日本語').status, 0)
    const counterpart = run(fixture.root, 'check', 'docs/foo.zh.md')
    assert.equal(counterpart.status, 0, counterpart.output)
    assert.match(counterpart.output, /1 pair\(s\) consistent/)
    const record = run(fixture.root, 'check', 'docs/foo.i18n.yaml')
    assert.equal(record.status, 0, record.output)
    assert.match(record.output, /2 pair\(s\) consistent/)
    const stem = run(fixture.root, 'check', 'docs/foo')
    assert.equal(stem.status, 0, stem.output)
    assert.match(stem.output, /2 pair\(s\) consistent/)
    const narrowed = run(fixture.root, 'check', 'docs/foo.i18n.yaml', '--target', 'zh=中文')
    assert.equal(narrowed.status, 0, narrowed.output)
    assert.match(narrowed.output, /1 pair\(s\) consistent/)
  } finally {
    fixture.dispose()
  }
})

test('list names one pair in source, counterpart, record and stem form', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    pair(fixture, 'docs/bar.md', 'English', 'Bar', 'Body.', [zh('栏', '正文。')])
    pair(fixture, 'docs/bare.md', 'English', 'Bare', 'Body.', [zh('裸', '正文。')])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/bar.md').status, 0)
    for (const argument of ['docs/foo.md', 'docs/foo.zh.md', 'docs/foo.i18n.yaml', 'docs/foo']) {
      const listed = run(fixture.root, 'list', argument)
      assert.equal(listed.status, 0, listed.output)
      assert.match(listed.stdout, /ok +docs\/foo\.md \[zh\]/, argument)
      assert.doesNotMatch(listed.stdout, /docs\/bar\.md/, argument)
      assert.match(listed.stdout, /1 ok, 0 out-of-sync, 0 missing/, argument)
    }
    const unrecorded = run(fixture.root, 'list', 'docs/bare.md')
    assert.equal(unrecorded.status, 0, unrecorded.output)
    assert.match(unrecorded.stdout, /missing +docs\/bare\.md \[zh\]/)
    assert.match(unrecorded.stdout, /0 ok, 0 out-of-sync, 1 missing/)
  } finally {
    fixture.dispose()
  }
})

test('a named source does not inherit a target from a sibling counterpart', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/bar.md', 'English', 'Bar', 'Body.', [zh('栏', '正文。')])
    assert.equal(writeRecord(fixture, 'docs/bar.md').status, 0)
    fixture.write('docs/foo.md', '# Guide\n\nIntro.\n')
    const named = run(fixture.root, 'check', 'docs/foo.md')
    assert.equal(named.status, 2, named.output)
    assert.match(named.output, /no existing pair/)
    assert.match(named.output, /--target <lang>/)
    const listed = run(fixture.root, 'list', 'docs/foo.md')
    assert.equal(listed.status, 0, listed.output)
    assert.match(listed.stdout, /0 ok, 0 out-of-sync, 0 missing/)
    assert.match(listed.stderr, /--target <lang>/)
  } finally {
    fixture.dispose()
  }
})

test('dropping the last target removes the record and leaves no pair', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.remove('docs/foo.zh.md')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('English | [中文](foo.zh.md)\n\n', ''))
    const write = run(fixture.root, 'write', '--all', '--select', 'docs/foo.md')
    assert.equal(write.status, 0, write.output)
    assert.ok(!existsSync(join(fixture.root, 'docs/foo.i18n.yaml')))
    const list = run(fixture.root, 'list')
    assert.equal(list.status, 0, list.output)
    assert.doesNotMatch(list.stdout, /docs\/foo\.md/)
  } finally {
    fixture.dispose()
  }
})

test('region grammar rejects duplicate, unclosed and whitespace variants while fences stay ordinary code', () => {
  const fixture = makeFixture()
  try {
    const fenced =
      String.fromCharCode(96).repeat(3) +
      'markdown\n<!-- BEGIN GENERATED a -->\n<!-- END GENERATED a -->\n' +
      String.fromCharCode(96).repeat(3)
    pair(fixture, 'docs/ok.md', 'English', 'Guide', 'Intro.\n\n' + fenced, [zh('指南', '简介。\n\n' + fenced)])
    assert.equal(writeRecord(fixture, 'docs/ok.md').status, 0)
    assert.equal(run(fixture.root, 'check', 'docs/ok.md', '--target', 'zh=中文').status, 0)
    const cases: [string, RegExp][] = [
      [
        '<!-- BEGIN GENERATED a -->\nx\n<!-- END GENERATED a -->\n\n<!-- BEGIN GENERATED a -->\ny\n<!-- END GENERATED a -->',
        /duplicate/,
      ],
      ['<!-- BEGIN GENERATED a -->\nx\n', /BEGIN without an END/],
      [' <!-- BEGIN GENERATED a -->\nx\n<!-- END GENERATED a -->', /generated-region marker/],
      ['\t<!-- BEGIN GENERATED a -->\nx\n<!-- END GENERATED a -->', /generated-region marker/],
    ]
    for (const [suffix, expected] of cases) {
      fixture.write('docs/bad.md', '# Bad\n\nEnglish | [中文](bad.zh.md)\n\nIntro.\n\n' + suffix + '\n')
      fixture.write('docs/bad.zh.md', '# 坏\n\n[English](bad.md) | 中文\n\n简介。\n')
      fixture.write('docs/bad.i18n.yaml', fixture.read('docs/ok.i18n.yaml'))
      const check = run(fixture.root, 'check', 'docs/bad.md', '--target', 'zh=中文')
      assert.equal(check.status, 1, check.output)
      assert.match(check.output, expected)
    }
  } finally {
    fixture.dispose()
  }
})

test('write --all replaces an old flat record during migration', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    fixture.write('docs/foo.i18n.yaml', '/guide:\n  en: 0123456789abcdef\n  zh: fedcba9876543210\n')
    const write = run(fixture.root, 'write', '--all', '--select', 'docs/foo.md')
    assert.equal(write.status, 0, write.output)
    assert.match(fixture.read('docs/foo.i18n.yaml'), /^  zh: [0-9a-f]{16}$/m)
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('record section order follows the document and a reordered record fails', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro.', 'Intro.\n\n## Usage\n\nBody.'))
    fixture.write(
      'docs/foo.zh.md',
      fixture.read('docs/foo.zh.md').replace('简介段落。', '简介段落。\n\n## 使用\n\n正文。'),
    )
    const write = writeRecord(fixture, 'docs/foo.md')
    assert.equal(write.status, 0, write.output)
    const record = fixture.read('docs/foo.i18n.yaml')
    const guide = record.slice(record.indexOf('/guide:'), record.indexOf('/guide/usage:'))
    const usage = record.slice(record.indexOf('/guide/usage:'))
    fixture.write('docs/foo.i18n.yaml', record.slice(0, record.indexOf('/guide:')) + usage + guide.trimEnd() + '\n')
    const check = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(check.status, 1, check.output)
    assert.match(check.output, /not in canonical form/)
  } finally {
    fixture.dispose()
  }
})

test('a bare --source-lang code records that source language', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/fr.md', 'Français', 'Guide', 'Bonjour.', [zh('指南', '简介。')])
    const write = run(fixture.root, 'write', 'docs/fr.md', '--source-lang', 'fr', '--target', 'zh=中文')
    assert.equal(write.status, 0, write.output)
    assert.match(fixture.read('docs/fr.i18n.yaml'), /^  fr: [0-9a-f]{16}$/m)
    assert.equal(run(fixture.root, 'check', 'docs/fr.md', '--target', 'zh=中文').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('region splice preserves a BEGIN trailing note', () => {
  const fixture = makeFixture()
  try {
    const region = '<!-- BEGIN GENERATED catalog note for readers -->\nold\n<!-- END GENERATED catalog -->'
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.\n\n' + region, [zh('指南', '简介。\n\n' + region)])
    fixture.write('body.md', 'new\n')
    assert.equal(
      run(fixture.root, 'region', 'splice', 'docs/foo.md', '--slug', 'catalog', '--body', 'body.md').status,
      0,
    )
    assert.match(fixture.read('docs/foo.md'), /<!-- BEGIN GENERATED catalog note for readers -->/)
  } finally {
    fixture.dispose()
  }
})

test('the briefing rules name the style guidance and examples', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    terminology(fixture, '')
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.commit('pair')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro.', 'Intro changed.'))
    const brief = run(fixture.root, 'brief', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(brief.status, 0, brief.output)
    assert.match(brief.stdout, /style-examples\.md/)
  } finally {
    fixture.dispose()
  }
})

test('remaining documented failure exits are pinned', () => {
  const fixture = makeFixture()
  try {
    assert.equal(run(fixture.root, 'brief').status, 2)
    assert.equal(run(fixture.root, 'write').status, 2)
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [zh()])
    fixture.write('docs/foo.i18n.yaml', 'not a record\n')
    assert.equal(run(fixture.root, 'write', 'docs/foo.md', '--target', 'zh=中文').status, 2)
    fixture.remove('docs/foo.zh.md')
    assert.equal(run(fixture.root, 'write', 'docs/foo.md', '--target', 'zh=中文').status, 2)
    assert.equal(run(fixture.root, 'list', '--generated', '[').status, 2)
  } finally {
    fixture.dispose()
  }
})

test('write renders existing aggregate records in current document section order', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.\n\n## Alpha\n\nA.\n\n## Beta\n\nB.', [
      zh('指南', '简介。\n\n## 甲\n\n甲。\n\n## 乙\n\n乙。'),
    ])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('## Beta', '## Gamma\n\nG.\n\n## Beta'))
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('## 乙', '## 丙\n\n丙。\n\n## 乙'))
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const check = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(check.status, 0, check.output)
    const record = fixture.read('docs/foo.i18n.yaml')
    assert.ok(record.indexOf('/guide/alpha:') < record.indexOf('/guide/gamma:'))
    assert.ok(record.indexOf('/guide/gamma:') < record.indexOf('/guide/beta:'))
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('## Beta', '## Delta\n\nD.\n\n## Beta'))
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('## 乙', '## 丁\n\n丁。\n\n## 乙'))
    assert.equal(run(fixture.root, 'write', '--all', '--select', 'docs/foo.md').status, 0)
    const after = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(after.status, 0, after.output)
    const updated = fixture.read('docs/foo.i18n.yaml')
    assert.ok(updated.indexOf('/guide/gamma:') < updated.indexOf('/guide/delta:'))
    assert.ok(updated.indexOf('/guide/delta:') < updated.indexOf('/guide/beta:'))
  } finally {
    fixture.dispose()
  }
})

test('selection does not change link normalization and a fenced sample inside a region is ordinary code', () => {
  const fixture = makeFixture()
  try {
    const fence = String.fromCharCode(96).repeat(3)
    const body =
      'See [other](other.md).\n\n<!-- BEGIN GENERATED catalog -->\n' +
      fence +
      'markdown\n<!-- BEGIN GENERATED a -->\n<!-- END GENERATED a -->\n' +
      fence +
      '\n<!-- END GENERATED catalog -->'
    pair(fixture, 'docs/foo.md', 'English', 'Guide', body, [
      zh(
        '指南',
        '见 [other](other.zh.md)。\n\n<!-- BEGIN GENERATED catalog -->\n' +
          fence +
          'markdown\n<!-- BEGIN GENERATED a -->\n<!-- END GENERATED a -->\n' +
          fence +
          '\n<!-- END GENERATED catalog -->',
      ),
    ])
    pair(fixture, 'docs/other.md', 'English', 'Other', 'Body.', [zh('其他', '正文。')])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/other.md').status, 0)
    const check = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文', '--skip', 'docs/other.md')
    assert.equal(check.status, 0, check.output)
    fixture.write(
      'docs/foo.md',
      fixture
        .read('docs/foo.md')
        .replace('.\n\n<!-- BEGIN GENERATED catalog -->', '.\n<!-- BEGIN GENERATED catalog -->'),
    )
    const adjacent = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(adjacent.status, 1, adjacent.output)
    assert.match(adjacent.output, /own block|marker/)
  } finally {
    fixture.dispose()
  }
})

test('a terminology path override reaches the briefing', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'The widget runs.', [zh('指南', '部件运行。')])
    fixture.write(
      'custom/terms.md',
      '| English | 中文 | First occurrence | Forbidden renderings | Note |\n|---|---|---|---|---|\n| widget | 部件 | | | a component |\n',
    )
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    fixture.commit('pair')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('The widget runs.', 'The widget runs fast.'))
    const brief = run(
      fixture.root,
      'brief',
      'docs/foo.md',
      '--target',
      'zh=中文',
      '--terminology',
      'zh=custom/terms.md',
    )
    assert.equal(brief.status, 0, brief.output)
    assert.match(brief.stdout, /widget/)
  } finally {
    fixture.dispose()
  }
})

test('the target signature is the documented hash and duplicate headings get counters', () => {
  assert.equal(bindTarget('0123456789abcdef', 'fedcba9876543210'), 'f46549101424db27')
  const fixture = makeFixture()
  try {
    const source = 'Intro.\n\n## Same\n\nA.\n\n## Same\n\nB.'
    const zhBody = '简介。\n\n## 同\n\n甲。\n\n## 同\n\n乙。'
    const jaBody = 'はじめに。\n\n## 同\n\n甲。\n\n## 同\n\n乙。'
    pair(fixture, 'docs/foo.md', 'English', 'Guide', source, [
      zh('指南', zhBody),
      target('ja', '日本語', 'ガイド', jaBody),
    ])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'ja=日本語').status, 0)
    const record = fixture.read('docs/foo.i18n.yaml')
    assert.match(record, /^\/guide\/same:$/m)
    assert.match(record, /^\/guide\/same~2:$/m)
    assert.ok(record.indexOf('  ja:') < record.indexOf('  zh:'))
    assert.equal(run(fixture.root, 'check', 'docs/foo.md').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('sequential per-target writes converge without confirming untouched targets', () => {
  const fixture = makeFixture()
  try {
    pair(fixture, 'docs/foo.md', 'English', 'Guide', 'Intro.', [
      zh('指南', '简介。'),
      target('ja', '日本語', 'ガイド', 'はじめに。'),
    ])
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'ja=日本語').status, 0)
    fixture.commit('pair')
    fixture.write('docs/foo.md', fixture.read('docs/foo.md').replace('Intro.', 'Intro changed.'))
    fixture.write('docs/foo.zh.md', fixture.read('docs/foo.zh.md').replace('简介。', '简介已改。'))
    assert.equal(writeRecord(fixture, 'docs/foo.md').status, 0)
    const zhCheck = run(fixture.root, 'check', 'docs/foo.md', '--target', 'zh=中文')
    assert.equal(zhCheck.status, 0, zhCheck.output)
    const jaBefore = run(fixture.root, 'check', 'docs/foo.md', '--target', 'ja=日本語')
    assert.equal(jaBefore.status, 1, jaBefore.output)
    const afterZh = fixture.read('docs/foo.i18n.yaml')
    const sourceLine = afterZh.match(/^  en: ([0-9a-f]{16})$/m)?.[1]
    const zhLine = afterZh.match(/^  zh: [0-9a-f]{16}$/m)?.[0]
    fixture.write('docs/foo.ja.md', fixture.read('docs/foo.ja.md').replace('はじめに。', 'はじめに変更。'))
    assert.equal(writeRecord(fixture, 'docs/foo.md', 'ja=日本語').status, 0)
    assert.equal(run(fixture.root, 'check', 'docs/foo.md', '--target', 'ja=日本語').status, 0)
    const afterJa = fixture.read('docs/foo.i18n.yaml')
    assert.equal(afterJa.match(/^  en: ([0-9a-f]{16})$/m)?.[1], sourceLine)
    assert.equal(afterJa.match(/^  zh: [0-9a-f]{16}$/m)?.[0], zhLine)
    assert.equal(run(fixture.root, 'check', 'docs/foo.md').status, 0)
  } finally {
    fixture.dispose()
  }
})

test('the corpus derives recognized targets and existing artifacts from files and records', () => {
  const fixture = makeFixture()
  try {
    fixture.write('docs/guide.md', '# Guide\n\nIntro.\n')
    fixture.write('docs/guide.zh.md', '# 指南\n\n简介。\n')
    fixture.write('docs/guide.ja.md', '# ガイド\n\nはじめに。\n')
    fixture.write('docs/note.md', '# Note\n\nBody.\n')
    fixture.write('docs/note.i18n.yaml', '/note:\n  en: 0123456789abcdef\n  fr: fedcba9876543210\n')
    const corpus = buildCorpus({ root: fixture.root, targets: [{ code: 'zh', name: '中文' }] })
    assert.deepEqual(
      corpus.recognized.map((language) => language.code),
      ['fr', 'ja', 'zh'],
    )
    assert.deepEqual(
      corpus.existingTargets('docs/guide.md').map((language) => language.code),
      ['ja', 'zh'],
    )
    assert.deepEqual(
      corpus.existingTargets('docs/note.md').map((language) => language.code),
      ['fr'],
    )
    assert.equal(corpus.isPaired('docs/guide.zh.md'), true)
    assert.equal(corpus.isPaired('docs/note.md'), true)
    assert.equal(corpus.isPaired('docs/note.i18n.yaml'), false)
    assert.deepEqual(
      discoverPairs(corpus).map((pair) => pair.paths.source + ' [' + pair.paths.target.code + ']'),
      ['docs/guide.md [ja]', 'docs/guide.md [zh]', 'docs/note.md [fr]'],
    )
  } finally {
    fixture.dispose()
  }
})

test('pairLanguages reads the counterpart switcher and prefers a declared target name', () => {
  const paths = pairPaths('docs/guide.md', { code: 'ja', name: 'ja' })
  const counterpart = '# ガイド\n\n[English](guide.md) | にほんご\n\nはじめに。\n'
  const readFile = (path: string): string | undefined => (path === paths.counterpart ? counterpart : undefined)
  const declared = pairLanguages(
    paths,
    { readFile, declared: [{ code: 'ja', name: '日本語' }] } as unknown as PairCorpus,
    'en',
  )
  assert.deepEqual(declared.source, { code: 'en', name: 'English' })
  assert.deepEqual(declared.target, { code: 'ja', name: '日本語' })
  const learned = pairLanguages(paths, { readFile, declared: [] } as unknown as PairCorpus, 'en')
  assert.deepEqual(learned.target, { code: 'ja', name: 'にほんご' })
})

test('locateSwitchers matches a canonical pair and reports a missing source switcher', () => {
  const paths = pairPaths('docs/guide.md', { code: 'zh', name: '中文' })
  const source = '# Guide\n\nEnglish | [中文](guide.zh.md)\n\nIntro.\n'
  const counterpart = '# 指南\n\n[English](guide.md) | 中文\n\n简介。\n'
  const corpus = {
    declared: [{ code: 'zh', name: '中文' }],
    recognized: [{ code: 'zh', name: '中文' }],
    fileExists: (path: string) => path === paths.counterpart,
    readFile: (path: string) => (path === paths.counterpart ? counterpart : undefined),
    isGeneratedSource: () => false,
  } as unknown as PairCorpus
  const matched = locateSwitchers(
    corpus,
    paths,
    source,
    parseMarkdown(source),
    counterpart,
    parseMarkdown(counterpart),
    'en',
    undefined,
  )
  assert.deepEqual(matched.errors, [])
  assert.equal(matched.sourceLabel, 'English')
  assert.equal(matched.targetLabel, '中文')
  assert.equal(matched.sourceOffsets.size, 1)
  assert.equal(matched.counterpartOffsets.size, 1)
  const bare = '# Guide\n\nIntro.\n'
  const missing = locateSwitchers(
    corpus,
    paths,
    bare,
    parseMarkdown(bare),
    counterpart,
    parseMarkdown(counterpart),
    'en',
    undefined,
  )
  assert.match(missing.errors.join('\n'), /missing or non-canonical language switcher/)
  assert.equal(missing.sourceOffsets.size, 0)
  assert.equal(missing.counterpartOffsets.size, 1)
})
