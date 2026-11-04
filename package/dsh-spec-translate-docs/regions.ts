/**
 * Generated (frozen) regions: a line-delimited marker format whose shell follows the upstream
 * shape while this skill keeps the stricter fence-aware, own-block and duplicate-slug rules.
 * A region is generator-owned; the record and structure signature treat it as opaque.
 */

/** One generated region, with its source line range and exact text (markers included). */
export interface GeneratedRegion {
  /** Marker slug, e.g. config-catalog:@scope/package. */
  slug: string
  /** Zero-based index of the BEGIN marker line. */
  begin: number
  /** Zero-based index of the END marker line. */
  end: number
  /** Exact text from BEGIN through END, newline-joined. */
  text: string
}

const BEGIN_MARKER = /^<!-- BEGIN GENERATED (\S+)(?: [^>]*)? -->$/
const END_MARKER = /^<!-- END GENERATED (\S+) -->$/
const FENCE = /^ {0,3}(\x60{3,}|~{3,})/

interface FenceState {
  character: string
  length: number
}

function markerLike(line: string): boolean {
  const start = line.indexOf('<!--')
  if (start < 0) return false
  const body = line.slice(start + '<!--'.length).trimStart()
  return /^(?:BEGIN|END)\s+GENERATED\b/.test(body)
}

/**
 * Extract every generated region from a document.
 * @param content - exact Markdown text.
 * @returns regions in document order.
 * @throws Error for malformed markers, nesting, unmatched markers, slug mismatch, an unclosed
 *   region, a duplicate slug, or a marker that is not its own top-level block.
 */
export function generatedRegions(content: string): GeneratedRegion[] {
  const lines = content.split('\n')
  const regions: GeneratedRegion[] = []
  const seen = new Set<string>()
  let open: { slug: string; begin: number } | undefined
  let fence: FenceState | undefined
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] as string
    const fenceMatch = FENCE.exec(line)
    if (fence !== undefined) {
      if (fenceMatch !== null && fenceMatch[1]?.[0] === fence.character && fenceMatch[1].length >= fence.length)
        fence = undefined
      continue
    }
    if (fenceMatch !== null) {
      fence = { character: fenceMatch[1]?.[0] ?? '\u0060', length: fenceMatch[1]?.length ?? 3 }
      continue
    }
    const begin = BEGIN_MARKER.exec(line)
    const end = END_MARKER.exec(line)
    const marker = begin ?? end
    if (marker === null) {
      if (markerLike(line)) throw new Error('malformed generated-region marker: ' + JSON.stringify(line))
      continue
    }
    const slug = marker[1] as string
    if (begin !== null) {
      if (open !== undefined) throw new Error('generated-region BEGIN nested inside ' + JSON.stringify(open.slug))
      const previous = index === 0 ? '' : (lines[index - 1] as string)
      if (previous.trim() !== '')
        throw new Error('generated-region BEGIN must be its own block: ' + JSON.stringify(line))
      if (seen.has(slug)) throw new Error('duplicate generated-region slug ' + JSON.stringify(slug))
      seen.add(slug)
      open = { slug, begin: index }
      continue
    }
    if (open === undefined) throw new Error('generated-region END without a BEGIN: ' + JSON.stringify(line))
    if (open.slug !== slug)
      throw new Error(
        'generated-region END slug ' + JSON.stringify(slug) + ' does not match BEGIN ' + JSON.stringify(open.slug),
      )
    const next = index + 1 >= lines.length ? '' : (lines[index + 1] as string)
    if (next.trim() !== '') throw new Error('generated-region END must be its own block: ' + JSON.stringify(line))
    regions.push({ slug, begin: open.begin, end: index, text: lines.slice(open.begin, index + 1).join('\n') })
    open = undefined
  }
  if (open !== undefined) throw new Error('generated-region BEGIN without an END: ' + JSON.stringify(open.slug))
  return regions
}

/**
 * Replace every generated-region line with spaces of the same length, preserving character
 * offsets and line numbering so the masked text parses with the same link offsets.
 * @param content - exact Markdown text.
 * @returns the masked text.
 */
export function maskGeneratedRegions(content: string): string {
  const regions = generatedRegions(content)
  if (regions.length === 0) return content
  const lines = content.split('\n')
  for (const region of regions) {
    for (let index = region.begin; index <= region.end; index += 1) {
      const line = lines[index] as string
      lines[index] = ' '.repeat(line.length)
    }
  }
  return lines.join('\n')
}

/**
 * Render one generated region with the canonical marker lines.
 * @param slug - region slug.
 * @param body - region content without markers.
 * @returns marker-delimited region text.
 * @throws Error when the slug is empty or the body carries a marker-shaped line.
 */
export function renderGeneratedRegion(slug: string, body: string): string {
  if (slug === '' || /\s/.test(slug) || slug.includes('>')) {
    throw new Error('generated-region slug must be one non-whitespace token: ' + JSON.stringify(slug))
  }
  const text = ['<!-- BEGIN GENERATED ' + slug + ' -->', body, '<!-- END GENERATED ' + slug + ' -->'].join('\n')
  generatedRegions(text)
  return text
}

/**
 * Replace the one existing region with a freshly rendered region.
 * @param content - page text.
 * @param slug - region slug.
 * @param body - new region content without markers.
 * @returns the page text with the region replaced.
 * @throws Error when the page does not contain exactly one region with that slug, or the result
 *   would violate the marker grammar.
 */
export function spliceGeneratedRegion(content: string, slug: string, body: string): string {
  const regions = generatedRegions(content)
  const matches = regions.filter((region) => region.slug === slug)
  if (matches.length !== 1) {
    throw new Error(
      'expected exactly 1 generated region ' +
        JSON.stringify(slug) +
        ', found ' +
        String(matches.length) +
        '; add its BEGIN/END markers once',
    )
  }
  const match = matches[0] as GeneratedRegion
  const lines = content.split('\n')
  const replacement = renderGeneratedRegion(slug, body).split('\n')
  const existingBegin = lines[match.begin] as string
  if (existingBegin !== replacement[0]) replacement[0] = existingBegin
  const next = [...lines.slice(0, match.begin), ...replacement, ...lines.slice(match.end + 1)].join('\n')
  generatedRegions(next)
  return next
}

/**
 * Whether the current two region lists agree after per-region normalization.
 * @param left - source regions.
 * @param right - counterpart regions.
 * @param normalize - normalizes one region's text (paired-document link normalization).
 * @returns the mismatching slug and normalized texts, or undefined when identical.
 */
export function regionMismatch(
  left: readonly GeneratedRegion[],
  right: readonly GeneratedRegion[],
  normalize: (text: string) => string,
): { slug: string; reason: string } | undefined {
  if (left.length !== right.length) {
    return {
      slug: left[Math.min(left.length, right.length)]?.slug ?? right[Math.min(left.length, right.length)]?.slug ?? '?',
      reason: 'region count differs',
    }
  }
  for (const [index, region] of left.entries()) {
    const other = right[index] as GeneratedRegion
    if (region.slug !== other.slug)
      return { slug: region.slug, reason: 'slug ' + JSON.stringify(other.slug) + ' differs' }
    const leftNormalized = normalize(region.text)
    const rightNormalized = normalize(other.text)
    if (leftNormalized !== rightNormalized)
      return { slug: region.slug, reason: 'bytes differ beyond paired-document locale paths' }
  }
  return undefined
}
