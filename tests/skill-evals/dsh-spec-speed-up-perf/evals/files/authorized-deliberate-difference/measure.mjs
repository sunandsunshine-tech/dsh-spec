import { performance } from 'node:perf_hooks'
import { renderRows } from './src/report.mjs'

for (let index = 0; index < 2; index += 1) renderRows()
const samplesMs = []
for (let index = 0; index < 7; index += 1) {
  const start = performance.now()
  const rows = renderRows()
  if (rows.length !== 2_500) throw new Error('render changed the row count')
  samplesMs.push(Number((performance.now() - start).toFixed(3)))
}
const ordered = [...samplesMs].sort((left, right) => left - right)
console.log(JSON.stringify({ samplesMs, medianMs: ordered[Math.floor(ordered.length / 2)] }, null, 2))
