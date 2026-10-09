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
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { availableParallelism, tmpdir } from 'node:os'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { renderChangeScope } from './change-scope.ts'
import { dispatchWidth, runJobs } from './dispatch/pool.ts'
import type { Job } from './dispatch/pool.ts'
import { finish } from './dispatch/report.ts'
import { materialize, oneScope, scopeForFiles, scopeOf } from './dispatch/scope.ts'
import { exitsOf, extractValue } from './cli-args.ts'
import { expandScope, parseScopeArgs, pathInGateScope } from './gate-scope.ts'
import { COMMANDS, MANAGEMENT, NOUN_VERBS } from './help/catalog.ts'
import { globalHelp, helpLanguage, markdownHelp, subjectHelp } from './help/render.ts'
import { installProject } from './manager/install.ts'
import { statusProject, managerRef } from './manager/status.ts'
import { uninstallProject } from './manager/uninstall.ts'
import { upgradeProject } from './manager/upgrade.ts'
import { readGateRecord, readGateScopes } from './manifest.ts'
import { normsPathOf, readNorms, readNormsRepo, recordUrlOf, renderNormsExplain, renderNormsJson, renderNormsList } from './norms.ts'
import { NORMS_HOOK_START, applyNormsHook, applyNormsPlan, filePathOf, normsPlan, readNormsRecord, recordPathOf, renderNormsPlan, resolveNormsIds } from './norms-apply.ts'
import type { Norm, NormsCatalog } from './norms.ts'
import type { NormsPlan, NormsRecord } from './norms-apply.ts'
import { resolveRepoRoot } from './repo-root.ts'
import type { GateScopeKey, GateScopeRecord } from './manifest.ts'

/** The exits this entry prints under. */
const { fail, refuse } = exitsOf('dsh-spec')

/** Where this file lives: the engine directory, beside every gate. */
const scriptDir = dirname(resolve(process.argv[1] ?? import.meta.dirname))

/** The project being audited: `--root`, the environment, or the current directory. */
const root = resolveRepoRoot()

const argv = process.argv.slice(2)

