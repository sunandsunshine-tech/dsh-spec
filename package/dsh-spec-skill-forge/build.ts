#!/usr/bin/env node
// Build each script as its own self-contained bundle; a shared chunk would be a third
// file in scripts/, which the gate would treat as an unnamed script.

import { spawnSync } from 'node:child_process'

const project = 'package/dsh-spec-skill-forge'
for (const [entry, clean] of [
  ['verify-skill-spec.ts', '1'],
  ['forge.ts', '0'],
] as const) {
  const result = spawnSync('vp', ['-C', project, 'pack'], {
    env: { ...process.env, SKILL_ENTRY: entry, SKILL_CLEAN: clean },
    stdio: 'inherit',
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
