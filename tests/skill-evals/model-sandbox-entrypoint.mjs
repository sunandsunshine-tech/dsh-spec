import { spawnSync } from 'node:child_process'
import { createConnection } from 'node:net'
import { parseArgs } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'

import { copyTreeBounded } from './runner-safety.mjs'

const CONTROL_MESSAGE_BYTES = 8 * 1024

function positiveInteger(value, option) {
  if (!/^\d+$/.test(value ?? '')) throw new Error(`${option} must be a positive integer`)
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${option} must be a positive integer`)
  return parsed
}

function readLine(socket) {
  return new Promise((resolve, reject) => {
    let contents = ''
    const onData = (chunk) => {
      contents += chunk
      if (Buffer.byteLength(contents) > CONTROL_MESSAGE_BYTES) {
        cleanup()
        reject(new Error('sandbox control message exceeds its byte limit'))
        return
      }
      const newline = contents.indexOf('\n')
      if (newline < 0) return
      cleanup()
      resolve(contents.slice(0, newline))
    }
    const onEnd = () => {
      cleanup()
      reject(new Error('sandbox control connection closed before a command arrived'))
    }
    const onError = (error) => {
      cleanup()
      reject(error)
    }
    const cleanup = () => {
      socket.off('data', onData)
      socket.off('end', onEnd)
      socket.off('error', onError)
    }
    socket.on('data', onData)
    socket.once('end', onEnd)
    socket.once('error', onError)
  })
}

function writeLine(socket, value) {
  const message = `${JSON.stringify(value)}\n`
  if (Buffer.byteLength(message) > CONTROL_MESSAGE_BYTES) {
    throw new Error('sandbox control message exceeds its byte limit')
  }
  return new Promise((resolve, reject) => {
    socket.write(message, (error) => {
      if (error) reject(error)
      else resolve()
    })
  })
}

async function connectControl(path) {
  const socket = createConnection(path)
  socket.setEncoding('utf8')
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('error', reject)
  })
  return socket
}

function copyWorkspaceSeed(limits) {
  return copyTreeBounded({
    sourceRoot: '/seed/workspace',
    destinationRoot: '/workspace',
    maxEntries: limits.workspaceEntries,
    maxBytes: limits.workspaceBytes,
    maxFileBytes: limits.workspaceBytes,
    skip: (relative) => relative === '.git' || relative === '.agents/skills',
  })
}

function copyCodexHomeSeed(limits) {
  return copyTreeBounded({
    sourceRoot: '/seed/codex-home',
    destinationRoot: '/codex-home',
    maxEntries: limits.codexHomeEntries,
    maxBytes: limits.codexHomeBytes,
    maxFileBytes: limits.codexHomeBytes,
  })
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      'codex-home-bytes': { type: 'string' },
      'codex-home-entries': { type: 'string' },
      'control-socket': { type: 'string' },
      'workspace-bytes': { type: 'string' },
      'workspace-entries': { type: 'string' },
      'workspace-mode': { type: 'string' },
    },
    allowPositionals: true,
    strict: true,
  })
  if (!['read-only', 'workspace-write'].includes(values['workspace-mode'] ?? '')) {
    throw new Error('--workspace-mode must be read-only or workspace-write')
  }
  if (!values['control-socket']) throw new Error('--control-socket is required')
  if (positionals.length === 0) throw new Error('the model command is required after --')
  const limits = {
    codexHomeBytes: positiveInteger(values['codex-home-bytes'], '--codex-home-bytes'),
    codexHomeEntries: positiveInteger(values['codex-home-entries'], '--codex-home-entries'),
    workspaceBytes: positiveInteger(values['workspace-bytes'], '--workspace-bytes'),
    workspaceEntries: positiveInteger(values['workspace-entries'], '--workspace-entries'),
  }

  let socket
  try {
    socket = await connectControl(values['control-socket'])
    if (values['workspace-mode'] === 'workspace-write') copyWorkspaceSeed(limits)
    copyCodexHomeSeed(limits)
    const result = spawnSync(positionals[0], positionals.slice(1), {
      env: process.env,
      stdio: ['ignore', 'inherit', 'inherit'],
    })
    if (result.error) throw result.error

    try {
      process.kill(-1, 'SIGKILL')
    } catch (error) {
      if (error?.code !== 'ESRCH') throw error
    }
    await delay(50)

    await writeLine(socket, {
      type: 'model-exit',
      status: result.status,
      signal: result.signal,
    })
    const response = JSON.parse(await readLine(socket))
    if (!['collect', 'abort'].includes(response.action)) {
      throw new Error('sandbox control returned an unknown action')
    }
    process.exitCode = result.status ?? 1
  } catch (error) {
    if (socket && !socket.destroyed) {
      await writeLine(socket, { type: 'runner-error', message: String(error?.message ?? error) }).catch(() => {})
    }
    console.error(`model sandbox wrapper failed: ${String(error?.stack ?? error)}`)
    process.exitCode = 74
  } finally {
    socket?.destroy()
  }
}

await main()
