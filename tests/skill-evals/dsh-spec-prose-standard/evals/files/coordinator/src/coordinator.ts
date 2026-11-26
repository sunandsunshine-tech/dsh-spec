interface Backend {
  write(sessionId: string, event: string): Promise<void>
  flushBufferedEvents(): Promise<void>
}

export class WriteCoordinator {
  readonly #backend: Backend
  readonly #writesBySession = new Map<string, Promise<void>>()
  #closing = false

  constructor(backend: Backend) {
    this.#backend = backend
  }

  async write(sessionId: string, event: string): Promise<void> {
    if (this.#closing) throw new Error('coordinator is closing')

    const previous = this.#writesBySession.get(sessionId) ?? Promise.resolve()
    const write = previous.then(() => this.#backend.write(sessionId, event))
    this.#writesBySession.set(sessionId, write)

    try {
      await write
    } finally {
      if (this.#writesBySession.get(sessionId) === write) {
        this.#writesBySession.delete(sessionId)
      }
    }
  }

  async dispose(): Promise<void> {
    this.#closing = true
    await Promise.all(this.#writesBySession.values())
    await this.#backend.flushBufferedEvents()
  }
}
