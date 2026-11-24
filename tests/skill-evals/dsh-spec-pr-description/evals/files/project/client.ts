export interface HttpClientOptions {
  maxAttempts?: 1 | 2 | 3
}

export async function request(url: string, init: RequestInit = {}, options: HttpClientOptions = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const retryable = method === 'GET' || method === 'HEAD'
  const maxAttempts = options.maxAttempts ?? 3
  let response = await fetch(url, init)
  for (let attempt = 1; attempt < maxAttempts && retryable && response.status >= 500; attempt += 1) {
    response = await fetch(url, init)
  }
  return response
}
