import { getRows, subscribe, updateLabel } from './src/store.mjs'

const before = new Map(getRows().map((row) => [row.id, row]))
const events = []
subscribe((value) => {
  events.push({
    revision: value.revision,
    order: value.rows.map((row) => row.id),
    changedFromBefore:
      events.length === 0 ? value.rows.filter((row) => before.get(row.id) !== row).map((row) => row.id) : undefined,
  })
})
updateLabel('south', 'South updated')

console.log(
  JSON.stringify(
    {
      events,
      retainedIdentityByRow: Object.fromEntries(getRows().map((row) => [row.id, before.get(row.id) === row])),
    },
    null,
    2,
  ),
)
