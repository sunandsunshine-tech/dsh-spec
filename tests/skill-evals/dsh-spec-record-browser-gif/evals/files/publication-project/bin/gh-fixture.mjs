#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 *
 * Local review-platform stand-in for browser GIF publication scenarios. It performs no network
 * access and records only the selected case's simulated remote state.
 */

import { createHash } from 'node:crypto'
import { appendFileSync, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, isAbsolute, join, normalize, relative, resolve, sep } from 'node:path'
import { parseArgs } from 'node:util'

const VERSION = 'gh version 2.99.0 (2026-11-26)'
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const projectRoot = process.cwd()

function fail(message, exitCode = 1) {
  console.error(`fake gh: ${message}`)
  process.exitCode = exitCode
}

function containedPath(root, path, label) {
  const target = resolve(root, path)
  const local = relative(root, target)
  if (isAbsolute(local) || local === '..' || local.startsWith(`..${sep}`)) {
    throw new Error(`${label} escapes the fixture: ${path}`)
  }
  return target
}

function caseDirectory() {
  const value = process.env.GH_FIXTURE_CASE
  if (!value) throw new Error('GH_FIXTURE_CASE must name publication/cases/<case>')
  const candidate = containedPath(projectRoot, value, 'GH_FIXTURE_CASE')
  if (!existsSync(candidate) || !statSync(candidate).isDirectory()) {
    throw new Error(`GH_FIXTURE_CASE does not name a case directory: ${value}`)
  }
  return candidate
}

function readState(root) {
  const state = JSON.parse(readFileSync(join(root, 'state.json'), 'utf8'))
  if (state.version !== 1) throw new Error('state.json has an unsupported version')
  for (const field of ['repository', 'pullRequest', 'demonstratedHead', 'liveHead', 'bodyFile', 'mode']) {
    if (!(field in state)) throw new Error(`state.json is missing ${field}`)
  }
  return state
}

function initialRemote(root, state) {
  const body = readFileSync(containedPath(root, state.bodyFile, 'state.json bodyFile'), 'utf8')
  return {
    body,
    headAtEdit: null,
    liveHead: state.liveHead,
    operations: [],
    uploads: [],
  }
}

function readRemote(root, state) {
  const path = join(root, 'remote.json')
  if (!existsSync(path)) return initialRemote(root, state)
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeRemote(root, remote) {
  writeFileSync(join(root, 'remote.json'), `${JSON.stringify(remote, null, 2)}\n`)
}

function record(root, event) {
  appendFileSync(join(root, 'invocations.jsonl'), `${JSON.stringify(event)}\n`)
}

function attachmentProjectPath(root, value) {
  const target = containedPath(projectRoot, value, 'attachment')
  const relativeToProject = relative(projectRoot, target).split(sep).join('/')
  const relativeToCase = relative(root, target).split(sep).join('/')
  if (!existsSync(target) || !statSync(target).isFile()) {
    throw new Error(`attachment is not a regular file: ${value}`)
  }
  return { target, relativeToProject, relativeToCase }
}

function replaceBodyReference(body, attachment, url) {
  const variants = new Set([
    attachment.relativeToProject,
    `./${attachment.relativeToProject}`,
    normalize(attachment.relativeToProject),
    attachment.relativeToCase,
    `./${attachment.relativeToCase}`,
  ])
  let result = body
  for (const variant of variants) {
    if (!result.includes(`](${variant})`)) continue
    result = result.replaceAll(`](${variant})`, `](${url})`)
    return { body: result, replaced: true }
  }
  return { body: result, replaced: false }
}

function view(root, state, positionals, values) {
  const pullRequest = positionals[2]
  if (String(state.pullRequest) !== pullRequest) throw new Error(`unknown pull request ${pullRequest}`)
  const fields = String(values.json ?? 'headRefOid,body,url')
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean)
  const remote = readRemote(root, state)
  const result = {
    headRefOid: remote.liveHead,
    body: remote.body,
    url: `https://github.com/${state.repository}/pull/${state.pullRequest}`,
  }
  const supported = new Set(Object.keys(result))
  for (const field of fields) {
    if (!supported.has(field)) throw new Error(`unsupported JSON field ${field}`)
  }
  record(root, { event: 'pr-view', fields, pullRequest: state.pullRequest })
  console.log(JSON.stringify(Object.fromEntries(fields.map((field) => [field, result[field]]))))
}