/** The verbs that act on the skill set rather than reading the project. */
/** Exit 2 with the shape of the command line. */
function usage(message?: string): never {
  if (message !== undefined) console.error(`dsh-spec: ${message}`)
  console.error('dsh-spec: usage: node dsh-spec.ts <command> [flags]')
  console.error('dsh-spec:   a verb acts: install, upgrade, uninstall, status, check [<path...> | --base <ref> | --all]')
  console.error('dsh-spec:   a noun takes a verb: notes check | notes-archived check|write | translation-pair check|list|explain|write|brief | md-links check | norms list | norms explain|install|update|remove')
  console.error(`dsh-spec: see \`node ${invocationPath()} --help\` for the commands and their flags`)
  refuse()
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
  refuse()
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

/** `--root` is the dispatcher's own flag, and `--jobs` is a modifier of every command. */
const withoutRoot = extractValue(argv.slice(1), '--root', usage).rest
const jobsFlag = extractValue(withoutRoot, '--jobs', usage)
const width = dispatchWidth(jobsFlag.values.at(-1), usage)

/** The arguments after the command, with the two global flags taken out. */
const args = jobsFlag.rest

// ------------------------------------------------------------------ the scope

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
    const revisionFlag = extractValue(args, '--revision', usage)
    if (revisionFlag.values.length > 1) usage(`${command} takes --revision once`)
    const revision = revisionFlag.values.at(-1)
    if (revision !== undefined && command !== 'install' && command !== 'upgrade') {
      usage(`${command} does not take --revision`)
    }
    // `--skill` names the one skill `uninstall` removes, and `--with` adds an optional skill to an
    // install; the manager reads both values from the argument vector itself. This table is what
    // decides which command may be handed them, and `--with` may be repeated.
    const skillFlag = extractValue(revisionFlag.rest, '--skill', usage)
    if (skillFlag.values.length > 1) usage(`${command} takes --skill once`)
    if (skillFlag.values.length > 0 && command !== 'uninstall') usage(`${command} does not take --skill`)
    const withFlag = extractValue(skillFlag.rest, '--with', usage)
    if (withFlag.values.length > 0 && command !== 'install') usage(`${command} does not take --with`)
    for (const argument of withFlag.rest) {
      if (argument === '--dry-run' && command !== 'status') continue
      if (argument === '--reinstall' && command === 'upgrade') continue
      if (argument === '--only-skill-set' && command === 'upgrade') continue
      usage(`${command} does not take ${argument}`)
    }
    const dryRun = withFlag.rest.includes('--dry-run')
    if (command === 'install') {
      await installProject(root, { dryRun, jobs: width, revision })
      process.exit(0)
    }
    if (command === 'upgrade') {
      await upgradeProject(root, {
        dryRun,
        reinstall: revisionFlag.rest.includes('--reinstall'),
        skillSetOnly: revisionFlag.rest.includes('--only-skill-set'),
        jobs: width,
        revision,
      })
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
    const results = jobs.length === 0 ? [] : await runJobs(jobs, width, { scriptDir, root })
    for (const cleanup of cleanups) cleanup()
    return finish(results, skipped)
  }

  if (command === 'check') {
    const headFlag = extractValue(args, '--head', usage)
    const baseFlag = extractValue(headFlag.rest, '--base', usage)
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
      const results = await runJobs(jobs, width, { scriptDir, root })
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

    const paths = materialize('check', { all: false, paths: parsed.paths, filesFrom: parsed.filesFrom }, usage)
    await runSelection(paths, keys => `no path handed in is under ${keys.join(', ')}`)
  }

  // ------------------------------------------------------------------ the nouns

  const verbs = NOUN_VERBS[command]
  const verb = args[0]
  if (verb === undefined) hint(`${command} needs a verb: ${verbs?.join(', ') ?? ''}`, command)
  if (verbs === undefined || !verbs.includes(verb)) usage(`${command} has no verb \`${verb}\``)
  const verbArgs = args.slice(1)

  if (command === 'notes') {
    const handed = oneScope('notes check', scopeOf('notes check', verbArgs, usage), { allowAll: true, allowPaths: true }, usage)
    const { jobs, cleanup } = notesJobs(handed)
    const results = await runJobs(jobs, width, { scriptDir, root })
    cleanup()
    finish(results, [])
  }

  if (command === 'notes-archived') {
    oneScope(`notes-archived ${verb}`, scopeOf(`notes-archived ${verb}`, verbArgs, usage), { allowAll: true, allowPaths: false }, usage)
    const gateArgs = ['--all', ...(verb === 'write' ? ['--write'] : [])]
    const results = await runJobs([{ subject: 'notes-archived', gate: ARCHIVE_GATE, args: gateArgs }], width, { scriptDir, root })
    finish(results, [])
  }

  if (command === 'norms') {
    // The catalog is read here rather than by a gate: a project applies the norms it chooses, so
    // what it holds is a selection and not a tree assertion — drift is reported, never failed.
    // `norms list`/`explain` are the reading surface; the verbs below are the write path, and they
    // classify each norm as current, update or drifted, exactly as a managed file does.
    // Help is intercepted before this point, so the language here comes from the environment
    // alone; passing the verb's own arguments would let a norm id be read as `--help`'s value.
    const language = helpLanguage([])
    if (typeof language !== 'string') fail(language.error)
    let catalog: NormsCatalog
    let repo: string
    try {
      catalog = readNorms(normsPathOf(scriptDir))
      repo = readNormsRepo(normsPathOf(scriptDir))
    } catch (error) {
      fail((error as Error).message)
    }
    // The record each norm came from is published as a URL at the revision this project installed;
    // a source tree that was never installed has no ref to link at, so the path is shown instead.
    const ref = managerRef(root)
    const url = ref === undefined ? undefined : (norm: Norm): string => recordUrlOf(repo, ref, norm.source)

    if (verb === 'list' || verb === 'explain') {
      const group = extractValue(verbArgs, '--group', usage)
      const json = group.rest.includes('--json')
      const paths = group.rest.filter(argument => argument !== '--json')
      const unknown = paths.filter(argument => argument.startsWith('-'))
      if (unknown.length > 0) usage(`norms ${verb} does not take ${unknown.join(', ')}`)
      try {
        if (verb === 'list') {
          process.stdout.write(json
            ? renderNormsJson(catalog, { group: group.values.at(-1), url })
            : renderNormsList(catalog, { language, group: group.values.at(-1) }))
        } else {
          const record = readNormsRecord(recordPathOf(root))
          process.stdout.write(renderNormsExplain(catalog, paths, {
            language, applied: record.norms.map(entry => entry.id), url, json,
          }))
        }
      } catch (error) {
        usage((error as Error).message)
      }
      process.exit(0)
    }

    // `update` means the norms this project applied, so it needs no selection of its own; the other
    // verbs name one, and `--group` narrows any of them. `--force` overwrites a block this project
    // edited by hand, which is the one decision an update cannot make for itself.
    const force = verbArgs.includes('--force')
    const group = extractValue(verbArgs.filter(argument => argument !== '--force'), '--group', usage)
    const all = group.rest.includes('--all') || verb === 'update'
    const dryRun = group.rest.includes('--dry-run')
    const ids = group.rest.filter(argument => !argument.startsWith('-'))
    const unknown = group.rest.filter(argument => argument.startsWith('-') && argument !== '--all' && argument !== '--dry-run')
    if (unknown.length > 0) usage(`norms ${verb} does not take ${unknown.join(', ')}`)
    let record: NormsRecord
    try {
      record = readNormsRecord(recordPathOf(root))
    } catch (error) {
      fail((error as Error).message)
    }
    let chosen: string[]
    try {
      chosen = resolveNormsIds(catalog, {
        ids,
        group: group.values.at(-1),
        all,
        applied: verb === 'install' ? undefined : record.norms.map(entry => entry.id),
      })
    } catch (error) {
      usage((error as Error).message)
    }
    const file = existsSync(filePathOf(root)) ? readFileSync(filePathOf(root), 'utf8') : undefined
    let plan: NormsPlan
    try {
      plan = normsPlan(catalog, record, file, { verb, ids: [...new Set(chosen)], force }, language)
    } catch (error) {
      fail((error as Error).message)
    }
    process.stdout.write(renderNormsPlan(plan, language))
    // The hook in `AGENTS.md` exists exactly while the project applies norms, so that a project
    // which applies none carries no line pointing at a file it does not have. Everything outside
    // its two markers is the project's own text and is left alone.
    const agentsPath = join(root, 'AGENTS.md')
    let hook: string | undefined
    let hookLine: string
    if (!existsSync(agentsPath)) {
      hookLine = language === 'zh'
        ? '  AGENTS.md 不存在,因此没有指向规范的指针'
        : '  AGENTS.md is not present, so nothing points at the file'
    } else {
      const current = readFileSync(agentsPath, 'utf8')
      const appliedNorms = plan.record.norms
        .map(entry => catalog.norms.find(norm => norm.id === entry.id))
        .filter((norm): norm is Norm => norm !== undefined)
      const next = applyNormsHook(current, appliedNorms)
      if (next !== current) hook = next
      const had = current.includes(NORMS_HOOK_START)
      const has = next.includes(NORMS_HOOK_START)
      const changed = next !== current
      const state = !had && has
        ? ['added', '已加入']
        : had && !has
          ? ['removed', '已移除']
          : changed ? ['refreshed', '已刷新'] : ['already in step', '已一致']
      hookLine = language === 'zh' ? `  AGENTS.md 的规范小节${state[1]}` : `  AGENTS.md: the norms section is ${state[0]}`
    }
    console.log(hookLine)
    // A block this project edited by hand is reported and kept, so the run refuses: a script has to
    // be able to tell that nothing was taken. `remove` that removed nothing exits non-zero too.
    const drifted = plan.outcomes.some(outcome => outcome.state === 'drifted')
    const refused = drifted || (verb === 'remove' && plan.outcomes.some(outcome => outcome.state !== 'removed'))
    if (dryRun) {
      console.log(language === 'zh' ? '  dry run — 什么都没写;去掉 --dry-run 落盘' : '  dry run — nothing is written; drop --dry-run to apply')
      process.exit(refused ? 1 : 0)
    }
    applyNormsPlan(root, plan)
    if (hook !== undefined) writeFileSync(agentsPath, hook)
    process.exit(refused ? 1 : 0)
  }

  if (command === 'md-links') {
    const handed = oneScope('md-links check', scopeOf('md-links check', verbArgs, usage), { allowAll: false, allowPaths: true }, usage)
    const scope = scopeForFiles(handed.paths)
    const results = await runJobs([
      { subject: 'md-links', gate: LINKS_GATE, args: scope.args },
      { subject: 'md-links', gate: SYNTAX_GATE, args: scope.args },
    ], width, { scriptDir, root })
    scope.cleanup()
    finish(results, [])
  }

  if (command === 'translation-pair') {
    // The briefing answers the same question as the check — what does this pair need — with the
    // update a translator works from, so it is a verb of this noun rather than a command of its own.
    if (verb === 'brief') {
      const [result] = await runJobs([{ subject: 'translation-pair', gate: 'gen-translation-brief', args: verbArgs }], 1, { scriptDir, root })
      process.stdout.write(result?.output ?? '')
      process.exit(result?.status ?? 1)
    }

    if (verb === 'list') {
      if (verbArgs.length > 0) usage('translation-pair list reports the whole corpus and takes no flags or paths')
      const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: ['--list'] }], width, { scriptDir, root })
      finish(results, [])
    }

    if (verb === 'explain') {
      const path = verbArgs[0]
      if (path === undefined || verbArgs.length !== 1 || path.startsWith('-')) usage('translation-pair explain takes one path')
      const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: ['--explain', path] }], width, { scriptDir, root })
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
      const scope = scopeForFiles(materialize('translation-pair check', { all: false, paths: parsed.paths, filesFrom: parsed.filesFrom }, usage))
      const gateArgs = [...scope.args, ...(parsed.rest.includes('--cached') ? ['--cached'] : [])]
      const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: gateArgs }], width, { scriptDir, root })
      scope.cleanup()
      finish(results, [])
    }

    // `write` owns the rest of its own argument grammar: named pairs, or `--all`.
    const results = await runJobs([{ subject: 'translation-pair', gate: PAIRING_GATE, args: ['--write', ...verbArgs] }], width, { scriptDir, root })
    finish(results, [])
  }

  usage(`command \`${command}\` has no implementation`)
}

await main()
