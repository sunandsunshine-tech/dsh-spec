/**
 * Running the gates: one child per job, through a bounded pool.
 *
 * A gate is a command, so it runs as a child rather than in process: a gate that throws cannot take
 * the dispatcher down with it, and the exit status is the verdict. The width is `--jobs`, then the
 * environment, then the machine.
 *
 * Zero external dependencies.
 */

import { spawn } from 'node:child_process'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'

/** The paths a gate child is launched from. */
export interface PoolContext {
  /** The engine directory the gate scripts sit in. */
  scriptDir: string
  /** The project every child is pointed at. */
  root: string
}

/** One gate invocation: which subject it answers for, which gate, and its arguments. */
export interface Job {
  subject: string
  gate: string
  args: string[]
}
/** One job's outcome. */
export interface JobResult {
  job: Job
  status: number
  output: string
}
// ------------------------------------------------------------------ scheduling
/**
 * Run every job through a bounded pool.
 * @param jobs - the invocations, in report order.
 * @param limit - the most children alive at once.
 * @returns one result per job, in the order the jobs were given.
 */
export async function runJobs(jobs: readonly Job[], limit: number, context: PoolContext): Promise<JobResult[]> {
  const results: JobResult[] = new Array(jobs.length)
  let next = 0
  const workers = Array.from({ length: Math.max(1, Math.min(limit, jobs.length)) }, async () => {
    for (;;) {
      const index = next
      next += 1
      const job = jobs[index]
      if (job === undefined) return
      results[index] = await runJob(job, context)
    }
  })
  await Promise.all(workers)
  return results
}
/** Run one gate as a child, capturing its output so the report stays in record order. */
export function runJob(job: Job, context: PoolContext): Promise<JobResult> {
  return new Promise((settle) => {
    const { scriptDir, root } = context
    const child = spawn(process.execPath, [join(scriptDir, `${job.gate}.ts`), ...job.args, '--root', root], { cwd: root })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.stderr.on('data', (chunk: Buffer) => { output += chunk.toString('utf8') })
    child.on('error', (error: Error) => settle({ job, status: 1, output: `${output}${error.message}\n` }))
    child.on('close', (status: number | null) => settle({ job, status: status ?? 1, output }))
  })
}
/** The dispatch width: `--jobs`, then the environment, then the machine. */
export function dispatchWidth(configured: string | undefined, usage: (message?: string) => never): number {
  const requested = configured ?? process.env.DSH_SPEC_JOBS
  if (requested === undefined || requested === '') return Math.min(availableParallelism(), 8)
  const width = Number.parseInt(requested, 10)
  if (!Number.isFinite(width) || width < 1) usage(`--jobs needs a positive integer, got ${JSON.stringify(requested)}`)
  return width
}
