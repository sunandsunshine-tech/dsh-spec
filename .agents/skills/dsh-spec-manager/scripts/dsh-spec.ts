/**
 * The collection's one entry point: subjects with operations.
 *
 * A skill never names a gate script. It names a subject and an operation — `notes --check`,
 * `notes-archived --write`, `translation-pair --list` — and this file decides which checks that
 * subject runs, hands each one the scope the manifest records, and reports one line per subject:
 *
 *   check <subject>: ok | FAIL | skipped — <reason>
 *
 * The report shape is fixed because it is read: `commit --check` prints a line for every subject,
 * including the ones the change did not touch, and the functional suite asserts the selection from
 * those lines. Checks run through a bounded pool — default `min(availableParallelism(), 8)`,
 * `--jobs <n>` or `DSH_SPEC_JOBS` to change it, `--jobs 1` for a sequential run — and their output
 * is captured and printed in record order, so parallelism changes the wall clock and nothing else.
 *
 * Exit codes: `0` clean, `1` a check found something or an operation failed, `2` the invocation
 * itself is wrong (an unknown subject, a missing operation, a scope that contradicts the check).
 *
 * Zero external dependencies.
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { availableParallelism, tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { renderChangeScope } from './change-scope.ts'
import { expandScope, parseScopeArgs, pathInGateScope } from './gate-scope.ts'
import { installProject, statusProject, uninstallProject, upgradeProject } from './manager.ts'
import { readGateScopes } from './manifest.ts'
import { resolveRepoRoot } from './repo-root.ts'
import type { GateScopeRecord } from './manifest.ts'

/** Where this file lives: the engine directory, beside every gate. */
const scriptDir = dirname(resolve(process.argv[1] ?? import.meta.dirname))

/** The project being audited: `--root`, the environment, or the current directory. */
const root = resolveRepoRoot()

const argv = process.argv.slice(2)

/** Every subject this entry point answers to. */
const SUBJECTS = [
  'install',
  'upgrade',
  'uninstall',
  'status',
  'notes',
  'notes-archived',
  'translation-pair',
  'md-links',
  'commit',
  'all',
] as const

/** A subject that reads the project rather than managing the skill set. */
type CheckSubject = 'notes' | 'notes-archived' | 'translation-pair' | 'md-links'

/** One gate invocation: which subject it answers for, which gate, and its arguments. */
interface Job {
  subject: string
  gate: string
  args: string[]
}

/** One job's outcome. */
interface JobResult {
  job: Job
  status: number
  output: string
}

/** Exit 1 with a located failure. */
function fail(message: string): never {
  console.error(`dsh-spec: ${message}`)
  process.exit(1)
}

/** Exit 2 with the usage. */
function usage(message?: string): never {
  if (message !== undefined) console.error(`dsh-spec: ${message}`)
  console.error('dsh-spec: usage: node dsh-spec.ts <subject> <operation> --root <project> [--all | <path...> | --files-from -]')
  console.error(`dsh-spec: subjects: ${SUBJECTS.join(', ')}`)
  process.exit(2)
}

/** Print the reference for this entry point and exit 0. */
function printHelp(): never {
  console.log('dsh-spec — the collected checks, one subject at a time')
  console.log('')
  console.log('  install | upgrade | uninstall | status      the skill set and the project files')
  console.log('  notes            --check [--all | <path...>]  the active Agent Note tree')
  console.log('  notes-archived   --check | --write --all      the frozen archive')
  console.log('  translation-pair --check | --list | --explain <path> | --write')
  console.log('  md-links         --check <path...>            links and rewritten link shapes')
  console.log('  commit           --check [--base <ref>]       the checks this change owes')
  console.log('  all              --check                      every check that reads a tree')
  console.log('')
  console.log('  --jobs <n>   dispatch width (default min(availableParallelism(), 8); DSH_SPEC_JOBS wins)')
  process.exit(0)
}

const subject = argv[0]
if (subject === undefined) usage('name a subject')
if (subject === '--help' || subject === '-h') printHelp()
if (!(SUBJECTS as readonly string[]).includes(subject)) {
  usage(`unknown subject \`${subject}\``)
}

/** The arguments after the subject. */
const rest = argv.slice(1)

// ------------------------------------------------------------------ scheduling

/**
 * Run every job through a bounded pool.
 * @param jobs - the invocations, in report order.
 * @param limit - the most children alive at once.
 * @returns one result per job, in the order the jobs were given.
 */
async function runJobs(jobs: readonly Job[], limit: number): Promise<JobResult[]> {
  const results: JobResult[] = new Array(jobs.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, jobs.length)) }, async () => {
    for (;;) {
      const index = next
      next += 1
      const job = jobs[index]
      if (job === undefined) return
      results[index] = await runJob(job)
    }
  })
  await Promise.all(workers)
  return results
}

