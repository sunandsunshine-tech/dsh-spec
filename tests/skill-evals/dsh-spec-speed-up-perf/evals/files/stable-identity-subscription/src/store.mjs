let revision = 0
let rows = [
  { id: 'north', label: 'North', score: 40 },
  { id: 'south', label: 'South', score: 20 },
  { id: 'west', label: 'West', score: 30 },
]
const listeners = new Set()

function snapshot() {
  return {
    revision,
    rows: rows.map((row) => ({ ...row })),
  }
}

export function subscribe(listener) {
  listeners.add(listener)
  listener(snapshot())
  return () => listeners.delete(listener)
}

export function updateLabel(id, label) {
  rows = rows.map((row) => ({ ...row, label: row.id === id ? label : row.label }))
  revision += 1
  const value = snapshot()
  for (const listener of [...listeners]) listener(value)
}

export function getRows() {
  return rows
}
