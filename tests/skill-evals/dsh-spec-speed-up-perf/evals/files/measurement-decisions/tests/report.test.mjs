import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildReport } from '../src/report.mjs'

test('report removes duplicate product-region rows and sorts by share then identity', () => {
  const items = [
    { productId: 'b', region: 'north', warehouse: 'one', units: 4 },
    { productId: 'a', region: 'north', warehouse: 'two', units: 4 },
    { productId: 'a', region: 'north', warehouse: 'three', units: 4 },
    { productId: 'c', region: 'south', warehouse: 'one', units: 2 },
  ]
  const report = buildReport(items)
  assert.deepEqual(
    report.map(({ productId, region }) => `${productId}:${region}`),
    ['c:south', 'a:north', 'b:north'],
  )
  assert.equal(report.length, 3)
  assert.deepEqual(Object.keys(report[0]), ['productId', 'region', 'units', 'share'])
})
