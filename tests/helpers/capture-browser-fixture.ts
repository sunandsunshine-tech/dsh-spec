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
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { TestContext } from 'node:test'

import { REPO_ROOT } from './fixtures.ts'

const CAPTURE_SOURCE = join(
  REPO_ROOT,
  'tests/skill-evals/dsh-spec-client-ui-ux/evals/files/shared-widget-project/capture-browser.mjs',
)
const HELPER_ROOT = join(REPO_ROOT, 'tests/helpers')

export interface CaptureFixture {
  readonly root: string
  readonly evidence: string
  readonly serverPidFile: string
  readonly chromePidFile: string
  readonly descendantPidFile: string
  readonly chromeEvents: string
  readonly serverEvents: string
  run(mode: string, env?: NodeJS.ProcessEnv): SpawnSyncReturns<string>
  captureRunDirectories(): string[]
  events(path: string): Array<Record<string, unknown>>
  pid(path: string): number | undefined
  seedOldEvidence(): void
}

function readPid(path: string): number | undefined {
  if (!existsSync(path)) return undefined
  const value = Number(readFileSync(path, 'utf8'))
  return Number.isInteger(value) && value > 0 ? value : undefined
}

function killRecordedProcess(path: string): void {
  const pid = readPid(path)
  if (!pid) return
  if (process.platform !== 'win32') {
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      // The process may have exited between reading its PID and signalling its group.
    }
  }
  try {
    process.kill(pid, 'SIGKILL')
  } catch {
    // The process may have exited between reading its PID and signalling it.
  }
}

export function createCaptureFixture(t: TestContext, prefix: string): CaptureFixture {
  const root = mkdtempSync(join(tmpdir(), prefix))
  const evidence = join(root, 'evidence-local')
  const serverPidFile = join(root, 'server.pid')
  const chromePidFile = join(root, 'chrome.pid')
  const descendantPidFile = join(root, 'descendant.pid')
  const chromeEvents = join(root, 'chrome-events.jsonl')
  const serverEvents = join(root, 'server-events.jsonl')
  cpSync(CAPTURE_SOURCE, join(root, 'capture-browser.mjs'))
  cpSync(join(HELPER_ROOT, 'fake-capture-chrome.mjs'), join(root, 'fake-chrome'))
  chmodSync(join(root, 'fake-chrome'), 0o755)
  cpSync(join(HELPER_ROOT, 'fake-capture-descendant.mjs'), join(root, 'fake-capture-descendant.mjs'))
  cpSync(join(HELPER_ROOT, 'fake-capture-server.mjs'), join(root, 'fake-capture-server.mjs'))

  t.after(() => {
    killRecordedProcess(descendantPidFile)
    killRecordedProcess(chromePidFile)
    killRecordedProcess(serverPidFile)
    rmSync(root, { recursive: true, force: true })
  })

  return {
    root,
    evidence,
    serverPidFile,
    chromePidFile,
    descendantPidFile,
    chromeEvents,
    serverEvents,
    run(mode, env = {}) {
      mkdirSync(root, { recursive: true })
      rmSync(chromeEvents, { force: true })
      rmSync(serverEvents, { force: true })
      rmSync(serverPidFile, { force: true })
      rmSync(chromePidFile, { force: true })
      rmSync(descendantPidFile, { force: true })
      const childEnv: NodeJS.ProcessEnv = {
        ...process.env,
        CHROME_PATH: join(root, 'fake-chrome'),
        SERVER_ENTRY: 'fake-capture-server.mjs',
        SERVER_READY_TIMEOUT_MS: '250',
        CHROME_READY_TIMEOUT_MS: '1000',
        CDP_COMMAND_TIMEOUT_MS: '1000',
        CAPTURE_TIMEOUT_MS: '3000',
        BROWSER_CLOSE_TIMEOUT_MS: '500',
        PROCESS_STOP_TIMEOUT_MS: '150',
        FAKE_SERVER_MODE: 'ready',
        FAKE_CHROME_MODE: mode,
        FAKE_SERVER_PID_FILE: serverPidFile,
        FAKE_SERVER_EVENTS: serverEvents,
        FAKE_CHROME_PID_FILE: chromePidFile,
        FAKE_CHROME_EVENTS: chromeEvents,
        FAKE_DESCENDANT_PID_FILE: descendantPidFile,
        ...env,
      }
      delete childEnv.NODE_TEST_CONTEXT
      return spawnSync(process.execPath, ['capture-browser.mjs'], {
        cwd: root,
        env: childEnv,
        encoding: 'utf8',
        timeout: 5_000,
      })
    },
    captureRunDirectories() {
      return readdirSync(root).filter((name) => name.startsWith('.shared-widget-capture'))
    },
    events(path) {
      if (!existsSync(path)) return []
      return readFileSync(path, 'utf8')
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>)
    },
    pid(path) {
      return readPid(path)
    },
    seedOldEvidence() {
      mkdirSync(evidence, { recursive: true })
      writeFileSync(join(evidence, 'stale.png'), 'stale evidence')
      writeFileSync(join(evidence, 'review-state.json'), '{"run":"old"}\n')
    },
  }
}

export async function waitForProcessGone(pid: number | undefined, timeoutMs = 1_000): Promise<boolean> {
  if (!pid) return true
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true
      throw error
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  try {
    process.kill(pid, 0)
    return false
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return true
    throw error
  }
}
