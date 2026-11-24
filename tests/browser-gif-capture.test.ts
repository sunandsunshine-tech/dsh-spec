import assert from 'node:assert/strict'
import { spawnSync, type SpawnSyncReturns } from 'node:child_process'
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { test, type TestContext } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'

const FIXTURE = join(REPO_ROOT, 'tests/skill-evals/dsh-spec-record-browser-gif/evals/files/shared-gif-project')
const FAKE_CHROME = join(REPO_ROOT, 'tests/helpers/fake-cdp-chrome.mjs')

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", `'\\''`)}'`
}

function prepareFixture(t: TestContext): {
  root: string
  profiles: string
  chrome: string
  browserPidFile: string
  childPidFile: string
} {
  const root = mkdtempSync(join(tmpdir(), 'browser-gif-capture-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  cpSync(FIXTURE, root, { recursive: true })
  const build = spawnSync(process.execPath, ['build.mjs'], { cwd: root, encoding: 'utf8' })
  assert.equal(build.status, 0, (build.stdout ?? '') + (build.stderr ?? ''))

  const profiles = join(root, 'profiles')
  mkdirSync(profiles)
  const chrome = join(root, 'fake-chrome')
  writeFileSync(chrome, `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(FAKE_CHROME)} "$@"\n`)
  chmodSync(chrome, 0o755)
  return {
    root,
    profiles,
    chrome,
    browserPidFile: join(root, 'browser.pid'),
    childPidFile: join(root, 'browser-child.pid'),
  }
}

function supportsProcessGroups(t: TestContext): boolean {
  if (process.platform !== 'win32') return true
  t.skip('the process-tree assertions use POSIX process groups')
  return false
}

function runCapture(
  fixture: ReturnType<typeof prepareFixture>,
  mode: string,
  deadlineMs: number,
): { result: SpawnSyncReturns<string>; elapsedMs: number } {
  const started = Date.now()
  const result = spawnSync(process.execPath, ['capture-browser.mjs'], {
    cwd: fixture.root,
    env: {
      ...process.env,
      CAPTURE_DEADLINE_MS: String(deadlineMs),
      CHROME_PATH: fixture.chrome,
      FAKE_CDP_BROWSER_PID_FILE: fixture.browserPidFile,
      FAKE_CDP_CHILD_PID_FILE: fixture.childPidFile,
      FAKE_CDP_MODE: mode,
      SAVE_DELAY_MS: '0',
      TMPDIR: fixture.profiles,
    },
    encoding: 'utf8',
    timeout: 8_000,
  })
  assert.equal(result.error, undefined, result.error?.message)
  return { result, elapsedMs: Date.now() - started }
}

async function assertPidGone(pidFile: string): Promise<void> {
  const pid = Number(readFileSync(pidFile, 'utf8'))
  assert.ok(Number.isSafeInteger(pid) && pid > 0, 'fake Chrome did not record its descendant')
  const end = Date.now() + 2_000
  while (Date.now() < end) {
    try {
      process.kill(pid, 0)
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ESRCH') return
      throw error
    }
    await delay(25)
  }
  assert.fail(`browser descendant ${pid} still exists`)
}

async function assertNoRunArtifacts(fixture: ReturnType<typeof prepareFixture>): Promise<void> {
  assert.deepEqual(readdirSync(fixture.profiles), [], 'capture leaked its browser profile')
  assert.deepEqual(
    readdirSync(fixture.root).filter((name) => name.startsWith('.evidence-local-run-')),
    [],
    'capture leaked its staging directory',
  )
  await assertPidGone(fixture.browserPidFile)
  await assertPidGone(fixture.childPidFile)
}

function seedOldEvidence(root: string): void {
  const evidence = join(root, 'evidence-local')
  mkdirSync(join(evidence, 'qa'), { recursive: true })
  writeFileSync(join(evidence, 'stale-run.txt'), 'old evidence\n')
  writeFileSync(join(evidence, 'qa', 'stale-frame.png'), 'old frame\n')
}

void test('browser GIF capture atomically replaces old evidence and cleans the browser process group', async (t) => {
  if (!supportsProcessGroups(t)) return
  const fixture = prepareFixture(t)
  seedOldEvidence(fixture.root)
  const { result } = runCapture(fixture, 'success', 5_000)
  assert.equal(result.status, 0, (result.stdout ?? '') + (result.stderr ?? ''))
  assert.deepEqual(readdirSync(join(fixture.root, 'evidence-local')).sort(), [
    '00-initial.png',
    '01-saving.png',
    '02-saved.png',
    'capture-report.json',
  ])
  const report = JSON.parse(readFileSync(join(fixture.root, 'evidence-local', 'capture-report.json'), 'utf8')) as {
    freshProfile: boolean
    runId: string
    screenshots: Array<{ path: string; bytes: number }>
    states: Record<string, { status: string }>
  }
  assert.equal(report.freshProfile, true)
  assert.match(report.runId, /^\.evidence-local-run-/)
  assert.deepEqual(
    Object.values(report.states).map((state) => state.status),
    ['Unsaved changes', 'Saving changes', 'Changes saved'],
  )
  for (const screenshot of report.screenshots) {
    assert.equal(statSync(join(fixture.root, screenshot.path)).size, screenshot.bytes)
  }
  await assertNoRunArtifacts(fixture)
})

void test('browser GIF capture rejects pending commands after a post-handshake disconnect', async (t) => {
  if (!supportsProcessGroups(t)) return
  const fixture = prepareFixture(t)
  seedOldEvidence(fixture.root)
  const { result, elapsedMs } = runCapture(fixture, 'disconnect', 5_000)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr ?? '', /CDP WebSocket (?:closed|errored)/)
  assert.ok(elapsedMs < 4_000, `disconnect took ${elapsedMs}ms instead of rejecting promptly`)
  assert.equal(existsSync(join(fixture.root, 'evidence-local')), false)
  await assertNoRunArtifacts(fixture)
})

void test('browser GIF capture enforces one complete deadline and still cleans up', async (t) => {
  if (!supportsProcessGroups(t)) return
  const fixture = prepareFixture(t)
  seedOldEvidence(fixture.root)
  const { result, elapsedMs } = runCapture(fixture, 'hang', 250)
  assert.notEqual(result.status, 0)
  assert.match(
    result.stderr ?? '',
    /capture deadline exceeded while waiting for (?:a page target|the CDP WebSocket handshake|Page\.enable)/,
  )
  assert.ok(elapsedMs < 3_000, `deadline took ${elapsedMs}ms`)
  assert.equal(existsSync(join(fixture.root, 'evidence-local')), false)
  await assertNoRunArtifacts(fixture)
})

void test('browser GIF capture never publishes a partial run over existing evidence', async (t) => {
  if (!supportsProcessGroups(t)) return
  const fixture = prepareFixture(t)
  seedOldEvidence(fixture.root)
  const { result } = runCapture(fixture, 'fail-mid-run', 5_000)
  assert.notEqual(result.status, 0)
  assert.match(result.stderr ?? '', /CDP WebSocket (?:closed|errored)/)
  assert.equal(existsSync(join(fixture.root, 'evidence-local')), false)
  await assertNoRunArtifacts(fixture)
})
