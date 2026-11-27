import { performance } from 'node:perf_hooks'

export async function checkout(url) {
  const start = performance.now()
  const response = await fetch(`${url}/checkout`)
  const body = await response.json()
  const totalMs = performance.now() - start
  if (!response.ok) throw new Error(`checkout failed: ${response.status}`)
  return { body, totalMs }
}
