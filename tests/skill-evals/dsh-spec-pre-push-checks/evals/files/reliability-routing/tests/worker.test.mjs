import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

test('reports worker readiness', async () => {
  const root = await mkdtemp(join(tmpdir(), 'worker-test-'))
  const child = spawn(process.execPath, ['-e', "process.stdout.write('ready'); setInterval(() => {}, 1000)"], {
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  child.unref()
  child.stdout.unref()

  await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.stdout.once('data', resolve)
  })

  await rm(root, { recursive: true })
  assert.equal(child.killed, false)
  child.kill()
})
