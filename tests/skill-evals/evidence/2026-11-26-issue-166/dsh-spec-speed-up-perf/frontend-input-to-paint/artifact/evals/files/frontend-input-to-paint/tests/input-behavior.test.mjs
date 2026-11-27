import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createProducts, filterProducts } from '../src/filter.mjs'

test('visible filtering keeps all matching product identities in ranked order', () => {
  const products = createProducts(80)
  const matches = filterProducts(products, 'light red')
  assert.ok(matches.length > 0)
  assert.ok(matches.every((product) => product.category === 'light' && product.color === 'red'))
  assert.deepEqual(
    matches.map((product) => product.id),
    [...matches]
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
      .map((product) => product.id),
  )
  const lightCount = products.filter((product) => product.category === 'light').length
  const redCount = products.filter((product) => product.color === 'red').length
  assert.ok(
    matches.every(
      (product) => product.score === product.rank + lightCount + redCount,
    ),
  )
  assert.equal(filterProducts(products, '').length, 0)
})
