export function projectWorkerFailure(result) {
  const error = result.error ?? {}
  return { message: error.message ?? 'unknown failure' }
}

export function classifyWorkerFailure(result) {
  return result.message.includes('permission') ? 'request-access' : 'retry'
}
