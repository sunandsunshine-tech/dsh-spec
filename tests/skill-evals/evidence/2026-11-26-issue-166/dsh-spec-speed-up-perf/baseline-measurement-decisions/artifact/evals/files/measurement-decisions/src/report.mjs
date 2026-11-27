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
  const seen = []
  const regionalUnitsByRegion = new Map()
  const report = []

  for (const item of items) {
    const key = `${item.productId}:${item.region}`
    hooks.onSeenScan?.()
    if (seen.includes(key)) continue
    seen.push(key)

    let regionalUnits = regionalUnitsByRegion.get(item.region)
    if (regionalUnits === undefined) {
      hooks.onRegionFilter?.()
      const regionalItems = items.filter((candidate) => candidate.region === item.region)
      hooks.onRegionReduce?.(regionalItems.length)
      regionalUnits = regionalItems.reduce((sum, candidate) => sum + candidate.units, 0)
      regionalUnitsByRegion.set(item.region, regionalUnits)
    }
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
