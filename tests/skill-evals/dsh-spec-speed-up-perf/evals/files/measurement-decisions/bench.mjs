import { runBenchmark } from './measure.mjs'

console.log(JSON.stringify(await runBenchmark(), null, 2))
