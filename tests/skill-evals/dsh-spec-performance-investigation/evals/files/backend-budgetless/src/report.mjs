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

export function buildReport(items) {
  const seen = []
  const report = []

  for (const item of items) {
    const key = `${item.productId}:${item.region}`
    if (seen.includes(key)) continue
    seen.push(key)

    const regionalItems = items.filter((candidate) => candidate.region === item.region)
    const regionalUnits = regionalItems.reduce((sum, candidate) => sum + candidate.units, 0)
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
