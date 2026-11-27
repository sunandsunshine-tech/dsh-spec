import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildOrder } from '../src/order.mjs'

test('checkout combines every production order line with its shipping quote', () => {
  const order = buildOrder(
    [
      { sku: 'a', weight: 1, quantity: 2 },
      { sku: 'b', weight: 2, quantity: 1 },
    ],
    [
      { sku: 'a', quote: 5 },
      { sku: 'b', quote: 7 },
    ],
  )
  assert.equal(order.items.length, 2)
  assert.equal(order.subtotal, 17)
  assert.deepEqual(
    order.items.map((item) => item.total),
    [10, 7],
  )
})
