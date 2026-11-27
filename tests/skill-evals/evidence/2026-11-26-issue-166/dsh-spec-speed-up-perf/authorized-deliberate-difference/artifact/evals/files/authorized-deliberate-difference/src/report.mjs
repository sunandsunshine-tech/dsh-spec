const rows = Array.from({ length: 2_500 }, (_, index) => ({
  id: `activity-${index}`,
  name: `Activity ${index % 80}`,
  durationMs: 900 + ((index * 37) % 9_100),
}))

const durationFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

export function sourceRows() {
  return rows
}

export function totalDurationMs(items = rows) {
  return items.reduce((total, row) => total + row.durationMs, 0)
}

export function renderRows(items = rows) {
  return items.map((row) => ({
    id: row.id,
    label: `${row.name}: ${durationFormatter.format(row.durationMs / 1_000)} s`,
  }))
}
