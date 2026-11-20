/**
 * The pinned toolchain: one pnpm version in every place that records it.
 *
 * package.json is the contract, the checks workflow runs the same version, and pnpm 12 writes that
 * version into the lockfile's self-management document. A bump that updates one place but not the
 * others silently splits local and CI behaviour, so the suite fails here first.
 */

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { test } from 'node:test'
import { parse } from 'yaml'
import { REPO_ROOT } from './helpers/fixtures.ts'

test('the pinned pnpm version agrees across package.json, the workflow and the lockfile', () => {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    packageManager?: string
  }
  const pinnedMatch = /^pnpm@(.+)$/.exec(manifest.packageManager ?? '')
  assert.ok(pinnedMatch, 'package.json must pin pnpm with packageManager')
  const pinned = pinnedMatch[1]

  const workflow = readFileSync(join(REPO_ROOT, '.github/workflows/checks.yml'), 'utf8')
  const action = /pnpm\/setup[\s\S]*?version:\s*['"]?([0-9][^'"\s]*)['"]?/.exec(workflow)
  assert.ok(action, 'the checks workflow must pin the pnpm action version')
  assert.equal(action[1], pinned, 'the workflow pnpm action version must match packageManager')

  const lock = readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8')
  const managed = /packageManagerDependencies:\n\s+pnpm:\n\s+specifier: ([^\n]+)\n\s+version: ([^\n]+)/.exec(lock)
  assert.ok(managed, 'the lockfile must carry the pnpm self-management document')
  assert.equal(managed[1], pinned, 'the lockfile specifier must match packageManager')
  assert.equal(managed[2], pinned, 'the lockfile version must match packageManager')
})

test('the root Node engine and direct toolchain pins agree with the installed Vite+ package', () => {
  const root = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    engines?: { node?: string }
    devDependencies?: Record<string, string>
    scripts?: Record<string, string>
  }
  const installed = JSON.parse(readFileSync(join(REPO_ROOT, 'node_modules/vite-plus/package.json'), 'utf8')) as {
    version?: string
  }
  const installedNodeTypes = JSON.parse(
    readFileSync(join(REPO_ROOT, 'node_modules/@types/node/package.json'), 'utf8'),
  ) as { version?: string }
  assert.equal(root.engines?.node, '^24.11.0 || >=26.0.0')
  assert.equal(installed.version, '1.7.0')
  assert.equal(root.devDependencies?.['vite-plus'], '1.7.0')
  assert.equal(installedNodeTypes.version, '24.11.0')
  assert.equal(root.devDependencies?.['@types/node'], '24.11.0')
  assert.equal(root.devDependencies?.parse5, '8.1.1')
  assert.equal(root.scripts?.lint, 'vp lint --deny-warnings')
  assert.equal(root.scripts?.['check:static'], 'vp check --continue-on-error --deny-warnings')

  const forge = JSON.parse(readFileSync(join(REPO_ROOT, 'package/dsh-spec-skill-forge/package.json'), 'utf8')) as {
    devDependencies?: Record<string, string>
  }
  assert.equal(forge.devDependencies?.parse5, '^8.1.1')

  const translate = JSON.parse(
    readFileSync(join(REPO_ROOT, 'package/dsh-spec-translate-docs/package.json'), 'utf8'),
  ) as { devDependencies?: Record<string, string> }
  assert.equal(translate.devDependencies?.['mdast-util-from-markdown'], '2.1.0')
})

