#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const result = spawnSync('vp', ['-C', 'package/dsh-spec-browser-gif-evidence', 'pack'], { stdio: 'inherit' })
process.exit(result.status ?? 1)
