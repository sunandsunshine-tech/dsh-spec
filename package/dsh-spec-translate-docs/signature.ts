/**
 * SPDX-License-Identifier: MIT
 *
 * Extracted from the DeepSeek Harness bilingual-document mechanism at source revision
 * `dsh-v0.2.1-rc.3` (`1f81c047fc48fa190a683e469daa699857e9afe8`) and reviewed against the
 * current `dsh-v0.2.3-alpha.2` pin; the skill-root THIRD_PARTY_NOTICES names the upstream paths
 * and the relation.
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
