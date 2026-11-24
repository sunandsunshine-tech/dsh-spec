import { cpSync, mkdirSync, rmSync } from 'node:fs'

rmSync(new URL('./dist/', import.meta.url), { recursive: true, force: true })
mkdirSync(new URL('./dist/', import.meta.url), { recursive: true })
cpSync(new URL('./src/', import.meta.url), new URL('./dist/', import.meta.url), {
  recursive: true,
})
