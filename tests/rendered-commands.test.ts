/**
 * Every command the engine renders is a command the entry point accepts.
 *
 * Three places hand a reader a `node … dsh-spec.ts …` line — the initializer's closing inventory,
 * the consistency record's recovery command, and the briefing's Finish steps — and none of them is
 * the entry point itself, so no grammar test reaches them. The gap is not hypothetical: a spawn in
 * the initializer was built from an argv array carrying an operation flag, every test passed because
 * nothing executed that line, and the first refresh failed on it. A grep cannot close this class,
 * because `'translation-pair', '--write'` in an array does not look like `translation-pair --write`
 * in prose; asking the entry point does.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli, runScript } from './helpers/cli.ts'
import { makeFixture, writePair } from './helpers/fixtures.ts'

/** The tokens a rendered `node …/dsh-spec.ts …` line names, placeholders left in place. */
function renderedCommand(line: string): string[] {
  const match = /dsh-spec\.ts\s+(.*)$/.exec(line)
  assert.ok(match !== null, `no entry point in the rendered line: ${line}`)
  return (match[1] ?? '')
    .split(/\s+/)
    .filter(token => token !== '' && !token.startsWith('<') && !token.startsWith('#'))
}

/** Every rendered entry-point line in some text. */
function renderedLines(text: string): string[] {
  return text.split('\n').map(line => line.trim()).filter(line => line.includes('dsh-spec.ts '))
}

/**
 * Fail unless the entry point answers this command's help.
 *
 * The entry point is the authority on whether its first token takes a verb: a noun's help lists one,
 * a verb's does not. The second token is therefore checked whenever the first is a noun — which is
 * the shape a broken render takes, an operation flag standing where the verb belongs. Asking for
 * help runs nothing, so a rendered command is validated without being executed.
 */
function assertAccepted(root: string, tokens: readonly string[], line: string): void {
  const named = tokens[0] ?? ''
  const one = runCli(root, [named, '--help'])
  assert.equal(one.status, 0, `a rendered command is not one the entry point accepts — ${line}\n${one.output}`)
  if (!/^Verbs:$|^动词:$/m.test(one.output)) return
  const two = runCli(root, [named, tokens[1] ?? '', '--help'])
  assert.equal(two.status, 0, `a rendered command is not one the entry point accepts — ${line}\n${one.output}${two.output}`)
}

test('the initializer prints only commands the entry point accepts', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  // The sync spawns the project's dispatcher; a stub keeps this case about the printed lines.
  fixture.write('.agents/skills/dsh-spec-manager/scripts/dsh-spec.ts', 'process.exit(0)\n')

  const result = runScript('skills/dsh-spec-manager/scripts/init-agents-md.ts', ['--root', fixture.root, '--write'])

  assert.equal(result.status, 0, result.output)
  const lines = renderedLines(result.output)
  assert.ok(lines.length >= 5, `the inventory printed no command:\n${result.output}`)
  for (const line of lines) assertAccepted(fixture.root, renderedCommand(line), line)
})

test('the record and the briefing render only commands the entry point accepts', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  fixture.write('docs/terminology.md', '# Vocabulary\n\n| English | 中文 | 首次出现 | 不要译作 | 备注 |\n|---|---|---|---|---|\n')
  writePair(fixture, 'docs/guide.md')
  fixture.commit('add the pair')

  const written = runCli(fixture.root, ['translation-pair', 'write', 'docs/guide.md'])
  assert.equal(written.status, 0, written.output)
  const record = renderedLines(fixture.read('docs/guide.i18n.yaml'))
  assert.equal(record.length, 1, `the record carries no recovery command:\n${fixture.read('docs/guide.i18n.yaml')}`)
  for (const line of record) assertAccepted(fixture.root, renderedCommand(line), line)

  fixture.write('docs/guide.md', '# Guide\n\nEnglish | [中文](guide.zh.md)\n\nA new sentence.\n')
  const brief = runCli(fixture.root, ['translation-pair', 'brief', 'docs/guide.md'])

  assert.equal(brief.status, 0, brief.output)
  const steps = renderedLines(brief.output)
  assert.ok(steps.length >= 2, `the briefing rendered no step:\n${brief.output}`)
  for (const line of steps) assertAccepted(fixture.root, renderedCommand(line), line)
})
