#!/usr/bin/env node
/**
 * SPDX-License-Identifier: MIT
 *
 * Adapted from DeepSeek Harness `record-browser-gif/scripts/encode_gif.py` at the pinned
 * `dsh-v0.2.3-alpha.2` (`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`); the skill-root
 * THIRD_PARTY_NOTICES names the source and relation.
 */

import { spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { parseArgs } from 'node:util'

const USAGE = `usage: encode-browser-gif.mjs <input> <output.gif> [options]

Encode one browser video or ordered screenshots into a verified GIF.

options:
  --pattern <pattern>      screenshot filename pattern using * and ? (default: *.png)
  --durations <list>       one screenshot hold or one positive duration per frame
  --start <seconds>        video trim start (default: 0)
  --end <seconds>          video trim end (default: video duration)
  --speed <multiplier>     video playback speed (default: 1)
  --final-hold <seconds>   extra final video-frame hold (default: 2)
  --fps <1..30>            encoded frames per second (default: 10)
  --max-width <pixels>     maximum output width (default: 1200)
  --colors <4..256>        palette colors (default: 128)
  --max-bytes <bytes>      maximum output size (default: 5 MiB)
  --force                  replace an existing output only after validation succeeds
  --help, -h               print this help and exit 0

exit: 0 verified GIF written · 1 input, media, encoding or validation failure · 2 usage error
`

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024

class UsageError extends Error {}
class MediaError extends Error {}

interface Options {
  input: string
  output: string
  pattern: string
  patternSpecified: boolean
  durations: string | undefined
  durationsSpecified: boolean
  start: number
  startSpecified: boolean
  end: number | undefined
  endSpecified: boolean
  speed: number
  speedSpecified: boolean
  finalHold: number
  finalHoldSpecified: boolean
  fps: number
  maxWidth: number
  colors: number
  maxBytes: number
  force: boolean
}

interface Probe {
  stream: Record<string, unknown>
  format: Record<string, unknown>
}

function numberValue(value: string, label: string, minimum: number, integer = false): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < minimum || (integer && !Number.isInteger(parsed))) {
    throw new UsageError(`${label} must be a ${integer ? 'positive integer' : 'finite number'} at least ${minimum}`)
  }
  return parsed
}

function optionalNumber(value: string | undefined, label: string, minimum: number): number | undefined {
  return value === undefined ? undefined : numberValue(value, label, minimum)
}

function optionValue(values: Record<string, string | boolean | undefined>, name: string, fallback: string): string {
  const value = values[name]
  return typeof value === 'string' ? value : fallback
}

function parseOptions(args: string[]): Options | undefined {
  let values: Record<string, string | boolean | undefined>
  let positionals: string[]
  try {
    const parsed = parseArgs({
      args,
      allowPositionals: true,
      options: {
        pattern: { type: 'string' },
        durations: { type: 'string' },
        start: { type: 'string' },
        end: { type: 'string' },
        speed: { type: 'string' },
        'final-hold': { type: 'string' },
        fps: { type: 'string' },
        'max-width': { type: 'string' },
        colors: { type: 'string' },
        'max-bytes': { type: 'string' },
        force: { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
      },
      strict: true,
    })
    values = parsed.values
    positionals = parsed.positionals
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error))
  }
  if (values.help === true) return undefined
  if (positionals.length !== 2) throw new UsageError('input and output are required')
  const start = optionalNumber(values.start as string | undefined, '--start', 0) ?? 0
  const speed = optionalNumber(values.speed as string | undefined, '--speed', Number.MIN_VALUE) ?? 1
  const finalHold = optionalNumber(values['final-hold'] as string | undefined, '--final-hold', 0) ?? 2
  const fps = numberValue(optionValue(values, 'fps', '10'), '--fps', 1, true)
  if (fps > 30) throw new UsageError('--fps must not exceed 30')
  const colors = numberValue(optionValue(values, 'colors', '128'), '--colors', 4, true)
  if (colors > 256) throw new UsageError('--colors must not exceed 256')
  return {
    input: resolve(positionals[0] as string),
    output: resolve(positionals[1] as string),
    pattern: optionValue(values, 'pattern', '*.png'),
    patternSpecified: values.pattern !== undefined,
    durations: values.durations as string | undefined,
    durationsSpecified: values.durations !== undefined,
    start,
    startSpecified: values.start !== undefined,
    end: optionalNumber(values.end as string | undefined, '--end', Number.MIN_VALUE),
    endSpecified: values.end !== undefined,
    speed,
    speedSpecified: values.speed !== undefined,
    finalHold,
    finalHoldSpecified: values['final-hold'] !== undefined,
    fps,
    maxWidth: numberValue(optionValue(values, 'max-width', '1200'), '--max-width', 1, true),
    colors,
    maxBytes: numberValue(optionValue(values, 'max-bytes', String(DEFAULT_MAX_BYTES)), '--max-bytes', 1, true),
    force: values.force === true,
  }
}

