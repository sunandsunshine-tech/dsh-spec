/**
 * Run one repository-side script for the functional suite.
 *
 * The suite exercises this repository's own gates — the DCO check and the vendored-notices
 * submission — so a case invokes a `scripts/*.ts` entry through Node directly. A missing entry
 * point is reported as such rather than as a spawn accident.
 */

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './fixtures.ts'

/** One invocation's outcome. */
export interface CliResult {
  status: number
  stdout: string
  stderr: string
  /** Everything the command printed, for an assertion message. */
  output: string
}

/**
 * Run one repository-side script, such as the DCO gate.
 * @param script - path relative to this repository, for example `scripts/verify-dco.ts`.
 * @param args - arguments passed through.
 * @param cwd - directory to run in; this repository by default.
 * @param options - `env` for the variables a case needs to control, such as a `PATH` holding a
 * stand-in for `gh`; a variable set to `undefined` is removed rather than inherited.
 * @returns the exit status and both streams.
 */
export function runScript(
  script: string,
  args: string[] = [],
  cwd: string = REPO_ROOT,
  options: { env?: Record<string, string | undefined> } = {},
): CliResult {
  return run(join(REPO_ROOT, script), cwd, args, options)
}

function run(
  entry: string,
  cwd: string,
  args: string[],
  options: { stdin?: string; env?: Record<string, string | undefined> } = {},
): CliResult {
  if (!existsSync(entry)) {
    return { status: -1, stdout: '', stderr: `missing entry point ${entry}`, output: `MISSING ENTRY POINT: ${entry}` }
  }
  const env: NodeJS.ProcessEnv = { ...process.env }
  for (const [name, value] of Object.entries(options.env ?? {})) {
    if (value === undefined) delete env[name]
    else env[name] = value
  }
  const result = spawnSync(process.execPath, [entry, ...args], {
    cwd,
    encoding: 'utf8',
    input: options.stdin,
    env,
  })
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  return { status: result.status ?? -1, stdout, stderr, output: `${stdout}${stderr}` }
}
