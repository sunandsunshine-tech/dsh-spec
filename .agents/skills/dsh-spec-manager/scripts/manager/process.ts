/**
 * Running the children a manager verb needs, and the pool that keeps them readable.
 *
 * A refresh is network-bound, so its `gh` installs run concurrently while their output is kept per
 * child and printed only when that child fails. The initializer is spawned with the same root and
 * engine override the caller gave this process, so the two halves always describe one project.
 *
 * Zero external dependencies.
 */

import { spawn, spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { exitsOf, flagValue } from '../cli-args.ts'

/** The exits this module's failures print under. */
const { fail } = exitsOf('dsh-spec-manager')

/** The initializer beside every other engine module. */
const initializerPath = resolve(import.meta.dirname, '..', 'init-agents-md.ts')

/** Run a command with inherited output; a missing binary is a failure, not a status. */
export function run(command: string, args: string[], dryRun: boolean): void {
  const printable = [command, ...args].join(' ')
  if (dryRun) {
    console.log(`  would run: ${printable}`)
    return
  }
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.error) fail(`${command} could not be run: ${result.error.message}`)
  if ((result.status ?? 1) !== 0) fail(`\`${printable}\` exited ${result.status}`)
}
/** One child process's outcome, captured so parallel runs stay readable. */
export interface ChildResult {
  label: string
  status: number | null
  error?: Error
  output: string
}
/** Run one command, capturing both streams, and resolve rather than throwing. */
export function runCaptured(command: string, args: string[], label: string): Promise<ChildResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.on('error', (error: Error) => resolve({ label, status: null, error, output }))
    child.on('close', (status: number | null) => resolve({ label, status, output }))
  })
}
/**
 * Run one command per item at the same time, and report each by its label.
 *
 * A refresh is network-bound: one `gh skill install` takes about twelve seconds here, so running one
 * per skill in sequence costs minutes of waiting for work that has no order — each child writes its
 * own skill directory and reads nothing the others write. Their output is kept per child and printed
 * only when that child fails, so a failure is still readable and a success costs one line.
 *
 * @param command - the binary to run.
 * @param items - one label and argument list per child.
 * @param dryRun - print the commands instead of running them.
 * @param limit - the most children alive at once; the work is network-bound, so the pool is bounded.
 */
export async function runAll(command: string, items: readonly { label: string, args: string[] }[], dryRun: boolean, limit = 8): Promise<void> {
  if (dryRun) {
    for (const item of items) console.log(`  would run: ${[command, ...item.args].join(' ')}`)
    return
  }
  const results: ChildResult[] = new Array(items.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = next
      next += 1
      const item = items[index]
      if (item === undefined) return
      results[index] = await runCaptured(command, item.args, item.label)
    }
  })
  await Promise.all(workers)
  for (const result of results) {
    if (result.error !== undefined) fail(`${command} could not be run for ${result.label}: ${result.error.message}`)
  }
  const failed = results.filter(result => (result.status ?? 1) !== 0)
  for (const result of results) {
    if ((result.status ?? 1) === 0) console.log(`  ok ${result.label}`)
  }
  if (failed.length === 0) return
  for (const result of failed) {
    console.error(`  FAILED ${result.label} — \`${command}\` exited ${String(result.status)}`)
    const tail = result.output.trim()
    if (tail !== '') console.error(tail.split('\n').map(line => `      ${line}`).join('\n'))
  }
  fail(`${failed.length} of ${results.length} \`${command}\` run(s) failed`)
}
/**
 * The initializer's arguments, carrying a `.agents/skills` override when the caller gave one.
 *
 * The initializer writes the installed engine directory into the managed text, so an install at a
 * non-default directory has to tell it where the skills actually went.
 */
export function initializerArgs(root: string, extra: readonly string[]): string[] {
  const directory = flagValue('--dir')
  return [initializerPath, '--root', root, ...extra, ...(directory === undefined ? [] : ['--dir', directory])]
}
