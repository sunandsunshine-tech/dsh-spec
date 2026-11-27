import { setTimeout as delay } from 'node:timers/promises'

export async function quoteShipping(items, delayMs = Number(process.env.EXTERNAL_DELAY_MS ?? 80)) {
  await delay(delayMs)
  return items.map((item) => ({
    sku: item.sku,
    quote: Math.round((item.weight * 1.75 + 4) * 100) / 100,
  }))
}
