import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProducts, filterProducts } from '../src/filter.mjs'

test('visible filtering keeps all matching product identities in ranked order', () => {
  const products = createProducts(80)
  const queries = ['light red', ' LIGHT   light ', 'switch black', 'red', 'unit 12']

  for (const query of queries) {
    const tokens = query.trim().toLowerCase().split(/\s+/)
    const scoreAdjustment = tokens.reduce(
      (total, token) =>
        total +
        products.filter((product) => product.category === token).length +
        products.filter((product) => product.color === token).length,
      0,
    )
    const matches = filterProducts(products, query)

    assert.ok(matches.length > 0)
    assert.ok(
      matches.every((product) => {
        const search = `${product.name} ${product.category} ${product.color}`.toLowerCase()
        return (
          tokens.every((token) => search.includes(token)) &&
          product.score === product.rank + scoreAdjustment
        )
      }),
    )
    assert.deepEqual(
      matches.map((product) => product.id),
      [...matches]
        .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
        .map((product) => product.id),
    )
  }

  assert.equal(filterProducts(products, '').length, 0)
})
