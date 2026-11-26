#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 *
 * Materialize text-only GIF fixture sources for the local publication scenarios. The generated
 * files stay inside the fixture workspace and are never uploaded to a real review platform.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const MAX_BYTES = 5 * 1024 * 1024
const BASE_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')
const caseName = process.argv[2]
if (!caseName || !/^[a-z0-9-]+$/.test(caseName)) {
  console.error('usage: prepare-publication-fixture.mjs <case>')
  process.exit(2)
}

const caseRoot = resolve('publication', 'cases', caseName)
if (!existsSync(caseRoot)) {
  console.error(`unknown publication case: ${caseName}`)
  process.exit(2)
}
const evidenceRoot = join(caseRoot, 'evidence')
mkdirSync(evidenceRoot, { recursive: true })

function commentSubblocks(bytes) {
  const blocks = []
  for (let offset = 0; offset < bytes.length; offset += 255) {
    const chunk = bytes.subarray(offset, offset + 255)
    blocks.push(Buffer.from([chunk.length]), chunk)
  }
  return Buffer.concat(blocks)
}

function gifWithComment(label, minimumBytes = 0) {
  let payload = Buffer.from(label.repeat(Math.max(1, Math.ceil(minimumBytes / label.length))))
  while (BASE_GIF.length + 2 + payload.length + Math.ceil(payload.length / 255) + 2 < minimumBytes) {
    payload = Buffer.concat([payload, Buffer.from(label)])
  }
  return Buffer.concat([
    BASE_GIF.subarray(0, -1),
    Buffer.from([0x21, 0xfe]),
    commentSubblocks(payload),
    Buffer.from([0x00, 0x3b]),
  ])
}

function writeEvidence(name, bytes) {
  const path = join(evidenceRoot, name)
  writeFileSync(path, bytes)
  return {
    bytes: statSync(path).size,
    path: `publication/cases/${caseName}/evidence/${name}`,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  }
}

function writeTemporaryEvidence(name, bytes) {
  const path = join(mkdtempSync(join(tmpdir(), 'browser-gif-overlimit-')), name)
  writeFileSync(path, bytes)
  return {
    bytes: statSync(path).size,
    path,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
    temporary: true,
  }
}

let overlimitPath
if (caseName === 'split') {
  const temporary = writeTemporaryEvidence('overlimit.gif', gifWithComment('BROWSER-GIF-EVIDENCE-', MAX_BYTES + 1))
  overlimitPath = temporary.path
  const { path: _temporaryPath, ...full } = temporary
  const parts = [
    { order: 1, range: '0.000-1.600s', ...writeEvidence('part-01.gif', gifWithComment('PART-01-')) },
    { order: 2, range: '1.600-3.200s', ...writeEvidence('part-02.gif', gifWithComment('PART-02-')) },
  ]
  const manifest = {
    case: caseName,
    fixture: true,
    full,
    maxBytes: MAX_BYTES,
    parts,
    source: 'one isolated local browser run',
  }
  writeFileSync(join(evidenceRoot, 'split-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
} else {
  const names = caseName === 'no-pr' || caseName === 'moved-head' ? ['demo.gif'] : ['part-01.gif', 'part-02.gif']
  for (const name of names) writeEvidence(name, gifWithComment(`${caseName.toUpperCase()}-${name}-`))
}

console.log(JSON.stringify({ case: caseName, evidence: evidenceRoot, overlimitPath }, null, 2))