/** Run one gate as a child, capturing its output so the report stays in record order. */
function runJob(job: Job): Promise<JobResult> {
  return new Promise((settle) => {
    const child = spawn(process.execPath, [join(scriptDir, `${job.gate}.ts`), ...job.args, '--root', root], { cwd: root })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.on('error', (error: Error) => settle({ job, status: 1, output: `${output}${error.message}\n` }))
    child.on('close', (status: number | null) => settle({ job, status: status ?? 1, output }))
  })
}

/** The report line for one subject, whose shape is fixed because it is read. */
function reportLine(subjectName: string, verdict: 'ok' | 'FAIL' | 'skipped', reason?: string): void {
  console.log(`check ${subjectName}: ${verdict}${reason === undefined ? '' : ` — ${reason}`}`)
}

/**
 * Print the captured output and one verdict per subject, and answer with the exit code.
 *
 * A job that exited 2 was asked to do something it does not do — an operation it does not have, a
 * scope that contradicts it — so the whole invocation is a usage error and nothing else runs.
 */
function finish(results: readonly JobResult[], skipped: readonly { subject: string, reason: string }[]): never {
  const usageJob = results.find(result => result.status === 2)
  if (usageJob !== undefined) {
    process.stdout.write(usageJob.output)
    process.exit(2)
  }
  const bySubject = new Map<string, JobResult[]>()
  for (const result of results) {
    const bucket = bySubject.get(result.job.subject) ?? []
    bucket.push(result)
    bySubject.set(result.job.subject, bucket)
  }
  let failed = 0
  for (const [name, bucket] of bySubject) {
    for (const result of bucket) process.stdout.write(result.output)
    const bad = bucket.filter(result => result.status !== 0)
    reportLine(name, bad.length === 0 ? 'ok' : 'FAIL')
    if (bad.length > 0) failed += 1
  }
  for (const entry of skipped) reportLine(entry.subject, 'skipped', entry.reason)
  process.exit(failed === 0 ? 0 : 1)
}

/** The dispatch width: `--jobs`, then the environment, then the machine. */
function dispatchWidth(parsedRest: readonly string[]): number {
  const flagIndex = parsedRest.indexOf('--jobs')
  const configured = flagIndex === -1 ? undefined : parsedRest[flagIndex + 1]
  const requested = configured ?? process.env.DSH_SPEC_JOBS
  if (requested === undefined || requested === '') return Math.min(availableParallelism(), 8)
  const width = Number.parseInt(requested, 10)
  if (!Number.isFinite(width) || width < 1) usage(`--jobs needs a positive integer, got ${JSON.stringify(requested)}`)
  return width
}

// ------------------------------------------------------------------ the scope

/** What one subject was told to read. */
interface SubjectScope {
  all: boolean
  paths: string[]
  filesFrom?: string
  rest: string[]
}

/** The scope arguments a check subject accepts, with its own flags left in `rest`. */
function subjectScope(args: readonly string[]): SubjectScope {
  const parsed = parseScopeArgs(args)
  return { all: parsed.all, paths: parsed.paths, filesFrom: parsed.filesFrom, rest: parsed.rest }
}

/** Require exactly one scope form, and return the path list it names. */
function oneScope(name: string, scope: SubjectScope, options: { allowAll: boolean, allowPaths: boolean }): { all: boolean, paths: string[] } {
  const given = [scope.all, scope.paths.length > 0 || scope.filesFrom !== undefined].filter(Boolean).length
  if (given === 0) usage(`${name} needs a scope: ${options.allowAll ? '--all' : ''}${options.allowAll && options.allowPaths ? ' or ' : ''}${options.allowPaths ? '<path...> | --files-from -' : ''}`)
  if (given > 1) usage(`${name} takes one scope, not ${options.all ? '--all plus a path list' : 'both forms'}`)
  if (scope.all && !options.allowAll) usage(`${name} reads the paths it is handed, so --all is not one of its scopes`)
  if (!scope.all && !options.allowPaths) usage(`${name} asserts over a tree, so it takes --all rather than a path list`)
  return { all: scope.all, paths: materialize(name, scope) }
}

/** The path list a scope names, from the command line or through `--files-from`. */
function materialize(name: string, scope: SubjectScope): string[] {
  if (scope.filesFrom === undefined) return scope.paths
  const source = scope.filesFrom
  const text = source === '-' ? readFileSync(0, 'utf8') : readFileSync(resolve(process.cwd(), source), 'utf8')
  const paths = text.split('\n').map(line => line.trim()).filter(line => line !== '')
  if (paths.length === 0) usage(`${name}: --files-from ${source} listed no path — an empty scope is not a clean run`)
  return paths
}

