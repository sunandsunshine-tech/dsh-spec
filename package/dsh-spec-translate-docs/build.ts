#!/usr/bin/env node
// Build the pairing mechanism as one self-contained bundle; a shared chunk would be a second
// file in scripts/, which the gate would treat as an unnamed script.

import { spawnSync } from 'node:child_process'

const result = spawnSync('vp', ['-C', 'package/dsh-spec-translate-docs', 'pack'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