function run(command: string, args: string[]): Buffer {
  const result = spawnSync(command, args, {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (result.error !== undefined) {
    if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new MediaError(`required binary ${JSON.stringify(command)} is not available on PATH`)
    }
    throw new MediaError(result.error.message)
  }
  if (result.status !== 0) {
    const detail = result.stderr.toString('utf8').trim() || result.stdout.toString('utf8').trim()
    throw new MediaError(detail || `${command} exited with status ${String(result.status)}`)
  }
  return result.stdout
}

function findBinary(name: string): string {
  const result = spawnSync(name, ['-version'], { stdio: 'ignore' })
  if (result.error !== undefined || result.status !== 0) {
    throw new MediaError(`required binary ${JSON.stringify(name)} is not available on PATH`)
  }
  return name
}

function probe(ffprobe: string, path: string): Probe {
  const output = run(ffprobe, [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    'stream=width,height,nb_frames,duration,r_frame_rate,codec_name:format=duration',
    '-of',
    'json',
    path,
  ]).toString('utf8')
  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch (error) {
    throw new MediaError(`media probe returned invalid JSON: ${String(error)}`)
  }
  if (!isObject(parsed)) throw new MediaError('media probe returned a non-object')
  const streams = parsed.streams
  const format = parsed.format
  if (!Array.isArray(streams) || streams.length !== 1 || !isObject(streams[0]) || !isObject(format)) {
    throw new MediaError(`expected one video stream in ${path}`)
  }
  return { stream: streams[0], format }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveIntegerField(stream: Record<string, unknown>, key: string, path: string): number {
  const value = Number(stream[key])
  if (!Number.isInteger(value) || value <= 0) throw new MediaError(`missing positive ${key} for ${path}`)
  return value
}

function formatDuration(details: Probe, path: string): number {
  const value = Number(details.format.duration)
  if (!Number.isFinite(value) || value <= 0) throw new MediaError(`missing positive duration for ${path}`)
  return value
}

function globRegExp(pattern: string): RegExp {
  if (pattern === '' || pattern.includes('/') || pattern.includes('\\')) {
    throw new UsageError('--pattern must be a non-empty filename pattern without a directory')
  }
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('*', '.*')
    .replaceAll('?', '.')
  return new RegExp(`^${escaped}$`)
}

function screenshotFrames(source: string, pattern: string): string[] {
  const matcher = globRegExp(pattern)
  const frames = readdirSync(source)
    .filter((name) => matcher.test(name))
    .map((name) => join(source, name))
    .filter((path) => statSync(path).isFile())
    .sort()
  if (frames.length < 2) throw new MediaError(`expected at least two screenshot frames in ${source}`)
  return frames
}

function parseDurations(value: string, count: number): number[] {
  const parts = value.split(',').map((part) => part.trim())
  if (parts.length === 0 || parts.some((part) => part === '')) {
    throw new UsageError('--durations must be a number or a comma-separated list of numbers')
  }
  const durations = parts.map((part) => numberValue(part, '--durations value', Number.MIN_VALUE))
  if (durations.length === 1) return new Array<number>(count).fill(durations[0] as number)
  if (durations.length !== count) {
    throw new UsageError(`--durations supplied ${durations.length} values for ${count} frames`)
  }
  return durations
}

function ffconcatQuote(path: string): string {
  if (/[\r\n]/.test(path)) throw new MediaError(`frame path contains a newline: ${path}`)
  return `'${path.replaceAll("'", "'\\''")}'`
}

function concatManifest(frames: string[], durations: number[]): string {
  const lines = ['ffconcat version 1.0']
  for (const [index, frame] of frames.entries()) {
    lines.push(`file ${ffconcatQuote(frame)}`)
    lines.push(`duration ${(durations[index] as number).toFixed(6)}`)
  }
  lines.push(`file ${ffconcatQuote(frames.at(-1) as string)}`)
  return lines.join('\n') + '\n'
}

function replaceValidated(temporary: string, output: string, force: boolean): void {
  if (existsSync(output) && !force)
    throw new MediaError(`output already exists (pass --force to replace it): ${output}`)
  try {
    renameSync(temporary, output)
  } catch (error) {
    throw new MediaError(`could not publish ${output}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function pathIdentity(path: string): string {
  const absolute = resolve(path)
  let canonical = absolute
  try {
    canonical = realpathSync.native(absolute)
  } catch {
    // A prospective output may not exist yet.
  }
  return process.platform === 'win32' ? canonical.toLowerCase() : canonical
}

function samePath(first: string, second: string): boolean {
  return pathIdentity(first) === pathIdentity(second)
}

function cleanupTemporary(paths: readonly (readonly [string, boolean])[]): string[] {
  const failures: string[] = []
  for (const [path, recursive] of paths) {
    try {
      rmSync(path, { force: true, recursive })
    } catch (error) {
      failures.push(`${path}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return failures
}

function encode(options: Options): Record<string, unknown> {
  if (!existsSync(options.input)) throw new MediaError(`input does not exist: ${options.input}`)
  if (extname(options.output).toLowerCase() !== '.gif') throw new UsageError('output must end in .gif')
  if (existsSync(options.output) && !options.force) {
    throw new MediaError(`output already exists (pass --force to replace it): ${options.output}`)
  }
  if (existsSync(options.output) && !statSync(options.output).isFile()) {
    throw new MediaError(`output must be a regular file path: ${options.output}`)
  }
  const sourceStat = statSync(options.input)
  const isVideo = sourceStat.isFile()
  if (!isVideo && !sourceStat.isDirectory()) {
    throw new MediaError(`input must be a video file or frame directory: ${options.input}`)
  }
  if (samePath(options.input, options.output)) throw new UsageError('output path must differ from input')
  let screenshotInput: { frames: string[]; durations: number[] } | undefined
  if (!isVideo) {
    if (options.startSpecified || options.endSpecified || options.speedSpecified || options.finalHoldSpecified) {
      throw new UsageError('--start, --end, --speed and --final-hold require a video file')
    }
    const frames = screenshotFrames(options.input, options.pattern)
    if (frames.some((frame) => samePath(frame, options.output))) {
      throw new UsageError('output path must not be one of the input frames')
    }
    screenshotInput = { frames, durations: parseDurations(options.durations ?? '2', frames.length) }
  }
  const ffmpeg = findBinary('ffmpeg')
  const ffprobe = findBinary('ffprobe')

  const temporaryRoot = mkdtempSync(join(tmpdir(), 'browser-gif-'))
  const temporary = join(dirname(options.output), `.${basename(options.output)}.${process.pid}.${Date.now()}.tmp.gif`)
  const cleanupPaths = [
    [temporaryRoot, true],
    [temporary, false],
  ] as const
  let result: Record<string, unknown> | undefined
  try {
    mkdirSync(dirname(options.output), { recursive: true })
    const details: Record<string, unknown> = {}
    let expectedDuration: number
    let inputs: string[]
    let timing = ''
    let hold = ''

    if (isVideo) {
      if (options.patternSpecified || options.durationsSpecified) {
        throw new UsageError('--pattern and --durations require a screenshot directory')
      }
      const sourceProbe = probe(ffprobe, options.input)
      const sourceDuration = formatDuration(sourceProbe, options.input)
      const end = options.end ?? sourceDuration
      if (!(options.start < end && end <= sourceDuration)) {
        throw new UsageError(`video trim must satisfy 0 <= start < end <= ${sourceDuration.toFixed(3)}`)
      }
      if ((end - options.start) / options.speed < 2 / options.fps) {
        throw new UsageError('video selection must span at least two output frames before the final hold')
      }
      expectedDuration = (end - options.start) / options.speed + options.finalHold
      Object.assign(details, {
        sourceVideo: options.input,
        sourceDurationSeconds: sourceDuration,
        startSeconds: options.start,
        endSeconds: end,
        speed: options.speed,
        finalHoldSeconds: options.finalHold,
      })
      inputs = ['-i', options.input]
      timing = `trim=start=${options.start}:end=${end},setpts=(PTS-STARTPTS)/${options.speed},`
      hold = `,tpad=stop_mode=clone:stop_duration=${options.finalHold}`
    } else {
      const { frames, durations } = screenshotInput as { frames: string[]; durations: number[] }
      const dimensions = new Set(
        frames.map((frame) => {
          const stream = probe(ffprobe, frame).stream
          return `${positiveIntegerField(stream, 'width', frame)}x${positiveIntegerField(stream, 'height', frame)}`
        }),
      )
      if (dimensions.size !== 1) {
        throw new MediaError(`all frames must have identical dimensions, got ${[...dimensions].join(', ')}`)
      }
      expectedDuration = durations.reduce((sum, duration) => sum + duration, 0)
      const manifest = join(temporaryRoot, 'frames.ffconcat')
      writeFileSync(manifest, concatManifest(frames, durations))
      inputs = ['-f', 'concat', '-safe', '0', '-i', manifest]
      Object.assign(details, { sourceFrames: frames.length })
    }

    const scale = `scale='min(${options.maxWidth},iw)':-2:flags=lanczos`
    const filters =
      `${timing}fps=${options.fps},${scale}${hold},split[base][palette_input];` +
      `[palette_input]palettegen=max_colors=${options.colors}:stats_mode=full[palette];` +
      '[base][palette]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle'
    run(ffmpeg, [
      '-hide_banner',
      '-loglevel',
      'error',
      ...inputs,
      '-vf',
      filters,
      '-loop',
      '0',
      '-t',
      expectedDuration.toFixed(6),
      '-y',
      temporary,
    ])

    const encoded = probe(ffprobe, temporary)
    const width = positiveIntegerField(encoded.stream, 'width', temporary)
    const height = positiveIntegerField(encoded.stream, 'height', temporary)
    const frames = positiveIntegerField(encoded.stream, 'nb_frames', temporary)
    const actualDuration = formatDuration(encoded, temporary)
    const tolerance = Math.max(0.2, 2 / options.fps)
    if (Math.abs(actualDuration - expectedDuration) > tolerance) {
      throw new MediaError(`expected about ${expectedDuration.toFixed(3)}s, encoded ${actualDuration.toFixed(3)}s`)
    }
    if (width > options.maxWidth) throw new MediaError(`expected width at most ${options.maxWidth}, encoded ${width}`)
    if (frames < 2) throw new MediaError(`expected an animated GIF, encoded ${frames} frame`)
    const bytes = statSync(temporary).size
    if (bytes > options.maxBytes)
      throw new MediaError(`output is ${bytes} bytes, above --max-bytes ${options.maxBytes}`)

    result = {
      output: options.output,
      ...details,
      encodedFrames: frames,
      width,
      height,
      durationSeconds: actualDuration,
      fps: options.fps,
      bytes,
    }
    const cleanupFailures = cleanupTemporary([[temporaryRoot, true]] as const)
    if (cleanupFailures.length > 0) {
      throw new MediaError(`cleanup failed before publication: ${cleanupFailures.join('; ')}`)
    }
    replaceValidated(temporary, options.output, options.force)
  } catch (error) {
    const cleanupFailures = cleanupTemporary(cleanupPaths)
    if (cleanupFailures.length > 0) {
      const detail = `cleanup also failed: ${cleanupFailures.join('; ')}`
      if (error instanceof Error) {
        error.message += `; ${detail}`
        throw error
      }
      throw new MediaError(`${String(error)}; ${detail}`)
    }
    throw error
  }
  const cleanupFailures = cleanupTemporary(cleanupPaths)
  if (result === undefined) throw new MediaError('encoding produced no result')
  if (cleanupFailures.length > 0) Object.assign(result, { cleanupWarnings: cleanupFailures })
  return result
}

function main(): void {
  try {
    const options = parseOptions(process.argv.slice(2))
    if (options === undefined) {
      console.log(USAGE.trimEnd())
      return
    }
    console.log(JSON.stringify(encode(options), null, 2))
  } catch (error) {
    const usage = error instanceof UsageError
    console.error(`encode-browser-gif.mjs: ${error instanceof Error ? error.message : String(error)}`)
    if (usage) console.error('run "encode-browser-gif.mjs --help" for usage')
    process.exitCode = usage ? 2 : 1
  }
}

main()