/**
 * The scope arguments a gate is given for a resolved path list.
 *
 * A long list goes through a temporary file rather than the argument vector: the dispatcher is the
 * one place that can expand a whole surface, and the reason `--files-from` exists is that the list
 * can be longer than a command line allows.
 */
function scopeForFiles(paths: readonly string[]): { args: string[], cleanup: () => void } {
  if (paths.length <= 200) return { args: [...paths], cleanup: () => {} }
  const directory = mkdtempSync(join(tmpdir(), 'dsh-spec-scope-'))
  const file = join(directory, 'paths')
  writeFileSync(file, `${paths.join('\n')}\n`)
  return { args: ['--files-from', file], cleanup: () => rmSync(directory, { recursive: true, force: true }) }
}

// ------------------------------------------------------------------ the records

const scopeReading = readGateScopes(scriptDir)
if (!scopeReading.ok) fail(scopeReading.error)
const scopes = scopeReading.scopes

/** The recorded scope of one gate, or a failure naming the gate. */
function recordOf(gate: string): GateScopeRecord {
  const record = scopes.get(gate)
  if (record === undefined) fail(`no scope is recorded for \`${gate}\``)
  return record
}

// ------------------------------------------------------------------ the checks

const NOTES_GATE = 'verify-agent-note-classification'
const FORMAT_GATE = 'verify-agent-note-format'
const ARCHIVE_GATE = 'verify-archived-agent-notes'
const PAIRING_GATE = 'verify-translation-pairing'
const LINKS_GATE = 'verify-md-links'
const SYNTAX_GATE = 'verify-md-link-syntax'

/** The notes subject: a tree assertion plus the format of the notes it was handed. */
function notesJobs(handed: { all: boolean, paths: string[] }): { jobs: Job[], cleanup: () => void } {
  const walked = handed.all ? expandScope(root, 'notes') : handed.paths
  const scope = scopeForFiles(walked)
  const jobs: Job[] = [{ subject: 'notes', gate: NOTES_GATE, args: ['--all'] }]
  if (walked.length > 0) jobs.push({ subject: 'notes', gate: FORMAT_GATE, args: scope.args })
  return { jobs, cleanup: scope.cleanup }
}

