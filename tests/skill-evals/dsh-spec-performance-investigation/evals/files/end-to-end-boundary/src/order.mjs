export function createOrderLines(count = 2_000) {
  return Array.from({ length: count }, (_, index) => ({
    sku: `sku-${String(index % 700).padStart(4, '0')}`,
    weight: 0.5 + (index % 11) / 10,
    quantity: 1 + (index % 3),
  }))
}

export function buildOrder(lines, quotes) {
  const quoteBySku = new Map(quotes.map((quote) => [quote.sku, quote.quote]))
  let subtotal = 0
  const items = []

  for (const line of lines) {
    const quote = quoteBySku.get(line.sku)
    if (quote === undefined) throw new Error(`missing quote for ${line.sku}`)
    const total = quote * line.quantity
    subtotal += total
    items.push({ ...line, quote, total })
  }

  return { items, subtotal: Math.round(subtotal * 100) / 100 }
}
