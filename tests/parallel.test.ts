/**
 * Dispatch: bounded parallel execution with a deterministic report.
 *
 * Concurrency must not change a verdict or scramble the record, so the same fixture is dispatched
 * sequentially and through the default pool, and the two reports are compared line for line.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dispatchLines, runCli, selected } from './helpers/cli.ts'
import { makeFixture, writeEmptyArchive, writeNote } from './helpers/fixtures.ts'

test('check --all runs every tree check, in record order', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')
  writeEmptyArchive(fixture)

  const result = runCli(fixture.root, ['check', '--all'])

  assert.equal(result.status, 0, result.output)
  assert.deepEqual(selected(result.output), ['notes', 'notes-archived'])
})

test('concurrency 1 and the default pool report the same verdicts in the same order', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md')
  writeNote(fixture, '2026-01-02-a-second-decision.md', { cls: 'nonsense' })
  writeEmptyArchive(fixture)

  const sequential = runCli(fixture.root, ['check', '--all', '--jobs', '1'])
  const parallel = runCli(fixture.root, ['check', '--all'])

  assert.equal(sequential.status, 1, sequential.output)
  assert.equal(parallel.status, 1, parallel.output)
  assert.deepEqual(dispatchLines(parallel.output), dispatchLines(sequential.output))
})

test('one failing check does not stop the others', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeNote(fixture, '2026-01-01-a-first-decision.md', { cls: 'nonsense' })
  writeEmptyArchive(fixture)

  const result = runCli(fixture.root, ['check', '--all'])

  assert.equal(result.status, 1, result.output)
  assert.equal(dispatchLines(result.output).length, 2, result.output)
  assert.ok(dispatchLines(result.output).some(line => line.verdict === 'FAIL'), result.output)
  assert.ok(dispatchLines(result.output).some(line => line.verdict === 'ok'), result.output)
})
