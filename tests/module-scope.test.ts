/**
 * Every engine module resolves the names it calls.
 *
 * A missing import fails only at runtime, and only on the branch that uses it: `--files-from` with a
 * file on disk reached an unimported `resolve` in `dispatch/scope.ts`, and no test took that branch,
 * so a post-commit gate found it instead. Two closed sets are checked here, both narrow enough to
 * have no false positives — the Node helpers an engine module calls, and the exits an entry binds for
 * itself. A file is free to declare any of them locally instead.
 */

import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'

/** The skill set's one code home. */
const ENGINE = join(REPO_ROOT, 'skills', 'dsh-spec-manager', 'scripts')

/** Node helpers these modules call rather than declare. */
const BUILTINS = [
  'readFileSync', 'writeFileSync', 'existsSync', 'readdirSync', 'rmSync', 'statSync', 'mkdirSync', 'mkdtempSync',
  'spawn', 'spawnSync', 'createHash', 'createInterface', 'tmpdir', 'join', 'resolve', 'dirname', 'basename',
  'relative', 'sep', 'fileURLToPath', 'availableParallelism',
]

/** The two exit conventions an entry binds under its own name. */
const EXITS = ['fail', 'refuse']

/** The module that defines the exit conventions; every other module binds them for itself. */
const EXIT_DEFINITION = join(ENGINE, 'cli-args.ts')

/** Every TypeScript module under the engine, however deep it is nested. */
function engineModules(directory: string = ENGINE): string[] {
  const found: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...engineModules(path))
    else if (entry.name.endsWith('.ts')) found.push(path)
  }
  return found
}

/**
 * The module without its comments and string literals, so a name is only matched where it is code.
 * Template literals keep the expressions inside `${…}`, because those are code too.
 */
function code(source: string): string {
  let out = ''
  let index = 0
  while (index < source.length) {
    const character = source[index] ?? ''
    const pair = source.slice(index, index + 2)
    if (pair === '//') {
      const end = source.indexOf('\n', index)
      index = end < 0 ? source.length : end
      continue
    }
    if (pair === '/*') {
      const end = source.indexOf('*/', index + 2)
      index = end < 0 ? source.length : end + 2
      out += ' '
      continue
    }
    if (character === '"' || character === "'") {
      let end = index + 1
      while (end < source.length && source[end] !== character) end += source[end] === '\\' ? 2 : 1
      index = end + 1
      out += ' '
      continue
    }
    if (character === '`') {
      let end = index + 1
      while (end < source.length) {
        if (source[end] === '\\') { end += 2; continue }
        if (source[end] === '`') break
        if (source.slice(end, end + 2) === '${') {
          let depth = 1
          let close = end + 2
          while (close < source.length && depth > 0) {
            if (source[close] === '{') depth += 1
            else if (source[close] === '}') depth -= 1
            close += 1
          }
          out += ` ${code(source.slice(end + 2, close - 1))} `
          end = close
          continue
        }
        end += 1
      }
      index = end + 1
      out += ' '
      continue
    }
    out += character
    index += 1
  }
  return out
}

/** The names a module imports, under the name it uses them by. */
function importedNames(source: string): Set<string> {
  const names = new Set<string>()
  for (const match of source.matchAll(/import\s+(?:type\s+)?([^;]*?)\s+from/g)) {
    const clause = (match[1] ?? '').replace(/^type\s+/, '')
    for (const group of clause.matchAll(/\{([^}]*)\}/g)) {
      for (const piece of (group[1] ?? '').split(',')) {
        const alias = piece.trim().split(' as ').pop()?.trim()
        if (alias !== undefined && /^[A-Za-z_$][\w$]*$/.test(alias)) names.add(alias)
      }
    }
    const head = clause.split('{')[0]?.trim().replace(/,$/, '').trim()
    if (head !== undefined && /^[A-Za-z_$][\w$]*$/.test(head)) names.add(head)
  }
  return names
}

/** The names a module declares for itself, at any depth. */
function declaredNames(source: string): Set<string> {
  const names = new Set<string>()
  const declarations = /\b(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g
  for (const match of source.matchAll(declarations)) names.add(match[1] ?? '')
  const destructured = /\b(?:const|let|var)\s*\{([^}]*)\}/g
  for (const match of source.matchAll(destructured)) {
    for (const piece of (match[1] ?? '').split(',')) {
      const name = piece.split(':').pop()?.split('=')[0]?.trim().replace(/^\.\.\./, '')
      if (name !== undefined && /^[A-Za-z_$][\w$]*$/.test(name)) names.add(name)
    }
  }
  return names
}

/** Assert every name of one closed set is resolved wherever the module uses it. */
function assertResolved(names: readonly string[], describe: (name: string, path: string) => string, skip: (path: string) => boolean = () => false): void {
  for (const path of engineModules()) {
    if (skip(path)) continue
    const source = code(readFileSync(path, 'utf8'))
    const available = new Set([...importedNames(source), ...declaredNames(source)])
    for (const name of names) {
      const used = new RegExp(`(?<![.\\w$])${name}(?![\\w$])`).test(source)
      assert.ok(!used || available.has(name), describe(name, path))
    }
  }
}

test('every engine module imports the Node helpers it calls', () => {
  assertResolved(BUILTINS, (name, path) => `${path} uses ${name} without importing or declaring it`)
})

test('every engine module that exits binds the exits it uses', () => {
  assertResolved(EXITS, (name, path) => `${path} calls ${name} without binding it to an entry`, path => path === EXIT_DEFINITION)
})
