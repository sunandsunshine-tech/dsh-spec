interface Item {
  id: string
}

export function listItems(items: Item[], offset: number, limit: number): Item[] {
  return items.slice(offset, offset + limit)
}
