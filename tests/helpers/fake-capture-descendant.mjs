import { writeFileSync } from 'node:fs'

if (process.env.FAKE_DESCENDANT_PID_FILE) {
  writeFileSync(process.env.FAKE_DESCENDANT_PID_FILE, String(process.pid))
}

process.on('SIGTERM', () => {})
setInterval(() => {}, 1_000)
