/**
 * The collection's one entry point: commands at two levels.
 *
 * A skill never names a gate script. It names a command — `check`, `notes check`,
 * `notes-archived write`, `translation-pair list` — and this file decides which checks that command
 * runs, hands each one the scope the manifest records, and reports one line per check:
 *
 *   check <subject>: ok | FAIL | skipped — <reason>
 *
 * An action is a subcommand and a flag is a modifier. A noun takes a verb; a verb acts. The scope a
 * command reads is the cheap one unless a flag widens it: `check <path...>` reads what the paths
 * touch, `check --base <ref>` computes that list from a change, and `--all` is how a caller says "the
 * whole tree" out loud. A command whose scope is missing prints the forms and exits 2 rather than
 * choosing one for the caller — a bare command never reads the corpus.
 *
 * The report shape is fixed because it is read: `check --base <ref>` prints a line for every check
 * the change owes, including the ones it skipped and why, and the functional suite asserts the
 * selection from those lines. Checks run through a bounded pool — default
 * `min(availableParallelism(), 8)`, `--jobs <n>` or `DSH_SPEC_JOBS` to change it, `--jobs 1` for a
 * sequential run — and their output is captured and printed in record order, so parallelism changes
 * the wall clock and nothing else.
 *
 * Exit codes: `0` clean, `1` a check found something or an action failed, `2` the invocation itself
 * is wrong (an unknown command, a noun without its verb, a missing scope).
 *
 * Zero external dependencies.
 */

