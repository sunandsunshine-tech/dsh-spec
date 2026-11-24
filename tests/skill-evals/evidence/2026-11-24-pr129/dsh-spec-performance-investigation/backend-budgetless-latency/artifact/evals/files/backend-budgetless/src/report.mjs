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
  const regionalUnits = new Map()
  for (const item of items) {
    regionalUnits.set(
      item.region,
      (regionalUnits.get(item.region) ?? 0) + item.units,
    )
  }

  const seen = new Set()
  const report = []

  for (const item of items) {
    const key = `${item.productId}:${item.region}`
    if (seen.has(key)) continue
    seen.add(key)

    const regionUnits = regionalUnits.get(item.region)
    report.push({
      productId: item.productId,
      region: item.region,
      units: item.units,
      share: regionUnits === 0 ? 0 : item.units / regionUnits,
    })
  }

  return report.sort(
    (left, right) =>
      right.share - left.share ||
      left.productId.localeCompare(right.productId) ||
      left.region.localeCompare(right.region),
  )
}
