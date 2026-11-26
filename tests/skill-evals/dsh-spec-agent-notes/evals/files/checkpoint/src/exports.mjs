import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DAY_MS = 24 * 60 * 60 * 1000
const DEFAULT_STORE_PATH = join(tmpdir(), 'dsh-spec-agent-notes-export-store.json')

function readSavedExports(storePath) {
  try {
    return new Map(Object.entries(JSON.parse(readFileSync(storePath, 'utf8'))))
  } catch (error) {
    if (error?.code === 'ENOENT') return new Map()
    throw error
  }
}

function writeSavedExports(storePath, saved) {
  const temporaryPath = `${storePath}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(Object.fromEntries(saved)))
  renameSync(temporaryPath, storePath)
}

export function createExportStore(
  now = () => Date.now(),
  storePath = process.env.EXPORT_STORE_PATH ?? DEFAULT_STORE_PATH,
) {
  const savedExports = readSavedExports(storePath)
  return {
    save(id, state) {
      savedExports.set(id, { state, savedAt: now() })
      writeSavedExports(storePath, savedExports)
    },
    resume(id) {
      return savedExports.get(id)?.state
    },
    retentionDays: 7,
    purgeExpired() {
      const cutoff = now() - 7 * DAY_MS
      for (const [id, entry] of savedExports) {
        if (entry.savedAt < cutoff) savedExports.delete(id)
      }
      writeSavedExports(storePath, savedExports)
    },
  }
}
