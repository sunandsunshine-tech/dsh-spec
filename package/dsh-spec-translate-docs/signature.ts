/**
 * SPDX-License-Identifier: MIT
 *
 * Extracted from the DeepSeek Harness bilingual-document mechanism at the pinned
 * `dsh-v0.2.2-alpha.2` (`f3803c96974ad4a94195fb97e5c637e9c2a3afe3`); the skill-root
 * THIRD_PARTY_NOTICES names the upstream paths and the relation.
 */
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
