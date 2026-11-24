import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { after, before, test } from 'node:test'
import { listen } from '../support/server.mjs'

let server

before(async () => {
  server = await listen()
})

after(async () => {
  await server?.close()
})

function nextMessage(child) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('competitor did not report a result')), 4_000)
    const cleanup = () => {
      clearTimeout(timer)
      child.off('message', onMessage)
      child.off('error', onError)
      child.off('exit', onExit)
    }
    const onMessage = (message) => {
      cleanup()
      resolve(message)
    }
    const onError = (error) => {
      cleanup()
      reject(error)
    }
    const onExit = (code, signal) => {
      cleanup()
      reject(new Error(`competitor exited before reporting: code=${code} signal=${signal}`))
    }
    child.once('message', onMessage)
    child.once('error', onError)
    child.once('exit', onExit)
  })
}

function nextExit(child) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return Promise.resolve({ code: child.exitCode, signal: child.signalCode })
  }
  return new Promise((resolve) => child.once('exit', (code, signal) => resolve({ code, signal })))
}

test('keeps the atomically allocated listener available', async (t) => {
  const competitors = []
  t.after(async () => {
    for (const competitor of competitors) {
      if (competitor.child.exitCode === null && competitor.child.signalCode === null) {
        competitor.child.kill('SIGTERM')
      }
    }
    await Promise.all(competitors.map((competitor) => competitor.exit))
  })

  for (let index = 0; index < 4; index += 1) {
    const child = fork(new URL('./competitor.mjs', import.meta.url), [String(server.port)], {
      stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    })
    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })
    competitors.push({
      child,
      result: nextMessage(child),
      exit: nextExit(child),
      stderr: () => stderr,
    })
  }

  const results = await Promise.all(competitors.map((competitor) => competitor.result))
  for (const result of results) {
    assert.equal(result.type, 'failed')
    assert.equal(result.code, 'EADDRINUSE')
  }

  const response = await fetch(`http://127.0.0.1:${server.port}/health`)
  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'ok')

  for (const competitor of competitors) {
    const exit = await competitor.exit
    assert.deepEqual(exit, { code: 0, signal: null })
    assert.equal(competitor.stderr(), '')
  }
})
