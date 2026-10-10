/**
 * The delivery-plan surface: the optional skill that turns it on, and the paths and markers it owns.
 *
 * One home for these facts, because two halves need them: the manager reports and maintains the
 * surface (`status` calls it incomplete while the skill is installed and the tree or the hook is
 * missing), and the initializer creates and syncs it. Reading them from here keeps the initializer
 * off the manager's entry point, which would otherwise load a command line it never runs.
 *
 * Zero external dependencies.
 */

import { join } from 'node:path'

/** The optional skill whose install turns the delivery-plan surface on. */
export const PLAN_SURFACE_SKILL = 'dsh-agent-team-workflow'

/** The tree the delivery-plan contract lives in, relative to the project root. */
export const PLANS_DIR = join('.agents', 'dsh-spec', 'plans')

/** The markers around the delivery-plan hook in an instruction file. */
export const PLANS_SECTION_START = '<!-- dsh-spec:plans -->'
export const PLANS_SECTION_END = '<!-- /dsh-spec:plans -->'
