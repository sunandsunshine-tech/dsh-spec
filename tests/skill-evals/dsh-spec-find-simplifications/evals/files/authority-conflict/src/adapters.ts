export interface Adapter {
  parse(value: string): unknown
}

export const jsonAdapter: Adapter = {
  parse(value) {
    return JSON.parse(value)
  },
}

export const textAdapter: Adapter = {
  parse(value) {
    return value.trim()
  },
}
