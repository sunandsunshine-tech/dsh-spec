export interface ProjectionReader {
  close(): void
}

export interface SessionEvent {
  sequence: number
  type: string
}
