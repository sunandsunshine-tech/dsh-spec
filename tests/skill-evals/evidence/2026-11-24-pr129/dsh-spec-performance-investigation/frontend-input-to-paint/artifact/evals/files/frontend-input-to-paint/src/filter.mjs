const categories = ['light', 'panel', 'sensor', 'switch']
const colors = ['red', 'blue', 'green', 'black']

export function createProducts(count = 3_600) {
  return Array.from({ length: count }, (_, index) => ({
    id: `item-${String(index).padStart(4, '0')}`,
    name: `${categories[index % categories.length]} ${colors[index % colors.length]} unit ${index}`,
    category: categories[index % categories.length],
    color: colors[index % colors.length],
    rank: (index * 37) % 101,
  }))
}

export function filterProducts(items, rawQuery) {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return []
  const tokens = query.split(/\s+/)
  const matches = []
  let scoreAdjustment = 0

  for (const token of tokens) {
    for (const candidate of items) {
      if (candidate.category === token) scoreAdjustment += 1
      if (candidate.color === token) scoreAdjustment += 1
    }
  }

  for (const item of items) {
    const search = `${item.name} ${item.category} ${item.color}`.toLowerCase()
    if (!tokens.every((token) => search.includes(token))) continue

    matches.push({ ...item, score: item.rank + scoreAdjustment })
  }

  return matches.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).slice(0, 200)
}
