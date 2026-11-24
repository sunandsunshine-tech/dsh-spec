let current = 'real'

export function useFakeTimers(milliseconds) {
  current = milliseconds
}

export function useRealTimers() {
  current = 'real'
}

export function now() {
  return current
}
