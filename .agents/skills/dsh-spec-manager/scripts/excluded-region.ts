/**
 * Freeze one marked region of a live document from the gates that read source lines.
 *
 * A document sometimes has to keep a stretch of text exactly as it stands — a quoted historical
 * format, an example whose brackets are deliberately not links — while the rest of it stays authored
 * prose that every gate must read. The frozen archive answers the whole-file case by moving the file
 * out of the corpus; this answers the in-file case with one marker pair, and a gate that scans lines
 * takes the range it returns as its `excludedRange` selector.
 *
 * Two rules keep it from becoming a way to hide prose. The marker name has one owner, here, so a
 * reader who greps the corpus for one spelling finds every marked region. And a half-applied marker
 * is not a region: unless exactly one opening and one closing marker appear, in that order, the
 * selector returns undefined and the gate reads the whole file, because a region that silently
 * widened is text nobody reads.
 *
 * Zero external dependencies.
 */

/**
 * The marker pair's name. A document writes `<!-- gate-exclude:start -->` on its own line above the
 * region and `<!-- gate-exclude:end -->` on its own line below it.
 */
export const EXCLUDED_REGION_MARKER = 'gate-exclude'

/**
 * Build the selector a line-reading gate passes as `excludedRange`.
 * @param marker - the marker name; the collection's own unless a caller names another.
 * @returns a selector over (repository-relative file, full source) returning the zero-based,
 * end-exclusive range between the markers, or undefined when the file carries no such region.
 */
export function excludedRegion(
  marker: string = EXCLUDED_REGION_MARKER,
): (file: string, source: string) => readonly [number, number] | undefined {
  const opening = `<!-- ${marker}:start -->`
  const closing = `<!-- ${marker}:end -->`
  return (_file: string, source: string): readonly [number, number] | undefined => {
    const starts: number[] = []
    const ends: number[] = []
    for (const [index, line] of source.split('\n').entries()) {
      const trimmed = line.trim()
      if (trimmed === opening) starts.push(index)
      else if (trimmed === closing) ends.push(index)
    }
    const start = starts[0]
    const end = ends[0]
    if (starts.length !== 1 || ends.length !== 1 || start === undefined || end === undefined || end <= start) {
      return undefined
    }
    return [start + 1, end]
  }
}