test('the development gate checks the minimum and primary Node lines', () => {
  const workflow = parse(readFileSync(join(REPO_ROOT, '.github/workflows/checks.yml'), 'utf8')) as {
    jobs: {
      validate: { strategy: { matrix: { node: unknown } }; steps: { run?: string; with?: Record<string, string> }[] }
      checks: { name?: string; needs?: string; steps: { run?: string }[] }
    }
  }
  assert.deepEqual(workflow.jobs.validate.strategy.matrix.node, ['24.11.0', '26'])
  assert.ok(workflow.jobs.validate.steps.some((step) => step.with?.runtime === 'node@${{ matrix.node }}'))
  assert.ok(workflow.jobs.validate.steps.some((step) => step.run === 'pnpm run check:static'))
  assert.equal(workflow.jobs.checks.name, 'checks')
  assert.equal(workflow.jobs.checks.needs, 'validate')
  assert.equal(workflow.jobs.checks.steps[0]?.run, 'test "$MATRIX_RESULT" = "success"')

  const vendored = parse(readFileSync(join(REPO_ROOT, '.github/workflows/vendored.yml'), 'utf8')) as {
    jobs: { submit: { steps: { with?: Record<string, string> }[] } }
  }
  assert.ok(vendored.jobs.submit.steps.some((step) => step.with?.['node-version'] === '26'))

  const tsconfig = JSON.parse(readFileSync(join(REPO_ROOT, 'tsconfig.json'), 'utf8')) as {
    compilerOptions?: Record<string, unknown>
  }
  assert.equal(tsconfig.compilerOptions?.strict, true)
  assert.deepEqual(tsconfig.compilerOptions?.lib, ['ES2024'])
  assert.equal(tsconfig.compilerOptions?.noEmit, true)
  assert.equal(tsconfig.compilerOptions?.allowImportingTsExtensions, true)
  assert.equal(tsconfig.compilerOptions?.erasableSyntaxOnly, true)
})

test('the root check configuration enables type-aware lint and TypeScript diagnostics', async () => {
  const { default: config } = (await import(pathToFileURL(join(REPO_ROOT, 'vite.config.ts')).href)) as {
    default: { lint?: { options?: { typeAware?: boolean; typeCheck?: boolean } } }
  }
  assert.equal(config.lint?.options?.typeAware, true)
  assert.equal(config.lint?.options?.typeCheck, true)
})

test('every shipped script bundle targets the minimum supported Node line', async () => {
  const skills = readdirSync(join(REPO_ROOT, 'package'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  assert.ok(skills.length > 0, 'package/ must contain shipped script packages')

  for (const skill of skills) {
    const configPath = join(REPO_ROOT, 'package', skill, 'vite.config.ts')
    assert.ok(existsSync(configPath), `${skill} must carry a Vite+ pack configuration`)
    const { default: config } = (await import(pathToFileURL(configPath).href)) as {
      default: { pack?: { target?: string } }
    }
    assert.equal(config.pack?.target, 'node24', `${skill} must target Node 24`)
  }
})

function runStaticGate(fixtureRoot: string, file: string) {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>
  }
  const command = manifest.scripts?.['check:static']
  assert.equal(command, 'vp check --continue-on-error --deny-warnings')
  return spawnSync(
    process.execPath,
    [join(REPO_ROOT, 'node_modules/vite-plus/bin/vp'), ...command.split(' ').slice(1), file],
    { cwd: fixtureRoot, encoding: 'utf8' },
  )
}

test('the static gate rejects formatting, lint warnings and type errors independently', () => {
  const cases = [
    { kind: 'format', source: 'const formatted={answer:42}\n', expected: /format|Formatting/i },
    { kind: 'warning', source: 'debugger\n', expected: /no-debugger|warning/i },
    { kind: 'type', source: "const broken: number = 'wrong'\n", expected: /TS2322|not assignable|type/i },
    { kind: 'dom', source: "document.title = 'wrong'\n", expected: /document|DOM|Cannot find name/i },
  ] as const

  const fixtureRoot = mkdtempSync(join(tmpdir(), 'dsh-static-gate-'))
  try {
    symlinkSync(
      join(REPO_ROOT, 'node_modules'),
      join(fixtureRoot, 'node_modules'),
      process.platform === 'win32' ? 'junction' : 'dir',
    )
    const tsconfig = JSON.parse(readFileSync(join(REPO_ROOT, 'tsconfig.json'), 'utf8')) as {
      include?: string[]
      exclude?: string[]
    }
    tsconfig.include = ['*.ts']
    tsconfig.exclude = ['node_modules']
    writeFileSync(join(fixtureRoot, 'package.json'), JSON.stringify({ private: true, type: 'module' }, null, 2) + '\n')
    writeFileSync(join(fixtureRoot, 'vite.config.ts'), readFileSync(join(REPO_ROOT, 'vite.config.ts')))
    writeFileSync(join(fixtureRoot, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n')

    for (const entry of cases) {
      const relative = `${entry.kind}.ts`
      writeFileSync(join(fixtureRoot, relative), entry.source)
      const result = runStaticGate(fixtureRoot, relative)
      assert.notEqual(
        result.status,
        0,
        `${entry.kind} failure must reject static gate\n${result.stdout}${result.stderr}`,
      )
      assert.match(result.stdout + result.stderr, entry.expected)
    }
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true })
  }
})
