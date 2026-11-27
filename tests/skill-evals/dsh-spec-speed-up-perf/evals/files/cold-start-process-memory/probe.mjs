import { spawnSync } from 'node:child_process'
import { performance } from 'node:perf_hooks'

const samples = []
for (let index = 0; index < 5; index += 1) {
  const start = performance.now()
  const child = spawnSync(process.execPath, ['--expose-gc', 'worker.mjs'], {
    cwd: import.meta.dirname,
    encoding: 'utf8',
  })
  const wallMs = performance.now() - start
  if (child.status !== 0) throw new Error(child.stderr || `worker exited ${child.status}`)
  samples.push({
    wallMs: Number(wallMs.toFixed(3)),
    ...JSON.parse(child.stdout),
  })
}

console.log(
  JSON.stringify(
    {
      clock: 'parent performance.now around child process start, module import, batches and exit',
      state: 'fresh child process for each sample; no cross-sample warm cache',
      samples,
    },
    null,
    2,
  ),
)
