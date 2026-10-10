/**
 * The dispatch report: one line per subject, in record order.
 *
 * The shape of a line is fixed because it is read — by a person scanning the output and by
 * `tests/helpers/cli.ts`, which parses it. A child that exited 2 was asked to do something it does
 * not do, so the whole invocation is a usage error and nothing else runs.
 *
 * Zero external dependencies.
 */

import type { JobResult } from './pool.ts'

/** The report line for one subject, whose shape is fixed because it is read. */
export function reportLine(subjectName: string, verdict: 'ok' | 'FAIL' | 'skipped', reason?: string): void {
  console.log(`check ${subjectName}: ${verdict}${reason === undefined ? '' : ` — ${reason}`}`)
}
/**
 * Print the captured output and one verdict per subject, and answer with the exit code.
 *
 * A job that exited 2 was asked to do something it does not do — a scope that contradicts it — so
 * the whole invocation is a usage error and nothing else runs.
 */
export function finish(results: readonly JobResult[], skipped: readonly { subject: string, reason: string }[]): never {
  const usageJob = results.find(result => result.status === 2)
  if (usageJob !== undefined) {
    process.stdout.write(usageJob.output)
    process.exit(2)
  }
  const bySubject = new Map<string, JobResult[]>()
  for (const result of results) {
    const bucket = bySubject.get(result.job.subject) ?? []
    bucket.push(result)
    bySubject.set(result.job.subject, bucket)
  }
  let failed = 0
  for (const [name, bucket] of bySubject) {
    for (const result of bucket) process.stdout.write(result.output)
    const bad = bucket.filter(result => result.status !== 0)
    reportLine(name, bad.length === 0 ? 'ok' : 'FAIL')
    if (bad.length > 0) failed += 1
  }
  for (const entry of skipped) reportLine(entry.subject, 'skipped', entry.reason)
  process.exit(failed === 0 ? 0 : 1)
}