import { spawn } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { availableParallelism, tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { renderChangeScope } from './change-scope.ts'
import { expandScope, parseScopeArgs, pathInGateScope } from './gate-scope.ts'
import { globalHelp, helpLanguage, markdownHelp, subjectHelp } from './help.ts'
import { installProject, statusProject, uninstallProject, upgradeProject } from './manager.ts'
import { readGateRecord, readGateScopes } from './manifest.ts'
import { resolveRepoRoot } from './repo-root.ts'
import type { GateScopeKey, GateScopeRecord } from './manifest.ts'

/** Where this file lives: the engine directory, beside every gate. */
const scriptDir = dirname(resolve(process.argv[1] ?? import.meta.dirname))

/** The project being audited: `--root`, the environment, or the current directory. */
const root = resolveRepoRoot()

const argv = process.argv.slice(2)

/** The verbs that act on the skill set rather than reading the project. */
const MANAGEMENT = ['install', 'upgrade', 'uninstall', 'status'] as const

/** The nouns, each with the verbs it answers to. */
const NOUN_VERBS: Readonly<Record<string, readonly string[]>> = {
  notes: ['check'],
  'notes-archived': ['check', 'write'],
  'translation-pair': ['check', 'list', 'explain', 'write', 'brief'],
  'md-links': ['check'],
}

/** Every command the entry point answers to at the top level. */
const COMMANDS: readonly string[] = [...MANAGEMENT, 'check', ...Object.keys(NOUN_VERBS)]

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

/** Exit 2 with the shape of the command line. */
function usage(message?: string): never {
  if (message !== undefined) console.error(`dsh-spec: ${message}`)
  console.error('dsh-spec: usage: node dsh-spec.ts <command> [flags]')
  console.error('dsh-spec:   a verb acts: install, upgrade, uninstall, status, check [<path...> | --base <ref> | --all]')
  console.error('dsh-spec:   a noun takes a verb: notes check | notes-archived check|write | translation-pair check|list|explain|write|brief | md-links check')
  console.error(`dsh-spec: see \`node ${invocationPath()} --help\` for the commands and their flags`)
  process.exit(2)
}

/**
 * Exit 2 with the one thing the caller did not say, and the page that answers it.
 *
 * A missing scope is not the same as a bad one: the caller asked for a check and left out what to
 * check, so the reply names the forms instead of a general usage screen.
 */
function hint(message: string, address: string): never {
  console.error(`dsh-spec: ${message}`)
  console.error(`dsh-spec: see \`node ${invocationPath()} ${address} -h\` for the forms and an example`)
  process.exit(2)
}

/**
 * The command as this installation spells it, for the help's usage line.
 *
 * The engine sits inside the project it audits, so the path is derived from where this file is. When
 * it does not — a script run against a foreign root — the help names the file alone rather than
 * printing a path that climbs out of the project.
 */
function invocationPath(): string {
  const engine = relative(root, scriptDir).split(sep).join('/')
  return engine.startsWith('..') ? 'dsh-spec.ts' : `${engine}/dsh-spec.ts`
}

// Help is answered before anything else: it must work even when the record beside it is broken, and
// it needs no manifest, scope or git repository. The tokens before `--help` are the address — none
// for the whole screen, one for a command, two for a noun's verb.
if (argv.includes('--help') || argv.includes('-h')) {
  const at = argv.findIndex(argument => argument === '--help' || argument === '-h')
  const address = argv.slice(0, at)
  const language = helpLanguage(argv)
  if (typeof language !== 'string') usage(language.error)
  if (address.length > 2) usage(`\`${address.join(' ')}\` is not a command`)
  const markdown = argv.includes('--markdown')
  if (markdown && address.length > 0) usage('--markdown prints the whole reference, so it takes no command')
  // The screen names this installation's path, because a reader copies it. The reference names the
  // engine directory instead: it ships into projects whose path differs from the one it was rendered
  // in, so a resolved path would be wrong wherever it landed.
  const invocation = markdown ? '<engine>/dsh-spec.ts' : invocationPath()
  if (address.length === 0) {
    process.stdout.write(markdown ? markdownHelp(language, invocation) : globalHelp(language, invocation))
    process.exit(0)
  }
  const [name, verb] = address
  if (name === undefined || !COMMANDS.includes(name)) usage(`unknown command \`${name ?? ''}\``)
  if (verb === undefined) {
    process.stdout.write(subjectHelp(name, language, invocation))
    process.exit(0)
  }
  if (!(NOUN_VERBS[name] ?? []).includes(verb)) usage(`${name} has no verb \`${verb}\``)
  process.stdout.write(subjectHelp(`${name} ${verb}`, language, invocation))
  process.exit(0)
}

const command = argv[0]
if (command === undefined) usage('name a command')
if (!COMMANDS.includes(command)) usage(`unknown command \`${command}\``)

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
 * A job that exited 2 was asked to do something it does not do — a scope that contradicts it — so
 * the whole invocation is a usage error and nothing else runs.
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
function dispatchWidth(configured: string | undefined): number {
  const requested = configured ?? process.env.DSH_SPEC_JOBS
  if (requested === undefined || requested === '') return Math.min(availableParallelism(), 8)
  const width = Number.parseInt(requested, 10)
  if (!Number.isFinite(width) || width < 1) usage(`--jobs needs a positive integer, got ${JSON.stringify(requested)}`)
  return width
}

/**
 * One flag and the value it takes, pulled out of an argument list.
 *
 * A scope parser cannot tell a flag's value from a path, so the flags that take a value are removed
 * before the scope is read: `check --base HEAD~1` has a selection, not a file called `HEAD~1`.
 *
 * @param args - the arguments after the command.
 * @param flag - the flag to remove, with the token after it.
 * @returns the values in order, and the arguments that remain.
 */
function extractValue(args: readonly string[], flag: string): { values: string[], rest: string[] } {
  const values: string[] = []
  const rest: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? ''
    if (argument !== flag) {
      rest.push(argument)
      continue
    }
    const value = args[index + 1]
    if (value === undefined) usage(`${flag} needs a value`)
    values.push(value)
    index += 1
  }
  return { values, rest }
}

/** `--root` is the dispatcher's own flag, and `--jobs` is a modifier of every command. */
const withoutRoot = extractValue(argv.slice(1), '--root').rest
const jobsFlag = extractValue(withoutRoot, '--jobs')
const width = dispatchWidth(jobsFlag.values.at(-1))

/** The arguments after the command, with the two global flags taken out. */
const args = jobsFlag.rest

// ------------------------------------------------------------------ the scope

