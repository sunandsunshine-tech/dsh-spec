import { processBatch, releaseRetainedBatches, retainedBatches } from './src/session.mjs'

function memorySnapshot() {
  if (typeof global.gc === 'function') global.gc({ type: 'major', execution: 'sync' })
  return process.memoryUsage()
}

const before = memorySnapshot()
let last
for (let batchIndex = 0; batchIndex < 30; batchIndex += 1) {
  const rows = Array.from({ length: 2_000 }, (_, rowIndex) => ({
    amount: (rowIndex + batchIndex) % 97,
    kind: rowIndex % 11 === 0 ? 'priority' : 'standard',
  }))
  last = processBatch({ id: `batch-${batchIndex}`, rows })
}
const retained = memorySnapshot()
const retainedBatchesCount = retainedBatches()
releaseRetainedBatches()
const released = memorySnapshot()

console.log(
  JSON.stringify({
    result: last,
    retainedBatches: retainedBatchesCount,
    heapDeltaBytes: retained.heapUsed - before.heapUsed,
    retainedArrayBufferDeltaBytes: retained.arrayBuffers - before.arrayBuffers,
    gc: typeof global.gc === 'function' ? 'explicit synchronous major global.gc before each sample' : 'unavailable',
    negativeControl: {
      retainedBatches: retainedBatches(),
      arrayBufferDeltaBytes: released.arrayBuffers - before.arrayBuffers,
    },
  }),
)
