/**
 * `verify-norm-reference`: a shipped text names a norm by its catalog id, so the id it names has to
 * be one the installed catalog ships.
 *
 * The gate reads what a project loaded — the deployment under `.agents/skills/` — rather than the
 * authored source, so every case builds the installed copy the way the installer would. A citation
 * is a backticked `<group>.<name>` token, and only a token whose first half is a catalog group is
 * read: a filename (`package.json`) and another namespace's name (`ctx.shell`) are not citations,
 * which is the precision that keeps the gate a signal rather than noise.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runCli, runScript, selected } from './helpers/cli.ts'
import { INSTALLED_SKILLS, makeFixture, normCatalog, writeInstalledSkillTexts } from './helpers/fixtures.ts'

/** The gate, run the way the dispatcher runs it: a tree assertion needs its whole root. */
const GATE = 'skills/dsh-spec-manager/scripts/verify-norm-reference.ts'

const MANAGER = `${INSTALLED_SKILLS}/dsh-spec-manager`
const CATALOG = `${MANAGER}/references/norms.json`
const SHIPPED = `${MANAGER}/references/guide.md`

/** Run the gate against one fixture root. */
function gate(root: string): { status: number, output: string } {
  return runScript(GATE, ['--all', '--root', root])
}

test('a shipped text citing a catalog id passes', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeInstalledSkillTexts(fixture, '# Guide\n\nwhere this project applies `pr.lifecycle`, that norm owns the act.\n')

  const result = gate(fixture.root)

  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /verify-norm-reference: 1 shipped text\(s\) read; 1 catalog citation\(s\) resolve\./)
})

test('a citation the catalog does not ship fails, naming the file, the line and the id', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeInstalledSkillTexts(fixture, '# Guide\n\nwhere this project applies `pr.lifecicle`, that norm owns the act.\n')

  const result = gate(fixture.root)

  assert.equal(result.status, 1, result.output)
  assert.match(result.output, /no norm with this id is in/)
  assert.match(result.output, new RegExp(`${SHIPPED.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:3 \`pr\\.lifecicle\``))
})

test('a token whose first half is no catalog group is not a citation', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeInstalledSkillTexts(fixture, '# Guide\n\nRun `ctx.shell`, read `metadata.github-ref`, keep `package.json`.\n')

  const result = gate(fixture.root)

  assert.equal(result.status, 0, result.output)
  assert.match(result.stdout, /0 catalog citation\(s\) resolve/)
})

test('a file extension after the dot is a filename, not a norm name', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  // `pr` is a group, so `pr.json` would be read as a norm called `json` without the extension rule.
  writeInstalledSkillTexts(fixture, '# Guide\n\nThe catalog is `pr.json`, read by the manager.\n')

  const result = gate(fixture.root)

  assert.equal(result.status, 0, result.output)
})

test('an installed set with no shipped text is refused', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  fixture.write(CATALOG, normCatalog())

  const result = gate(fixture.root)

  assert.notEqual(result.status, 0, result.output)
  assert.match(result.output, /nothing to read/)
})

test('an installed set with no catalog is refused', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  fixture.write(SHIPPED, '# Guide\n\nApply `pr.lifecycle`.\n')

  const result = gate(fixture.root)

  assert.notEqual(result.status, 0, result.output)
  assert.match(result.output, /no norms catalog/)
})

test('a changed shipped text selects the norm-reference check', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeInstalledSkillTexts(fixture)
  fixture.commit('install the skill set')
  fixture.write(SHIPPED, '# Installed guide\n\nApply `pr.lifecycle` where a change needs a phase, in a new sentence.\n')

  const result = runCli(fixture.root, ['check', '--base', 'HEAD'])

  assert.equal(result.status, 0, result.output)
  assert.deepEqual(selected(result.output), ['norm-reference'])
})

test('a changed engine script selects no check', (t) => {
  const fixture = makeFixture()
  t.after(() => fixture.dispose())
  writeInstalledSkillTexts(fixture)
  fixture.commit('install the skill set')
  fixture.write(`${MANAGER}/scripts/probe.ts`, 'export const probe = 1\n')

  const result = runCli(fixture.root, ['check', '--base', 'HEAD'])

  // The installed set is a deployment of the engine too, and the citation gate reads its shipped
  // texts rather than its code, so a code change is not this check's business.
  assert.equal(result.status, 0, result.output)
  assert.deepEqual(selected(result.output), [])
})
