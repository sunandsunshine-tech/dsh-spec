/**
 * Freeze one marked region of a live document from the gates that read links.
 *
 * A document sometimes has to keep a stretch of text exactly as it stands — a quoted historical
 * format, an example whose brackets are deliberately not links — while the rest of it stays authored
 * prose that every gate must read. The frozen archive answers the whole-file case by moving the file
 * out of the corpus; this answers the in-file case with one marker pair, and both link gates take the
 * range it returns as their `excludedRange` selector.
 *
 * The region is the project's own text, so its own links are left unchecked — and an anchor it
 * defines stays a valid target, because marking a region must not turn it into an island that
 * inbound links cannot reach. The marker names no gate and promises nothing beyond the link gates: a
 * gate that reads something else is unaffected, and a gate added later reads the whole file until it
 * asks for the selector.
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
 * The marker pair's name. A document writes `<!-- preserved-region:start -->` on its own line above
 * the region and `<!-- preserved-region:end -->` on its own line below it.
 */
export const EXCLUDED_REGION_MARKER = 'preserved-region'

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
