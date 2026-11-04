/**
 * The build's empty-output diagnosis, pinned without running the real Vite+ toolchain.
 *
 * build-skills runs each package's build.ts and then normalizes the output directory. A build
 * that succeeds while producing nothing must be a diagnostic, not an unhandled ENOENT from
 * readdirSync, so a scratch package with a no-op build is enough to exercise the guard.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { REPO_ROOT } from './helpers/fixtures.ts'

test('a successful build that writes no bundle is a clean diagnostic', () => {
  const root = mkdtempSync(join(tmpdir(), 'build-skills-nonbundle-'))
  try {
    const copy = (path: string): void => {
      const target = join(root, path)
      mkdirSync(dirname(target), { recursive: true })
      cpSync(join(REPO_ROOT, path), target)
    }
    copy('scripts/build-skills.ts')
    copy('scripts/vendored-notices.ts')
    copy('scripts/vendor-packages.ts')
    const build = join(root, 'package/alpha/build.ts')
    mkdirSync(dirname(build), { recursive: true })
    writeFileSync(
      build,
      "import { mkdirSync, writeFileSync } from 'node:fs'\n" +
        "import { join } from 'node:path'\n" +
        'const out = process.env.SKILL_OUT_ROOT\n' +
        'if (out === undefined) process.exit(1)\n' +
        "mkdirSync(join(out, 'alpha', 'scripts'), { recursive: true })\n" +
        "writeFileSync(join(out, 'alpha', 'scripts', 'readme.txt'), 'not a bundle\\n')\n",
    )
    const result = spawnSync(process.execPath, [join(root, 'scripts/build-skills.ts'), 'alpha'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, SKILL_OUT_ROOT: join(root, 'out') },
    })
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /produced no bundle/)
    assert.doesNotMatch(result.stderr, /ENOENT/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('a successful build that writes nothing is a clean diagnostic', () => {
  const root = mkdtempSync(join(tmpdir(), 'build-skills-empty-'))
  try {
    const copy = (path: string): void => {
      const target = join(root, path)
      mkdirSync(dirname(target), { recursive: true })
      cpSync(join(REPO_ROOT, path), target)
    }
    copy('scripts/build-skills.ts')
    copy('scripts/vendored-notices.ts')
    copy('scripts/vendor-packages.ts')
    const build = join(root, 'package/alpha/build.ts')
    mkdirSync(dirname(build), { recursive: true })
    writeFileSync(build, 'process.exit(0)\n')
    const result = spawnSync(process.execPath, [join(root, 'scripts/build-skills.ts'), 'alpha'], {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, SKILL_OUT_ROOT: join(root, 'out') },
    })
    assert.equal(result.status, 1, result.stderr)
    assert.match(result.stderr, /no output directory/)
    assert.doesNotMatch(result.stderr, /ENOENT/)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
