/**
 * What one command was told to read.
 *
 * A check's scope is one of three forms — `--all`, a path list, or the path list `--files-from`
 * supplies — and a long list goes through a temporary file rather than the argument vector, because
 * the dispatcher is the one place that can expand a whole surface and that list can be longer than a
 * command line allows. The refusal for a missing or contradictory scope is the caller's.
 *
 * Zero external dependencies.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { parseScopeArgs } from '../gate-scope.ts'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/** What one command was told to read. */
export interface SubjectScope {
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
export function scopeOf(name: string, args: readonly string[], usage: (message?: string) => never): SubjectScope {
  const parsed = parseScopeArgs(args)
  if (parsed.rest.length > 0) usage(`${name} does not take ${parsed.rest.join(', ')}`)
  return { all: parsed.all, paths: parsed.paths, filesFrom: parsed.filesFrom }
}
/** Require exactly one scope form, and return the path list it names. */
export function oneScope(name: string, scope: SubjectScope, options: { allowAll: boolean, allowPaths: boolean }, usage: (message?: string) => never): { all: boolean, paths: string[] } {
  const given = [scope.all, scope.paths.length > 0 || scope.filesFrom !== undefined].filter(Boolean).length
  if (given === 0) usage(`${name} needs a scope: ${options.allowAll ? '--all' : ''}${options.allowAll && options.allowPaths ? ' or ' : ''}${options.allowPaths ? '<path...> | --files-from -' : ''}`)
  if (given > 1) usage(`${name} takes one scope, not ${scope.all ? '--all plus a path list' : 'both forms'}`)
  if (scope.all && !options.allowAll) usage(`${name} reads the paths it is handed, so --all is not one of its scopes`)
  if (!scope.all && !options.allowPaths) usage(`${name} asserts over a tree, so it takes --all rather than a path list`)
  return { all: scope.all, paths: materialize(name, scope, usage) }
}
/** The path list a scope names, from the command line or through `--files-from`. */
export function materialize(name: string, scope: SubjectScope, usage: (message?: string) => never): string[] {
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
export function scopeForFiles(paths: readonly string[]): { args: string[], cleanup: () => void } {
  if (paths.length <= 200) return { args: [...paths], cleanup: () => {} }
  const directory = mkdtempSync(join(tmpdir(), 'dsh-spec-scope-'))
  const file = join(directory, 'paths')
  writeFileSync(file, `${paths.join('\n')}\n`)
  return { args: ['--files-from', file], cleanup: () => rmSync(directory, { recursive: true, force: true }) }
}
