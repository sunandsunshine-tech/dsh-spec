import { basename } from 'node:path'
import { now } from '../support/clock.mjs'

export async function loadConfig() {
  return {
    feature: process.env.FEATURE_FLAG,
    workspace: basename(process.cwd()),
    now: now(),
  }
}
