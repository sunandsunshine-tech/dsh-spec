export function parseConfig(input: string): Record<string, string> {
  if (input.trim() === '') throw new Error('configuration is empty')
  return Object.fromEntries(
    input
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split('=', 2) as [string, string]),
  )
}
