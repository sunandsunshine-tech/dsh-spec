export function createInventory(count = 5_000) {
  const regions = ['north', 'south', 'east', 'west']
  const products = Array.from({ length: count }, (_, index) => ({
    productId: `sku-${String(index % 3_700).padStart(4, '0')}`,
    region: regions[index % regions.length],
    warehouse: `warehouse-${index % 7}`,
    units: (index * 17) % 97,
  }))

  return products.concat(products.slice(0, 250))
}

export function buildReport(items, hooks = {}) {
  const regionalTotals = new Map()
  for (const item of items) {
    const totals = regionalTotals.get(item.region)
    if (totals === undefined) {
      regionalTotals.set(item.region, { units: item.units, count: 1 })
    } else {
      totals.units += item.units
      totals.count += 1
    }
  }

  for (const totals of regionalTotals.values()) {
    hooks.onRegionFilter?.()
    hooks.onRegionReduce?.(totals.count)
  }

  const seen = new Set()
  const report = []

  for (const item of items) {
    const key = `${item.productId}:${item.region}`
    hooks.onSeenScan?.()
    if (seen.has(key)) continue
    seen.add(key)

    const regionalUnits = regionalTotals.get(item.region).units
    hooks.onProfile?.()
    report.push({
      productId: item.productId,
      region: item.region,
      units: item.units,
      share: regionalUnits === 0 ? 0 : item.units / regionalUnits,
    })
  }

  return report.sort(
    (left, right) =>
      right.share - left.share ||
      left.productId.localeCompare(right.productId) ||
      left.region.localeCompare(right.region),
  )
}