/** What one command was told to read. */
interface SubjectScope {
  all: boolean
  paths: string[]
  filesFrom?: string
}

/**
 * The scope arguments a check reads, refusing anything else.
 * @param name - the command as it is spelled on the command line, for the refusal.
 * @param args - the arguments after the verb.
 * @returns the three scope forms.
 */
function scopeOf(name: string, args: readonly string[]): SubjectScope {
  const parsed = parseScopeArgs(args)
  if (parsed.rest.length > 0) usage(`${name} does not take ${parsed.rest.join(', ')}`)
  return { all: parsed.all, paths: parsed.paths, filesFrom: parsed.filesFrom }
}

/** Require exactly one scope form, and return the path list it names. */
function oneScope(name: string, scope: SubjectScope, options: { allowAll: boolean, allowPaths: boolean }): { all: boolean, paths: string[] } {
  const given = [scope.all, scope.paths.length > 0 || scope.filesFrom !== undefined].filter(Boolean).length
  if (given === 0) usage(`${name} needs a scope: ${options.allowAll ? '--all' : ''}${options.allowAll && options.allowPaths ? ' or ' : ''}${options.allowPaths ? '<path...> | --files-from -' : ''}`)
  if (given > 1) usage(`${name} takes one scope, not ${scope.all ? '--all plus a path list' : 'both forms'}`)
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

/**
 * Refuse to run anything unless the recorded gate names and the scripts beside them agree.
 *
 * The record is the authority, but it is only half of a gate: the other half is a `verify-*.ts`
 * file in this directory. A recorded name with no script, and a script the record does not name,
 * are both refusals — printed with both sides named, before a single check starts — because a
 * helper module that happens to be named `verify-*` must never become runnable, and a recorded gate
 * that lost its script must never be silently reported as green.
 */
function reconcile(): void {
  const record = readGateRecord(scriptDir)
  if (!record.ok) fail(record.error)
  const beside = readdirSync(scriptDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.startsWith('verify-') && entry.name.endsWith('.ts'))
    .map(entry => entry.name.slice(0, -'.ts'.length))
    .sort()
  const unbacked = record.names.filter(name => !beside.includes(name))
  const unrecorded = beside.filter(name => !record.names.includes(name))
  if (unbacked.length === 0 && unrecorded.length === 0) return
  console.error('dsh-spec: refusing to run anything — the gate record and the scripts beside it disagree')
  console.error(`dsh-spec:   the record names ${record.names.length} gate(s): ${record.names.join(', ') || 'none'}`)
  console.error(`dsh-spec:   ${scriptDir} holds ${beside.length} \`verify-*.ts\` script(s): ${beside.join(', ') || 'none'}`)
  for (const name of unbacked) console.error(`dsh-spec:   recorded but no \`${name}.ts\` beside the entry point`)
  for (const name of unrecorded) console.error(`dsh-spec:   \`${name}.ts\` is beside the entry point but the record does not name it`)
  process.exit(1)
}

reconcile()

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
  // ------------------------------------------------------------------ management

  if ((MANAGEMENT as readonly string[]).includes(command)) {
    for (const argument of args) {
      if (argument === '--dry-run' && command !== 'status') continue
      if (argument === '--reinstall' && command === 'upgrade') continue
      usage(`${command} does not take ${argument}`)
    }
    const dryRun = args.includes('--dry-run')
    if (command === 'install') {
      await installProject(root, { dryRun, jobs: width })
      process.exit(0)
    }
    if (command === 'upgrade') {
      await upgradeProject(root, { dryRun, reinstall: args.includes('--reinstall'), jobs: width })
      process.exit(0)
    }
    if (command === 'uninstall') {
      uninstallProject(root, dryRun)
      process.exit(0)
    }
    statusProject(root)
    process.exit(0)
  }

  // ------------------------------------------------------------------ check

  /**
   * The checks one resolved path list owes, with the ones it does not owe and why.
   *
   * A path is handed to the check that claims it and to no other, and a subject with nothing to read
   * is reported as skipped rather than dropped: the report is the record of what this selection did
   * and did not run.
   */
  function jobsForPaths(paths: readonly string[], skipReason: (keys: readonly GateScopeKey[]) => string): { jobs: Job[], skipped: { subject: string, reason: string }[], cleanups: (() => void)[] } {
    const owns = (gate: string): string[] => {
      const record = recordOf(gate)
      return paths.filter(path => pathInGateScope(record, path))
    }
    const jobs: Job[] = []
    const skipped: { subject: string, reason: string }[] = []
    const cleanups: (() => void)[] = []

    const noteChanges = owns(NOTES_GATE)
    if (noteChanges.length === 0) {
      skipped.push({ subject: 'notes', reason: skipReason(recordOf(NOTES_GATE).keys) })
    } else {
      jobs.push({ subject: 'notes', gate: NOTES_GATE, args: ['--all'] })
      const formatChanges = owns(FORMAT_GATE)
      if (formatChanges.length > 0) {
        const scope = scopeForFiles(formatChanges)
        cleanups.push(scope.cleanup)
        jobs.push({ subject: 'notes', gate: FORMAT_GATE, args: scope.args })
      }
    }

    const archiveChanges = owns(ARCHIVE_GATE)
    if (archiveChanges.length === 0) {
      skipped.push({ subject: 'notes-archived', reason: skipReason(recordOf(ARCHIVE_GATE).keys) })
    } else {
      jobs.push({ subject: 'notes-archived', gate: ARCHIVE_GATE, args: ['--all'] })
    }

    const pairChanges = owns(PAIRING_GATE)
    if (pairChanges.length === 0) {
      skipped.push({ subject: 'translation-pair', reason: skipReason(recordOf(PAIRING_GATE).keys) })
    } else {
      const scope = scopeForFiles(pairChanges)
      cleanups.push(scope.cleanup)
      jobs.push({ subject: 'translation-pair', gate: PAIRING_GATE, args: scope.args })
    }

    const linkChanges = owns(LINKS_GATE)
    if (linkChanges.length === 0) {
      skipped.push({ subject: 'md-links', reason: skipReason(recordOf(LINKS_GATE).keys) })
    } else {
      const scope = scopeForFiles(linkChanges)
      cleanups.push(scope.cleanup)
      jobs.push({ subject: 'md-links', gate: LINKS_GATE, args: scope.args })
      jobs.push({ subject: 'md-links', gate: SYNTAX_GATE, args: scope.args })
    }

    return { jobs, skipped, cleanups }
  }

  /** Run the checks a selection resolved to, and report the subjects it skipped. */
  async function runSelection(paths: readonly string[], skipReason: (keys: readonly GateScopeKey[]) => string): Promise<never> {
    const { jobs, skipped, cleanups } = jobsForPaths(paths, skipReason)
    const results = jobs.length === 0 ? [] : await runJobs(jobs, width)
    for (const cleanup of cleanups) cleanup()
    return finish(results, skipped)
  }

  if (command === 'check') {
    const headFlag = extractValue(args, '--head')
    const baseFlag = extractValue(headFlag.rest, '--base')
    const parsed = parseScopeArgs(baseFlag.rest)
    if (parsed.rest.length > 0) usage(`check does not take ${parsed.rest.join(', ')}`)
    const handed = parsed.paths.length > 0 || parsed.filesFrom !== undefined
    const selections = [handed, parsed.all, baseFlag.values.length > 0].filter(Boolean).length
    if (selections === 0) hint('check needs a selection: <path...>, --base <ref>, or --all', 'check')
    if (selections > 1) usage('check takes one selection, not two of <path...>, --base <ref> and --all')
    if (headFlag.values.length > 0 && baseFlag.values.length === 0) usage('check takes --head only beside --base')

    if (parsed.all) {
      const notes = notesJobs({ all: true, paths: [] })
      const jobs: Job[] = [...notes.jobs, { subject: 'notes-archived', gate: ARCHIVE_GATE, args: ['--all'] }]
      const results = await runJobs(jobs, width)
      notes.cleanup()
      finish(results, [])
    }

    if (baseFlag.values.length > 0) {
      const base = baseFlag.values.at(-1) ?? 'HEAD'
      const head = headFlag.values.at(-1) ?? 'HEAD'
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
      await runSelection(changed, keys => `nothing changed under ${keys.join(', ')}`)
    }

    const paths = materialize('check', { all: false, paths: parsed.paths, filesFrom: parsed.filesFrom })
    await runSelection(paths, keys => `no path handed in is under ${keys.join(', ')}`)
  }

  // ------------------------------------------------------------------ the nouns

  const verbs = NOUN_VERBS[command]
  const verb = args[0]
  if (verb === undefined) hint(`${command} needs a verb: ${verbs?.join(', ') ?? ''}`, command)
  if (verbs === undefined || !verbs.includes(verb)) usage(`${command} has no verb \`${verb}\``)
  const verbArgs = args.slice(1)

  if (command === 'notes') {
    const handed = oneScope('notes check', scopeOf('notes check', verbArgs), { allowAll: true, allowPaths: true })
    const { jobs, cleanup } = notesJobs(handed)
    const results = await runJobs(jobs, width)
    cleanup()
    finish(results, [])
  }

  if (command === 'notes-archived') {
    oneScope(`notes-archived ${verb}`, scopeOf(`notes-archived ${verb}`, verbArgs), { allowAll: true, allowPaths: false })
    const gateArgs = ['--all', ...(verb === 'write' ? ['--write'] : [])]
    const results = await runJobs([{ subject: 'notes-archived', gate: ARCHIVE_GATE, args: gateArgs }], width)
    finish(results, [])
  }

  if (command === 'md-links') {
    const handed = oneScope('md-links check', scopeOf('md-links check', verbArgs), { allowAll: false, allowPaths: true })
    const scope = scopeForFiles(handed.paths)
    const results = await runJobs([
      { subject: 'md-links', gate: LINKS_GATE, args: scope.args },
      { subject: 'md-links', gate: SYNTAX_GATE, args: scope.args },
    ], width)
    scope.cleanup()
    finish(results, [])
  }

  if (command === 'translation-pair') {
    // The briefing answers the same question as the check — what does this pair need — with the
    // update a translator works from, so it is a verb of this noun rather than a command of its own.
    if (verb === 'brief') {
      const [result] = await runJobs([{ subject: 'translation-pair', gate: 'gen-translation-brief', args: verbArgs }], 1)
      process.stdout.write(result?.output ?? '')
      process.exit(result?.status ?? 1)
    }

    if (verb === 'list') {
      if (verbArgs.length > 0) usage('translation-pair list reports the whole corpus and takes no flags or paths')
      const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: ['--list'] }], width)
      finish(results, [])
    }

    if (verb === 'explain') {
      const path = verbArgs[0]
      if (path === undefined || verbArgs.length !== 1 || path.startsWith('-')) usage('translation-pair explain takes one path')
      const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: ['--explain', path] }], width)
      finish(results, [])
    }

    if (verb === 'check') {
      const parsed = parseScopeArgs(verbArgs)
      const unknown = parsed.rest.filter(flag => flag !== '--cached')
      if (unknown.length > 0) usage(`translation-pair check does not take ${unknown.join(', ')}`)
      if (parsed.all) usage('translation-pair check reads the paths it is handed, so --all is not one of its scopes')
      if (parsed.paths.length === 0 && parsed.filesFrom === undefined) {
        hint('translation-pair check needs the pairs it should read: <pair...> or --files-from -', 'translation-pair check')
      }
      const scope = scopeForFiles(materialize('translation-pair check', { all: false, paths: parsed.paths, filesFrom: parsed.filesFrom }))
      const gateArgs = [...scope.args, ...(parsed.rest.includes('--cached') ? ['--cached'] : [])]
      const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: gateArgs }], width)
      scope.cleanup()
      finish(results, [])
    }

    // `write` owns the rest of its own argument grammar: named pairs, or `--all`.
    const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: ['--write', ...verbArgs] }], width)
    finish(results, [])
  }

  usage(`command \`${command}\` has no implementation`)
}

await main()
