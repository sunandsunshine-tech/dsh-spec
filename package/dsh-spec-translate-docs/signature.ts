/**
 * Source-bound target signatures. H(sourceHash || targetContentHash), truncated to 16 hex.
 * Kept free of Markdown dependencies so the mechanism's vector test needs no install.
 */

import { createHash } from 'node:crypto'

/** Bind a target content hash to the source hash it was confirmed against. */
export function bindTarget(sourceHash: string, targetHash: string): string {
  return createHash('sha256')
    .update(sourceHash + '\n' + targetHash)
    .digest('hex')
    .slice(0, 16)
}
