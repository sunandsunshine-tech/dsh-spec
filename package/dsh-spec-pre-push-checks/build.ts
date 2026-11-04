#!/usr/bin/env node
// Build the change-scope report as one self-contained bundle; a shared chunk would be a second
// file in scripts/, which the skill's gate would treat as an unnamed script.

import { spawnSync } from 'node:child_process'

const result = spawnSync('vp', ['-C', 'package/dsh-spec-pre-push-checks', 'pack'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
