/**
 * Resolve the repository a documentation gate operates on.
 *
 * Extracted gates run from the skills collection, so the repository they audit is
 * never the directory the script lives in. `--root <path>` names it explicitly;
 * `DOC_GATE_ROOT` supplies the same value for repeated invocations. Without either,
 * the gate audits the current working directory.
 */

import { resolve } from 'node:path'

/**
 * Return the absolute repository root every gate resolves relative paths against.
 * @returns absolute audit root.
 */
export function resolveRepoRoot(): string {
  const flagIndex = process.argv.indexOf('--root')
  const fromFlag = flagIndex === -1 ? undefined : process.argv[flagIndex + 1]
  const configured = fromFlag ?? process.env.DOC_GATE_ROOT
  return resolve(configured === undefined || configured === '' ? process.cwd() : configured)
}
