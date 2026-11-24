import assert from 'node:assert/strict'
import { before, describe, test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

async function expensiveFixture() {
  await delay(80)
  return { rows: [1, 2, 3] }
}

const reportCases = [
  ['renders the first row', 1],
  ['renders the second row', 2],
  ['renders the third row', 3],
]

const contractReport = {
  rows: reportCases.map(([, expected]) => expected),
}

const fixtureLane = process.env.RUN_EXPENSIVE_FIXTURE?.toLowerCase()
const fixtureSkipReason =
  fixtureLane === '0' || fixtureLane === 'false'
    ? 'the representative fixture runs in the Node 24 matrix lane'
    : false

function assertReportContains(report, expected) {
  assert.equal(report.rows.length, reportCases.length)
  assert.ok(report.rows.includes(expected))
}

for (const [name, expected] of reportCases) {
  test(`${name} contract`, () => {
    assertReportContains(contractReport, expected)
  })
}

describe('fixture-backed report', { skip: fixtureSkipReason }, () => {
  let fixture

  before(async () => {
    fixture = await expensiveFixture()
  })

  for (const [name, expected] of reportCases) {
    test(name, async () => {
      assertReportContains(fixture, expected)
    })
  }
})