function edit(root, state, positionals, values) {
  const pullRequest = positionals[2]
  if (String(state.pullRequest) !== pullRequest) throw new Error(`unknown pull request ${pullRequest}`)
  if (typeof values['body-file'] !== 'string') throw new Error('--body-file is required')
  const bodyPath = containedPath(projectRoot, values['body-file'], 'body file')
  if (!existsSync(bodyPath) || !statSync(bodyPath).isFile()) {
    throw new Error(`body file is not a regular file: ${values['body-file']}`)
  }
  const attachments = Array.isArray(values.attach) ? values.attach : values.attach ? [values.attach] : []
  const resolvedAttachments = attachments.map((value) => attachmentProjectPath(root, value))
  for (const attachment of resolvedAttachments) {
    const bytes = statSync(attachment.target).size
    if (bytes > MAX_ATTACHMENT_BYTES) {
      throw new Error(`attachment ${attachment.relativeToProject} is ${bytes} bytes, above ${MAX_ATTACHMENT_BYTES}`)
    }
  }

  const remote = readRemote(root, state)
  if (state.mode === 'leave-second-unreferenced' && remote.operations.length > 0) {
    throw new Error('simulated follow-up body update rejected after the unreferenced upload')
  }
  const uploadedPaths = new Set(remote.uploads.map((upload) => upload.path))
  for (const attachment of resolvedAttachments) {
    if (uploadedPaths.has(attachment.relativeToProject)) {
      throw new Error(`the same file cannot be attached twice: ${attachment.relativeToProject}`)
    }
    uploadedPaths.add(attachment.relativeToProject)
  }
  const body = readFileSync(bodyPath, 'utf8')
  remote.headAtEdit = remote.liveHead
  remote.operations.push({
    event: 'pr-edit',
    attachments: resolvedAttachments.map((attachment) => ({
      bytes: statSync(attachment.target).size,
      path: attachment.relativeToProject,
      sha256: createHash('sha256').update(readFileSync(attachment.target)).digest('hex'),
    })),
    bodyFile: relative(root, bodyPath).split(sep).join('/'),
    liveHead: remote.liveHead,
  })
  record(root, {
    event: 'pr-edit',
    attachments: resolvedAttachments.map((attachment) => attachment.relativeToProject),
    pullRequest: state.pullRequest,
  })

  for (const [index, attachment] of resolvedAttachments.entries()) {
    if (state.mode === 'fail-second' && index === 1) {
      writeRemote(root, remote)
      throw new Error(`simulated upload failure for ${attachment.relativeToProject}`)
    }
    const url = `https://github.com/${state.repository}/assets/${state.pullRequest}/${index + 1}-${basename(attachment.target)}`
    remote.uploads.push({
      bytes: statSync(attachment.target).size,
      order: index + 1,
      path: attachment.relativeToProject,
      url,
    })
  }

  let nextBody = body
  for (const [index, attachment] of resolvedAttachments.entries()) {
    if (state.mode === 'leave-second-unreferenced' && index === 1) continue
    const url = remote.uploads.find((upload) => upload.path === attachment.relativeToProject)?.url
    if (!url) continue
    const replacement = replaceBodyReference(nextBody, attachment, url)
    if (!replacement.replaced) {
      nextBody += `\n\n![${basename(attachment.target)}](${url})\n`
    } else {
      nextBody = replacement.body
    }
  }
  remote.body = nextBody
  writeRemote(root, remote)

  const localReferences = resolvedAttachments.filter((attachment) =>
    nextBody.includes(`](${attachment.relativeToProject})`),
  )
  if (state.mode !== 'leave-second-unreferenced' && localReferences.length > 0) {
    throw new Error(`body still has ${localReferences.length} unresolved local attachment reference(s)`)
  }
  console.log(`https://github.com/${state.repository}/pull/${state.pullRequest}`)
}

function main() {
  if (process.argv.includes('--version')) {
    console.log(VERSION)
    return
  }
  let parsed
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      allowPositionals: true,
      strict: true,
      options: {
        json: { type: 'string' },
        'body-file': { type: 'string' },
        attach: { type: 'string', multiple: true },
      },
    })
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error), 2)
    return
  }
  const { positionals, values } = parsed
  if (positionals[0] !== 'pr' || !['view', 'edit'].includes(positionals[1] ?? '')) {
    fail('only "pr view" and "pr edit" are supported', 2)
    return
  }
  try {
    const root = caseDirectory()
    const state = readState(root)
    if (positionals[1] === 'view') view(root, state, positionals, values)
    else edit(root, state, positionals, values)
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error))
  }
}

main()
