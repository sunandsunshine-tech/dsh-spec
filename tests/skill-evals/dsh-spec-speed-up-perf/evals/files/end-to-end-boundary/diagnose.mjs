import { checkout } from './client.mjs'
import { startOrderServer } from './server.mjs'

const { server, url } = await startOrderServer()
try {
  const samples = []
  for (let index = 0; index < 3; index += 1) {
    const { body, totalMs } = await checkout(url)
    samples.push({
      totalMs: Number(totalMs.toFixed(3)),
      externalMs: Number(body.phases.externalMs.toFixed(3)),
      localMs: Number(body.phases.localMs.toFixed(3)),
      itemCount: body.items.length,
    })
  }
  console.log(JSON.stringify({ externalDelayMs: Number(process.env.EXTERNAL_DELAY_MS ?? 80), samples }, null, 2))
} finally {
  await new Promise((resolve) => server.close(resolve))
}
