/**
 * The argument vector every entry point reads, and the two ways a command refuses to go on.
 *
 * One home for parsing: the flags that take a value, the subcommand, the project root, the skills
 * directory, and the exit conventions — `fail` (1) for a condition that stopped the work, `refuse`
 * (2) for an invocation the caller can fix by naming what is missing. Every entry reads them here
 * and binds them to the program name it prints, so every line stays the line a reader of that
 * command already sees.
 *
 * Zero external dependencies.
 */

import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/** The two exit conventions, bound to the program name an entry prints. */
export interface Exits {
  /** Stop with one actionable line; nothing half-applied. */
  fail(message: string): never
  /** Refuse the invocation itself, with exit 2; the caller can fix it by naming what is missing. */
  refuse(message?: string): never
}

/**
 * Bind the exit conventions to one program name.
 *
 * `refuse` prints nothing when it is given no message, which is how a command that has already
 * printed its own refusal leaves exit 2 to this one function.
 *
 * @param program - the name each line is prefixed with.
 * @returns the two exits for that entry point.
 */
export function exitsOf(program: string): Exits {
  return {
    fail: (message: string): never => {
      console.error(`${program}: ${message}`)
      process.exit(1)
    },
    refuse: (message?: string): never => {
      if (message !== undefined) console.error(`${program}: ${message}`)
      process.exit(2)
    },
  }
}

/**
 * Value of `--flag value`, when the token after the flag is a value rather than another flag.
 *
 * This is the manager's reading, and every command-level caller uses it: a flag never takes another
 * flag as its value, so `--with --dry-run` is a missing value rather than a skill named
 * `--dry-run`, and `--revision --jobs 4` does not resolve a ref called `--jobs`.
 */
export function flagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  return value === undefined || value.startsWith('--') ? undefined : value
}

/**
 * The token after the flag, whatever it is — the initializer's own reading.
 *
 * The initializer feeds its root straight to `resolve()`, so `--root --write` names `<cwd>/--write`
 * and is refused as "not a directory" with exit 1 and nothing written. The guarded reading above
 * would take `--write` as a missing value instead, fall back to the working directory, let `--write`
 * still apply, and write a project tree where the caller stands — a different command. A hand-run
 * initializer is a documented path, so this reading is kept byte for byte.
 *
 * Only `init-agents-md.ts` uses this, for `--root` and `--dir`; every other caller wants the guarded
 * reading, and `projectRoot`/`skillsDirectory` below are the manager's and use it.
 */
export function rawFlagValue(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

/** Whether `--flag` appears anywhere in the arguments. */
export function hasFlag(name: string): boolean {
  return process.argv.includes(name)
}

/** Every value a repeatable flag was given, in order. */
export function flagValues(name: string): string[] {
  const values: string[] = []
  for (let index = 0; index < process.argv.length; index += 1) {
    if (process.argv[index] !== name) continue
    const value = process.argv[index + 1]
    if (value === undefined || value.startsWith('--')) continue
    values.push(value)
  }
  return values
}

/** The subcommand, the first argument that is not a flag or a flag's value. */
export function subcommand(): string {
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === '--root' || arg === '--dir' || arg === '--revision' || arg === '--skill' || arg === '--with') {
      index += 1
      continue
    }
    if (!arg.startsWith('--')) return arg
  }
  return ''
}

/** The project root: `--root`, else the nearest ancestor holding a `.git`, else the working directory. */
export function projectRoot(): string {
  const configured = flagValue('--root')
  if (configured !== undefined) return resolve(configured)
  let current = resolve(process.cwd())
  for (;;) {
    if (existsSync(join(current, '.git'))) return current
    const parent = dirname(current)
    if (parent === current) return resolve(process.cwd())
    current = parent
  }
}

/** The directory installed skills live in. */
export function skillsDirectory(root: string): string {
  return resolve(root, flagValue('--dir') ?? join('.agents', 'skills'))
}

/**
 * One flag and the value it takes, pulled out of an argument list.
 *
 * A scope parser cannot tell a flag's value from a path, so the flags that take a value are removed
 * before the scope is read: `check --base HEAD~1` has a selection, not a file called `HEAD~1`.
 *
 * @param args - the arguments after the command.
 * @param flag - the flag to remove, with the token after it.
 * @param missing - what to do when the flag has no value; the caller owns that refusal.
 * @returns the values in order, and the arguments that remain.
 */
export function extractValue(args: readonly string[], flag: string, missing: (message: string) => never): { values: string[], rest: string[] } {
  const values: string[] = []
  const rest: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? ''
    if (argument !== flag) {
      rest.push(argument)
      continue
    }
    const value = args[index + 1]
    if (value === undefined) missing(`${flag} needs a value`)
    values.push(value)
    index += 1
  }
  return { values, rest }
}
