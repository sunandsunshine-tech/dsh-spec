/**
 * One real-media scenario for the browser GIF encoder.
 *
 * The tiny fixture is shared by both output modes and the replacement checks. It stays outside the
 * default suite so the Node matrix does not spend two runners on the same ffmpeg behavior.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { skillBundle } from './helpers/bundles.ts'
import { runScript } from './helpers/cli.ts'

const ENCODER = skillBundle('dsh-spec-browser-gif-evidence', 'encode-browser-gif.mjs')

function requireMediaTools(): void {
  for (const tool of ['ffmpeg', 'ffprobe']) {
    const result = spawnSync(tool, ['-version'], { encoding: 'utf8' })
    assert.equal(result.status, 0, `${tool} is required for pnpm run test:browser-gif`)
  }
}

function run(command: string, args: string[], cwd: string): Buffer {
  const result = spawnSync(command, args, { cwd, encoding: 'buffer' })
  assert.equal(result.status, 0, result.stderr.toString('utf8'))
  return result.stdout
}

function ppm(color: [number, number, number]): Buffer {
  const width = 64
  const height = 48
  return Buffer.concat([
    Buffer.from(`P6\n${width} ${height}\n255\n`),
    Buffer.from(Array.from({ length: width * height }, () => color).flat()),
  ])
}

function decodePixels(path: string, cwd: string): number[][] {
  const bytes = run(
    'ffmpeg',
    ['-v', 'error', '-i', path, '-vf', 'scale=1:1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
    cwd,
  )
  const pixels: number[][] = []
  for (let offset = 0; offset < bytes.length; offset += 3) pixels.push([...bytes.subarray(offset, offset + 3)])
  return pixels
}

function frameDurations(path: string, cwd: string): number[] {
  const result = JSON.parse(
    run(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=duration_time', '-of', 'json', path],
      cwd,
    ).toString('utf8'),
  ) as { frames?: Array<{ duration_time?: string }> }
  return (result.frames ?? []).map((frame) => Number(frame.duration_time))
}

function gifLoopCount(path: string): number {
  const bytes = readFileSync(path)
  const marker = bytes.indexOf(Buffer.from('NETSCAPE2.0'))
  assert.notEqual(marker, -1, 'GIF is missing the looping application extension')
  const block = marker + 'NETSCAPE2.0'.length
  assert.deepEqual([...bytes.subarray(block, block + 2)], [3, 1], 'GIF loop extension has an invalid shape')
  return bytes.readUInt16LE(block + 2)
}

function assertDominant(pixel: number[], channel: number, label: string): void {
  assert.ok(pixel, label + ' frame exists')
  assert.ok((pixel[channel] as number) > 150, `${label}: expected channel ${channel}, got ${pixel.join(',')}`)
  for (const [index, value] of pixel.entries()) {
    if (index !== channel) assert.ok(value < 100, `${label}: expected channel ${channel}, got ${pixel.join(',')}`)
  }
}

function parseSummary(stdout: string): Record<string, number | string> {
  return JSON.parse(stdout) as Record<string, number | string>
}

void test('browser GIF encoder verifies video, screenshots and safe replacement with one tiny media fixture', (t) => {
  requireMediaTools()
  const root = mkdtempSync(join(tmpdir(), 'browser-gif-media-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const video = join(root, 'source.webm')
  const screenshots = join(root, 'screenshots')
  mkdirSync(screenshots)

  run(
    'ffmpeg',
    [
      '-v',
      'error',
      '-f',
      'lavfi',
      '-i',
      'color=red:s=64x48:r=10:d=0.5',
      '-f',
      'lavfi',
      '-i',
      'color=lime:s=64x48:r=10:d=0.5',
      '-f',
      'lavfi',
      '-i',
      'color=blue:s=64x48:r=10:d=0.5',
      '-filter_complex',
      '[0:v][1:v][2:v]concat=n=3:v=1:a=0',
      '-c:v',
      'libvpx',
      video,
    ],
    root,
  )
  writeFileSync(join(screenshots, '001.ppm'), ppm([255, 0, 0]))
  writeFileSync(join(screenshots, '002.ppm'), ppm([0, 0, 255]))

  const videoGif = join(root, 'video.gif')
  const videoResult = runScript(
    ENCODER,
    [
      video,
      videoGif,
      '--start',
      '0.2',
      '--end',
      '1.4',
      '--speed',
      '2',
      '--final-hold',
      '0.3',
      '--fps',
      '5',
      '--max-width',
      '32',
    ],
    root,
  )
  assert.equal(videoResult.status, 0, videoResult.output)
  const videoSummary = parseSummary(videoResult.stdout)
  assert.equal(videoSummary.width, 32)
  assert.equal(videoSummary.height, 24)
  assert.ok(Math.abs((videoSummary.durationSeconds as number) - 0.9) <= 0.2)
  const videoPixels = decodePixels(videoGif, root)
  assertDominant(videoPixels[0] as number[], 0, 'video first')
  assertDominant(videoPixels[1] as number[], 1, 'video middle')
  assertDominant(videoPixels.at(-1) as number[], 2, 'video final hold')

  const screenshotGif = join(root, 'screenshots.gif')
  const screenshotResult = runScript(
    ENCODER,
    [screenshots, screenshotGif, '--pattern', '*.ppm', '--durations', '0.4,0.6', '--fps', '5'],
    root,
  )
  assert.equal(screenshotResult.status, 0, screenshotResult.output)
  assert.equal(parseSummary(screenshotResult.stdout).sourceFrames, 2)
  const screenshotPixels = decodePixels(screenshotGif, root)
  assert.equal(screenshotPixels.length, 5, 'screenshot GIF frame count')
  for (const [index, channel] of [
    [0, 0],
    [1, 0],
    [2, 2],
    [3, 2],
    [4, 2],
  ] as const) {
    assertDominant(screenshotPixels[index] as number[], channel, `screenshot frame ${index}`)
  }
  const screenshotDurations = frameDurations(screenshotGif, root)
  assert.equal(screenshotDurations.length, 5)
  for (const [index, duration] of screenshotDurations.entries()) {
    assert.ok(Math.abs(duration - 0.2) <= 0.01, `screenshot frame ${index} lasts ${duration}s`)
  }
  assert.equal(gifLoopCount(screenshotGif), 0, 'GIF loop count')

  const replaceable = join(root, 'replaceable.gif')
  writeFileSync(replaceable, 'keep this evidence\n')
  const failedReplacement = runScript(ENCODER, [video, replaceable, '--force', '--max-bytes', '1'], root)
  assert.equal(failedReplacement.status, 1, failedReplacement.output)
  assert.match(failedReplacement.stderr, /above --max-bytes/)
  assert.equal(readFileSync(replaceable, 'utf8'), 'keep this evidence\n')

  const successfulReplacement = runScript(
    ENCODER,
    [video, replaceable, '--force', '--final-hold', '0.2', '--fps', '5', '--max-width', '32'],
    root,
  )
  assert.equal(successfulReplacement.status, 0, successfulReplacement.output)
  assert.equal(readFileSync(replaceable).subarray(0, 3).toString('ascii'), 'GIF')
  assert.deepEqual(
    readdirSync(root).filter((name) => name.includes('.tmp.gif') || name.includes('.backup-')),
    [],
  )
})
