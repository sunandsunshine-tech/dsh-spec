import { performance } from 'node:perf_hooks'
import { startReportServer } from './server.mjs'

const { server, url } = await startReportServer()
try {
  for (let index = 0; index < 2; index += 1) {
    await fetch(`${url}/report`).then((response) => response.arrayBuffer())
  }

  const samples = []
  for (let index = 0; index < 7; index += 1) {
    const start = performance.now()
    const response = await fetch(`${url}/report`)
    const body = await response.arrayBuffer()
    if (!response.ok || body.byteLength === 0) throw new Error('report request failed')
    samples.push(Number((performance.now() - start).toFixed(3)))
  }

  const ordered = [...samples].sort((left, right) => left - right)
  console.log(JSON.stringify({ samplesMs: samples, medianMs: ordered[Math.floor(ordered.length / 2)] }))
} finally {
  await new Promise((resolve) => server.close(resolve))
}
