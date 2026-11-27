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
  const scoreBoosts = new Map()

  for (const item of items) {
    scoreBoosts.set(item.category, (scoreBoosts.get(item.category) ?? 0) + 1)
    scoreBoosts.set(item.color, (scoreBoosts.get(item.color) ?? 0) + 1)
  }

  for (const item of items) {
    const search = `${item.name} ${item.category} ${item.color}`.toLowerCase()
    if (!tokens.every((token) => search.includes(token))) continue

    let score = item.rank
    for (const token of tokens) {
      score += scoreBoosts.get(token) ?? 0
    }
    matches.push({ ...item, score })
  }

  return matches.sort((left, right) => right.score - left.score || left.id.localeCompare(right.id)).slice(0, 200)
}
