const retained = new Map()
const retainedBytesPerBatch = 32 * 1024

function classify(row) {
  return row.kind === 'priority' ? 'urgent' : 'standard'
}

export function processBatch(batch) {
  const parsed = batch.rows.map((row, index) => ({
    id: `${batch.id}-${index}`,
    amount: row.amount,
    kind: classify(row),
  }))

  const summary = parsed.reduce(
    (result, row) => {
      result.count += 1
      result.total += row.amount
      result[row.kind] += 1
      return result
    },
    { count: 0, total: 0, urgent: 0, standard: 0 },
  )

  const payload = Buffer.allocUnsafeSlow(retainedBytesPerBatch)
  payload.fill(0)
  retained.set(batch.id, { payload, summary })
  return { ...summary }
}

export function retainedBatches() {
  return retained.size
}

export function releaseRetainedBatches() {
  retained.clear()
}
