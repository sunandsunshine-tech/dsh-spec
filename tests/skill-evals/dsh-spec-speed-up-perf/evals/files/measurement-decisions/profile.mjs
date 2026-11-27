import { buildReport, createInventory } from './src/report.mjs'

const items = createInventory()
const counts = {
  seenScans: 0,
  regionFilters: 0,
  regionCandidates: 0,
  profileEntries: 0,
}

buildReport(items, {
  onSeenScan: () => {
    counts.seenScans += 1
  },
  onRegionFilter: () => {
    counts.regionFilters += 1
  },
  onRegionReduce: (length) => {
    counts.regionCandidates += length
  },
  onProfile: () => {
    counts.profileEntries += 1
  },
})

console.log(JSON.stringify({ inventoryRows: items.length, ...counts }, null, 2))
