/**
 * Invoke the engine the way a project does, and parse the report a dispatch prints.
 *
 * The suite targets the **source** engine under `skills/`, not the installed copy under
 * `.agents/skills/`: the installed copy is a deployment that changes only through `gh`, and a test
 * that read it would test yesterday's revision. When the entry point does not exist yet, the runner
 * says so in the failure message rather than reporting a spawn accident.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './fixtures.ts'

/** The one entry point the design defines. */
export const CLI = join(REPO_ROOT, 'skills', 'dsh-spec-manager', 'scripts', 'dsh-spec.ts')

/** One invocation's outcome. */
export interface CliResult {
  status: number
  stdout: string
  stderr: string
  /** Everything the command printed, for an assertion message. */
  output: string
}

/**
 * Run the CLI against a fixture.
 * @param root - the project root the command audits.
 * @param args - arguments before the `--root` the runner appends.
 * @param stdin - the path list `--files-from -` reads, when the case uses it.
 * @returns the exit status and both streams.
 */
export function runCli(root: string, args: string[], stdin?: string): CliResult {
  return run(CLI, root, args, stdin)
}

/**
 * Run one repository-side script, such as the provenance gate.
 * @param script - path relative to this repository, for example `scripts/verify-port-provenance.ts`.
 * @param args - arguments passed through.
 * @param cwd - directory to run in; this repository by default.
 * @returns the exit status and both streams.
 */
export function runScript(script: string, args: string[] = [], cwd: string = REPO_ROOT): CliResult {
  return run(join(REPO_ROOT, script), cwd, args)
}

function run(entry: string, cwd: string, args: string[], stdin?: string): CliResult {
  if (!existsSync(entry)) {
    return { status: -1, stdout: '', stderr: `missing entry point ${entry}`, output: `MISSING ENTRY POINT: ${entry}` }
  }
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    encoding: 'utf8',
    input: stdin,
  })
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  return { status: result.status ?? -1, stdout, stderr, output: `${stdout}${stderr}` }
}

/** One line of a dispatch report: which check, and what became of it. */
export interface DispatchLine {
  subject: string
  verdict: 'ok' | 'FAIL' | 'skipped'
  reason: string
}

/**
 * Parse the dispatch report, whose shape the design fixes: one line per check, in record order.
 * @param output - the command's combined output.
 * @returns one entry per reported check, or an empty list when the report does not match.
 */
export function dispatchLines(output: string): DispatchLine[] {
  const lines: DispatchLine[] = []
  for (const raw of output.split('\n')) {
    const match = /^check ([a-z-]+): (ok|FAIL|skipped)(?: — (.*))?$/.exec(raw.trim())
    if (match === null) continue
    lines.push({ subject: match[1] ?? '', verdict: match[2] as DispatchLine['verdict'], reason: match[3] ?? '' })
  }
  return lines
}

/** The subjects a dispatch actually ran, in report order. */
export function selected(output: string): string[] {
  return dispatchLines(output).filter(line => line.verdict !== 'skipped').map(line => line.subject)
}
