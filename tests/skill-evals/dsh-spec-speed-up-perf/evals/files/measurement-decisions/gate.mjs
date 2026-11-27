import { runBenchmark } from './measure.mjs'
import { pathToFileURL } from 'node:url'

export const PROJECT_MEDIAN_GATE_MS = 60

export function gateDecision(valueMs, limitMs = PROJECT_MEDIAN_GATE_MS) {
  return {
    gate: 'project report median latency',
    valueMs,
    limitMs,
    passed: valueMs <= limitMs,
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const result = await runBenchmark()
  const decision = gateDecision(result.medianMs)
  console.log(JSON.stringify(decision, null, 2))
  if (!decision.passed) process.exitCode = 1
}
