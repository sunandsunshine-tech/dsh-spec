/**
 * Fast command and preflight contracts for the browser GIF encoder.
 *
 * These cases intentionally fail before the media binaries run. The real media scenario lives in
 * `browser-gif-encoder.media.ts` and runs only through `pnpm run test:browser-gif`.
 */

import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { skillBundle } from './helpers/bundles.ts'
import { runScript } from './helpers/cli.ts'

const ENCODER = skillBundle('dsh-spec-browser-gif-evidence', 'encode-browser-gif.mjs')

test('browser GIF preflight rejects invalid output and input relationships before media execution', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'browser-gif-preflight-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const emptyPath = join(root, 'empty-path')
  const input = join(root, 'source.webm')
  const frames = join(root, 'frames')
  const outputDirectory = join(root, 'directory.gif')
  mkdirSync(emptyPath)
  mkdirSync(frames)
  writeFileSync(input, 'not media\n')
  mkdirSync(outputDirectory)

  const directoryOutput = runScript(ENCODER, [input, outputDirectory, '--force'], root, {
    env: { PATH: emptyPath },
  })
  assert.equal(directoryOutput.status, 1, directoryOutput.output)
  assert.match(directoryOutput.stderr, /output must be a regular file path/)
  assert.equal(statSync(outputDirectory).isDirectory(), true)

  writeFileSync(join(frames, '001.gif'), 'old evidence\n')
  writeFileSync(join(frames, '002.gif'), 'more old evidence\n')
  const overlappingOutput = runScript(
    ENCODER,
    [frames, join(frames, '001.gif'), '--pattern', '*.gif', '--force'],
    root,
    { env: { PATH: emptyPath } },
  )
  assert.equal(overlappingOutput.status, 2, overlappingOutput.output)
  assert.match(overlappingOutput.stderr, /output path must not be one of the input frames/)
  assert.equal(readFileSync(join(frames, '001.gif'), 'utf8'), 'old evidence\n')

  const videoFlagOnScreenshots = runScript(ENCODER, [frames, join(root, 'demo.gif'), '--speed', '2'], root, {
    env: { PATH: emptyPath },
  })
  assert.equal(videoFlagOnScreenshots.status, 2, videoFlagOnScreenshots.output)
  assert.match(videoFlagOnScreenshots.stderr, /require a video file/)

  if (process.platform !== 'win32') {
    const alias = join(root, 'source-alias.gif')
    symlinkSync(input, alias)
    const aliasedInput = runScript(ENCODER, [input, alias, '--force'], root, { env: { PATH: emptyPath } })
    assert.equal(aliasedInput.status, 2, aliasedInput.output)
    assert.match(aliasedInput.stderr, /output path must differ from input/)
    assert.equal(readFileSync(input, 'utf8'), 'not media\n')
  }
})

test('browser GIF encoder names a missing media binary instead of claiming success', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'browser-gif-no-media-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const emptyPath = join(root, 'empty-path')
  const input = join(root, 'source.webm')
  mkdirSync(emptyPath)
  writeFileSync(input, 'not media\n')

  const result = runScript(ENCODER, [input, join(root, 'demo.gif')], root, {
    env: { PATH: emptyPath },
  })
  assert.equal(result.status, 1, result.output)
  assert.match(result.stderr, /required binary "ffmpeg" is not available on PATH/)
})
