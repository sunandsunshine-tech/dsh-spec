#!/usr/bin/env node
// Build selected skill script packages into the work directory, normalize the generated
// bundles, and optionally publish them into skills/<name>/scripts/.
//
// dependencies   none; node: builtins only
// runtime        Node.js 22.19+ or 24+, with the pinned Vite+ devDependency installed
// input          optional skill package names, --all, --publish
// output         one line per package and per published file
// exit           0 every step succeeded · 1 a build failed · 2 usage error

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { syncVendoredNotices } from './vendored-notices.ts'

const USAGE = `usage: build-skills.ts [--all] [--publish] [<skill>...]

Build every package under package/ that has a build.ts, or only the named skills, into
.agents/dsh-spec-skill-forge/<skill>/scripts/. Each generated bundle gets a provenance banner
and its module-path comments are normalized, so the bytes do not depend on the checkout path.

options:
  --all       build every package (the default when no skill is named)
  --publish   copy each built bundle into skills/<skill>/scripts/
  --help, -h  print this and exit 0

SKILL_OUT_ROOT redirects the output root; scripts/check-bundles.ts builds into a temporary
directory that way.

exit: 0 every build and publish step succeeded · 1 a build failed · 2 usage error`

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageRoot = join(repoRoot, 'package')

/** A generated bundle's banner; no timestamp or version keeps the bytes reproducible. */
function bannerFor(skill, stem) {
  return (
    '// Generated from package/' +
    skill +
    '/' +
    stem +
    '.ts by `pnpm run skill:build`; edit the source and rebuild. Bundled third-party code is covered by the skill-root THIRD_PARTY_NOTICES.\n'
  )
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE)
    return
  }
  const flags = new Set(args.filter((arg) => arg.startsWith('--')))
  for (const flag of flags) {
    if (flag !== '--all' && flag !== '--publish') {
      console.error('build-skills.ts: unknown option: ' + flag)
      console.error('run "build-skills.ts --help" for usage')
      process.exitCode = 2
      return
    }
  }
  const requested = args.filter((arg) => !arg.startsWith('--'))
  const names = readdirSync(packageRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(packageRoot, entry.name, 'build.ts')))
    .map((entry) => entry.name)
    .sort()
  if (names.length === 0) {
    console.error('build-skills.ts: no package with a build.ts under package/; nothing to build')
    process.exitCode = 1
    return
  }
  if (flags.has('--all') && requested.length > 0) {
    console.error('build-skills.ts: --all takes no skill names')
    console.error('run "build-skills.ts --help" for usage')
    process.exitCode = 2
    return
  }
  const selected = flags.has('--all') || requested.length === 0 ? names : requested
  for (const name of selected) {
    if (!names.includes(name)) {
      console.error('build-skills.ts: unknown skill package ' + JSON.stringify(name) + '; known: ' + names.join(', '))
      console.error('run "build-skills.ts --help" for usage')
      process.exitCode = 2
      return
    }
  }
  const outRoot = resolve(process.env.SKILL_OUT_ROOT ?? join(repoRoot, '.agents/dsh-spec-skill-forge'))

  for (const name of selected) {
    const result = spawnSync(process.execPath, [join(packageRoot, name, 'build.ts')], {
      cwd: repoRoot,
      env: { ...process.env, SKILL_OUT_ROOT: outRoot },
      stdio: 'inherit',
    })
    if (result.error !== undefined || result.status !== 0) {
      if (result.error !== undefined) console.error('build-skills.ts: ' + name + ': ' + result.error.message)
      process.exitCode = result.status ?? 1
      return
    }
  }

  if (!existsSync(outRoot)) {
    console.error('build-skills.ts: the build produced no output directory; nothing to normalize')
    process.exitCode = 1
    return
  }

  let normalized = 0
  for (const skill of readdirSync(outRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    const scripts = join(outRoot, skill, 'scripts')
    if (!existsSync(scripts)) continue
    for (const file of readdirSync(scripts)
      .filter((name) => name.endsWith('.mjs'))
      .sort()) {
      const path = join(scripts, file)
      const banner = bannerFor(skill, file.replace(/\.mjs$/, ''))
      let text = readFileSync(path, 'utf8').replace(/^\/\/ .*node_modules\/\.pnpm\//gm, '// node_modules/.pnpm/')
      const shebang = '#!/usr/bin/env node\n'
      if (text.startsWith(shebang)) {
        const body = text.slice(shebang.length)
        text = shebang + (body.startsWith(banner) ? body : banner + body)
      } else if (!text.startsWith(banner)) {
        text = banner + text
      }
      writeFileSync(path, text)
      normalized += 1
    }
  }
  if (normalized === 0) {
    console.error('build-skills.ts: the build produced no bundle; nothing to normalize')
    process.exitCode = 1
    return
  }
  console.log(
    'build-skills: built ' +
      selected.length +
      ' package(s); normalized ' +
      normalized +
      ' bundle(s) under ' +
      relative(repoRoot, outRoot),
  )

  if (flags.has('--publish')) {
    let published = 0
    for (const skill of readdirSync(outRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && selected.includes(entry.name))
      .map((entry) => entry.name)
      .sort()) {
      const scripts = join(outRoot, skill, 'scripts')
      if (!existsSync(scripts)) continue
      if (!existsSync(join(repoRoot, 'skills', skill))) {
        console.error('build-skills.ts: no landed skill directory for ' + skill)
        process.exitCode = 1
        return
      }
      const landing = join(repoRoot, 'skills', skill, 'scripts')
      mkdirSync(landing, { recursive: true })
      for (const file of readdirSync(scripts).filter((name) => name.endsWith('.mjs'))) {
        copyFileSync(join(scripts, file), join(landing, file))
        console.log('build-skills: published ' + relative(repoRoot, join(landing, file)))
        published += 1
      }
    }
    if (published === 0) {
      console.error('build-skills.ts: --publish found no bundle to publish')
      process.exitCode = 1
      return
    }
    try {
      const notices = syncVendoredNotices(repoRoot)
      console.log(
        'build-skills: vendored notice table ' +
          (notices.changed ? 'updated' : 'unchanged') +
          ' (' +
          notices.packages.size +
          ' package(s))',
      )
    } catch (error) {
      console.error('build-skills.ts: ' + (error instanceof Error ? error.message : String(error)))
      process.exitCode = 1
      return
    }
  }
  process.exitCode = 0
}

main()