async function main(): Promise<void> {
  const width = dispatchWidth(rest)

  // ------------------------------------------------------------------ management

  if (subject === 'install' || subject === 'upgrade' || subject === 'uninstall' || subject === 'status') {
    // `--root` and its value belong to the dispatcher, not to the subject's own flags.
    const flags = rest.filter((argument, index, all) => argument !== '--root' && all[index - 1] !== '--root')
    for (let index = 0; index < flags.length; index += 1) {
      const argument = flags[index] ?? ''
      if (argument === '--dry-run') continue
      if (argument === '--reinstall') {
        if (subject === 'upgrade') continue
        usage(`${subject} does not take --reinstall`)
      }
      if (argument === '--jobs') {
        index += 1
        continue
      }
      usage(`${subject} does not take ${argument}`)
    }
    const dryRun = flags.includes('--dry-run')
    if (subject === 'install') {
      await installProject(root, { dryRun, jobs: width })
      process.exit(0)
    }
    if (subject === 'upgrade') {
      await upgradeProject(root, { dryRun, reinstall: flags.includes('--reinstall'), jobs: width })
      process.exit(0)
    }
    if (subject === 'uninstall') {
      uninstallProject(root, dryRun)
      process.exit(0)
    }
    statusProject(root)
    process.exit(0)
  }

  if (subject === 'notes') {
    const op = rest.includes('--check')
    if (!op) usage('notes needs --check')
    const handed = oneScope('notes --check', subjectScope(rest.filter(argument => argument !== '--check')), { allowAll: true, allowPaths: true })
    const { jobs, cleanup } = notesJobs(handed)
    const results = await runJobs(jobs, width)
    cleanup()
    finish(results, [])
  }

  if (subject === 'notes-archived') {
    const write = rest.includes('--write')
    const check = rest.includes('--check')
    if (write === check) usage('notes-archived needs exactly one of --check or --write')
    const scope = subjectScope(rest.filter(argument => argument !== '--check' && argument !== '--write'))
    oneScope('notes-archived', scope, { allowAll: true, allowPaths: false })
    const results = await runJobs([{ subject: 'notes-archived', gate: ARCHIVE_GATE, args: ['--all', ...(write ? ['--write'] : [])] }], width)
    finish(results, [])
  }

  if (subject === 'md-links') {
    if (!rest.includes('--check')) usage('md-links needs --check')
    const handed = oneScope('md-links --check', subjectScope(rest.filter(argument => argument !== '--check')), { allowAll: false, allowPaths: true })
    const scope = scopeForFiles(handed.paths)
    const results = await runJobs([
      { subject: 'md-links', gate: LINKS_GATE, args: scope.args },
      { subject: 'md-links', gate: SYNTAX_GATE, args: scope.args },
    ], width)
    scope.cleanup()
    finish(results, [])
  }

  if (subject === 'translation-pair') {
    const operations = ['--check', '--write', '--list', '--explain', '--cached'].filter(operation => rest.includes(operation))
    if (operations.length !== 1) usage('translation-pair needs exactly one of --check, --write, --list, --explain, --cached')
    if (operations[0] === '--check') {
      const parsed = subjectScope(rest)
      if (!parsed.all && parsed.paths.length === 0 && parsed.filesFrom === undefined) {
        usage('translation-pair --check needs the pairs it should read: <path...> or --files-from -')
      }
    }
    // The gate owns the rest of this subject's argument grammar: named pairs, `--write --all`,
    // `--cached`, and `--explain <path>` all pass through untouched.
    const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: rest.filter(argument => argument !== '--check') }], width)
    finish(results, [])
  }

  if (subject === 'all') {
    if (!rest.includes('--check')) usage('all needs --check')
    const notes = notesJobs({ all: true, paths: [] })
    const jobs: Job[] = [...notes.jobs, { subject: 'notes-archived', gate: ARCHIVE_GATE, args: ['--all'] }]
    const results = await runJobs(jobs, width)
    notes.cleanup()
    finish(results, [])
  }

  if (subject === 'commit') {
    if (!rest.includes('--check')) usage('commit needs --check')
    const valueOf = (flag: string, fallback: string): string => {
      const index = rest.indexOf(flag)
      if (index === -1) return fallback
      const value = rest[index + 1]
      if (value === undefined) usage(`${flag} needs a value`)
      return value
    }
    const base = valueOf('--base', 'HEAD')
    const head = valueOf('--head', 'HEAD')
    let changed: string[]
    try {
      const report = JSON.parse(renderChangeScope(['--base', base, '--head', head], root)) as {
        paths: { committed: string[], staged: string[], unstaged: string[], untracked: string[] }
      }
      changed = [...new Set([
        ...report.paths.committed,
        ...report.paths.staged,
        ...report.paths.unstaged,
        ...report.paths.untracked,
      ])].sort()
    } catch (error) {
      fail(`${error instanceof Error ? error.message : String(error)}`)
    }

    const owns = (gate: string): string[] => {
      const record = recordOf(gate)
      return changed.filter(path => pathInGateScope(record, path))
    }
    const jobs: Job[] = []
    const skipped: { subject: string, reason: string }[] = []
    const cleanups: (() => void)[] = []

    const noteChanges = owns(NOTES_GATE)
    const formatChanges = owns(FORMAT_GATE)
    if (noteChanges.length === 0) {
      skipped.push({ subject: 'notes', reason: `nothing changed under ${recordOf(NOTES_GATE).keys.join(', ')}` })
    } else {
      jobs.push({ subject: 'notes', gate: NOTES_GATE, args: ['--all'] })
      if (formatChanges.length > 0) {
        const scope = scopeForFiles(formatChanges)
        cleanups.push(scope.cleanup)
        jobs.push({ subject: 'notes', gate: FORMAT_GATE, args: scope.args })
      }
    }

    const archiveChanges = owns(ARCHIVE_GATE)
    if (archiveChanges.length === 0) {
      skipped.push({ subject: 'notes-archived', reason: `nothing changed under ${recordOf(ARCHIVE_GATE).keys.join(', ')}` })
    } else {
      jobs.push({ subject: 'notes-archived', gate: ARCHIVE_GATE, args: ['--all'] })
    }

    const pairChanges = owns(PAIRING_GATE)
    if (pairChanges.length === 0) {
      skipped.push({ subject: 'translation-pair', reason: `nothing changed under ${recordOf(PAIRING_GATE).keys.join(', ')}` })
    } else {
      const scope = scopeForFiles(pairChanges)
      cleanups.push(scope.cleanup)
      jobs.push({ subject: 'translation-pair', gate: PAIRING_GATE, args: scope.args })
    }

    const linkChanges = owns(LINKS_GATE)
    if (linkChanges.length === 0) {
      skipped.push({ subject: 'md-links', reason: `nothing changed under ${recordOf(LINKS_GATE).keys.join(', ')}` })
    } else {
      const scope = scopeForFiles(linkChanges)
      cleanups.push(scope.cleanup)
      jobs.push({ subject: 'md-links', gate: LINKS_GATE, args: scope.args })
      jobs.push({ subject: 'md-links', gate: SYNTAX_GATE, args: scope.args })
    }

    const results = jobs.length === 0 ? [] : await runJobs(jobs, width)
    for (const cleanup of cleanups) cleanup()
    finish(results, skipped)
  }

  usage(`subject \`${subject}\` has no implementation`)
}

await main()
