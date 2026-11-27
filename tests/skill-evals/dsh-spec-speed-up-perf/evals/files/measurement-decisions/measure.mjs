import { performance } from 'node:perf_hooks'
import { startReportServer } from './server.mjs'

export async function runBenchmark({ warmups = 2, measured = 7 } = {}) {
  const { server, url } = await startReportServer()
  try {
    const warmupSamples = []
    for (let index = 0; index < warmups; index += 1) {
      const start = performance.now()
      await fetch(`${url}/report`).then((response) => response.arrayBuffer())
      warmupSamples.push(Number((performance.now() - start).toFixed(3)))
    }

    const samplesMs = []
    for (let index = 0; index < measured; index += 1) {
      const start = performance.now()
      const response = await fetch(`${url}/report`)
      const body = await response.arrayBuffer()
      if (!response.ok || body.byteLength === 0) throw new Error('report request failed')
      samplesMs.push(Number((performance.now() - start).toFixed(3)))
    }

    const ordered = [...samplesMs].sort((left, right) => left - right)
    const percentile = ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * 0.95))]
    return {
      clock: 'performance.now around one complete GET /report and body read',
      state: 'warm process and warm HTTP server; request and body are included',
      warmupSamplesMs: warmupSamples,
      samplesMs,
      medianMs: ordered[Math.floor(ordered.length / 2)],
      p95Ms: percentile,
    }
  } finally {
    await new Promise((resolve) => server.close(resolve))
  }
}
