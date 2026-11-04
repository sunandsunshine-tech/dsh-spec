/**
 * The forge's spec gate: the mechanical half of Agent Skills conformance.
 *
 * The gate lives with the skill that ships it, at the landed path. Each case builds its own skill
 * directory under the system temporary directory and removes it again, so the suite needs no
 * network, no clock, and no repository state beyond the gate itself.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { runScript } from './helpers/cli.ts'
import { REPO_ROOT } from './helpers/fixtures.ts'

const workDraftGate = '.agents/dsh-spec-skill-forge/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs'
const landedGate = 'skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs'
const gate = existsSync(workDraftGate) ? workDraftGate : landedGate

/** Build a skill directory holding one SKILL.md, and return its path. */
function skillDir(name: string, body: string): string {
  const parent = mkdtempSync(join(tmpdir(), 'skill-spec-'))
  const root = join(parent, name)
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'SKILL.md'), body)
  return root
}

function withSkill(name: string, body: string, check: (root: string) => void): void {
  const root = skillDir(name, body)
  try {
    check(root)
  } finally {
    rmSync(dirname(root), { recursive: true, force: true })
  }
}

test('a conforming skill passes', () => {
  withSkill(
    'good-skill',
    '---\nname: good-skill\ndescription: Does one thing when it is asked for.\n---\n\nDo the thing.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /0 failed/)
    },
  )
})

test('an empty description fails', () => {
  withSkill('empty-description', '---\nname: empty-description\ndescription: ""\n---\n\nBody.\n', (root) => {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL description/)
  })
})

test('a name that disagrees with its directory fails', () => {
  withSkill('right-name', '---\nname: another-name\ndescription: Says something.\n---\n\nBody.\n', (root) => {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL name/)
  })
})

test('a link that escapes the skill directory fails', () => {
  withSkill(
    'escaping-link',
    '---\nname: escaping-link\ndescription: Points outside itself.\n---\n\nSee [outside](../../etc/passwd).\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL links stay inside/)
    },
  )
})

test('a missing script mention fails', () => {
  withSkill(
    'missing-script',
    '---\nname: missing-script\ndescription: Names a script it does not ship.\n---\n\nRun `script/absent.ts`.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL script mentions/)
    },
  )
})

test('a missing script named inside a command fails', () => {
  withSkill(
    'missing-command-script',
    '---\nname: missing-command-script\ndescription: Runs a script it does not ship.\n---\n\nRun `node script/absent.ts --check`.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL script mentions/)
    },
  )
})

test('the selected gate passes its own skill', () => {
  const result = runScript(gate)
  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /0 failed/)
})

test('--help prints usage and exits 0', () => {
  const result = runScript(gate, ['--help'])
  assert.equal(result.status, 0, result.output)
  assert.match(result.output, /usage: verify-skill-spec\.mjs/)
})

test('the reported line count matches the file', () => {
  withSkill('line-count', '---\nname: line-count\ndescription: Counts its own lines.\n---\n\nBody.\n', (root) => {
    const result = runScript(gate, [root])
    assert.match(result.output, /ok {3}SKILL\.md — 6 lines/)
  })
})

test('invalid YAML in the frontmatter fails', () => {
  withSkill('bad-yaml', '---\nname: bad-yaml\ndescription: [unclosed\n---\n\nBody.\n', (root) => {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL frontmatter/)
  })
})

test('frontmatter that is not a mapping fails', () => {
  withSkill('list-frontmatter', '---\n- one\n- two\n---\n\nBody.\n', (root) => {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL frontmatter — YAML must be a mapping/)
  })
})

test('non-string required and optional fields fail', () => {
  withSkill(
    'typed-fields',
    '---\nname: 3\ndescription: 4\ncompatibility: 5\nlicense: 6\nallowed-tools: 7\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL name/)
      assert.match(result.output, /FAIL description/)
      assert.match(result.output, /FAIL compatibility/)
      assert.match(result.output, /FAIL license/)
      assert.match(result.output, /FAIL allowed-tools/)
    },
  )
})

test('allowed-tools accepts repeated spaces and rejects commas', () => {
  withSkill(
    'spaced-tools',
    '---\nname: spaced-tools\ndescription: Has doubled spaces.\nallowed-tools: "Read  Write"\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /ok {3}allowed-tools/)
    },
  )
  withSkill(
    'comma-tools',
    '---\nname: comma-tools\ndescription: Has a comma.\nallowed-tools: "Read,Write"\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL allowed-tools/)
      assert.match(result.output, /without commas/)
    },
  )
})

test('metadata keys must be strings', () => {
  withSkill(
    'numeric-metadata-key',
    '---\nname: numeric-metadata-key\ndescription: Has a numeric key.\nmetadata:\n  3: value\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL metadata/)
    },
  )
})

test('metadata must be a map of strings', () => {
  withSkill(
    'list-metadata',
    '---\nname: list-metadata\ndescription: Has list metadata.\nmetadata:\n  - one\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL metadata/)
    },
  )
})

test('a metadata value that is not a string fails', () => {
  withSkill(
    'numeric-metadata',
    '---\nname: numeric-metadata\ndescription: Carries a bare number.\nmetadata:\n  version: 3\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL metadata/)
    },
  )
})

test('a folded description beside metadata passes', () => {
  const body =
    '---\nname: folded\ndescription: >\n  Does one thing.\n  Use when testing.\nmetadata:\n  author: me\n---\n\nBody.\n'
  withSkill('folded', body, (root) => {
    const result = runScript(gate, [root])
    assert.equal(result.status, 0, result.output)
    assert.match(result.output, /metadata — 1 string entries/)
  })
})

test('an empty compatibility field fails', () => {
  withSkill(
    'empty-compatibility',
    '---\nname: empty-compatibility\ndescription: Has an empty field.\ncompatibility: ""\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL compatibility/)
    },
  )
})

test('a duplicate frontmatter key fails', () => {
  withSkill(
    'duplicate-key',
    '---\nname: duplicate-key\ndescription: One.\ndescription: Two.\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL frontmatter — .*Map keys must be unique/)
    },
  )
})

test('an unknown option exits 2 with an error', () => {
  const result = runScript(gate, ['--bogus'])
  assert.equal(result.status, 2, result.output)
  assert.match(result.output, /Error: unknown option: --bogus/)
})

test('a second skill directory exits 2 as ambiguous', () => {
  const result = runScript(gate, ['/tmp/one', '/tmp/two'])
  assert.equal(result.status, 2, result.output)
  assert.match(result.output, /expected one skill directory/)
})

test('a path that is not a directory exits 2 with an error', () => {
  const parent = mkdtempSync(join(tmpdir(), 'skill-spec-'))
  const absent = join(parent, 'absent')
  rmSync(parent, { recursive: true, force: true })
  const result = runScript(gate, [absent])
  assert.equal(result.status, 2, result.output)
  assert.match(result.output, /Error: .* is not a directory/)
})

test('--json prints a parseable summary', () => {
  const result = runScript(gate, ['--json'])
  assert.equal(result.status, 0, result.output)
  const summary = JSON.parse(result.stdout) as { results: { ok: boolean }[] }
  assert.ok(Array.isArray(summary.results) && summary.results.length > 0)
  assert.ok(
    summary.results.every((item) => item.ok),
    result.stdout,
  )
})

test('an over-default body fails the budget', () => {
  const body = `---\nname: over-budget\ndescription: Runs long.\n---\n\n${'line\n'.repeat(510)}`
  withSkill('over-budget', body, (root) => {
    const loose = runScript(gate, [root])
    assert.equal(loose.status, 1, loose.output)
    assert.match(loose.output, /FAIL budget/)
  })
})

test('--chars-per-token re-estimates the budget for another tokenizer', () => {
  const body = `---\nname: ratio-budget\ndescription: Estimates with a ratio.\n---\n\n${'word '.repeat(5000)}`
  withSkill('ratio-budget', body, (root) => {
    const strict = runScript(gate, [root])
    assert.equal(strict.status, 1, strict.output)
    assert.match(strict.output, /0\.303 other tokens\/char/)
    const lenient = runScript(gate, [root, '--chars-per-token', '5.2'])
    assert.equal(lenient.status, 0, lenient.output)
    assert.match(lenient.output, /0\.192 other tokens\/char/)
  })
})

test('--chars-per-token rejects a value that is not a ratio', () => {
  for (const value of ['zero', '0', '12']) {
    const result = runScript(gate, ['--chars-per-token', value])
    assert.equal(result.status, 2, result.output)
    assert.match(result.output, /chars-per-token/)
  }
})

test('--name-max, --description-max, --max-lines and --max-tokens are parameters', () => {
  withSkill(
    'parameterized',
    '---\nname: parameterized\ndescription: A description longer than ten characters.\n---\n\nBody.\n',
    (root) => {
      const name = runScript(gate, [root, '--name-max', '5'])
      assert.equal(name.status, 1, name.output)
      assert.match(name.output, /FAIL name/)
      const description = runScript(gate, [root, '--description-max', '10'])
      assert.equal(description.status, 1, description.output)
      assert.match(description.output, /FAIL description/)
      const lines = runScript(gate, [root, '--max-lines', '1'])
      assert.equal(lines.status, 1, lines.output)
      assert.match(lines.output, /FAIL budget/)
      const tokens = runScript(gate, [root, '--max-tokens', '1'])
      assert.equal(tokens.status, 1, tokens.output)
      assert.match(tokens.output, /FAIL budget/)
    },
  )
})

test('--cjk-tokens-per-char and --other-tokens-per-char adjust the estimate', () => {
  withSkill(
    'rate-params',
    '---\nname: rate-params\ndescription: A body of CJK characters.\n---\n\n' + '字'.repeat(4600),
    (root) => {
      const strict = runScript(gate, [root])
      assert.equal(strict.status, 1, strict.output)
      const lenient = runScript(gate, [root, '--cjk-tokens-per-char', '0.6', '--other-tokens-per-char', '0.3'])
      assert.equal(lenient.status, 0, lenient.output)
      assert.match(lenient.output, /0\.6 CJK/)
    },
  )
})

test('CJK characters are charged conservatively in the budget', () => {
  const skill = (name: string, count: number) =>
    `---\nname: ${name}\ndescription: Counts CJK.\n---\n\n${'字'.repeat(count)}`
  withSkill('cjk-over', skill('cjk-over', 4600), (root) => {
    const strict = runScript(gate, [root])
    assert.equal(strict.status, 1, strict.output)
    assert.match(strict.output, /FAIL budget/)
  })
  withSkill('cjk-under', skill('cjk-under', 4400), (root) => {
    const strict = runScript(gate, [root])
    assert.equal(strict.status, 0, strict.output)
  })
})

test('a SKILL.md that is a directory fails as not a regular file', () => {
  const parent = mkdtempSync(join(tmpdir(), 'skill-spec-'))
  const root = join(parent, 'dir-skill')
  mkdirSync(join(root, 'SKILL.md'), { recursive: true })
  try {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL SKILL\.md — not a regular file/)
  } finally {
    rmSync(parent, { recursive: true, force: true })
  }
})

test('a shipped reference that SKILL.md never names fails', () => {
  const parent = mkdtempSync(join(tmpdir(), 'skill-spec-'))
  const root = join(parent, 'orphan-reference')
  mkdirSync(join(root, 'references'), { recursive: true })
  writeFileSync(join(root, 'references', 'orphan.md'), 'orphan\n')
  writeFileSync(
    join(root, 'SKILL.md'),
    '---\nname: orphan-reference\ndescription: Ships a file it never reads.\n---\n\nBody.\n',
  )
  try {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL reference mentions/)
  } finally {
    rmSync(parent, { recursive: true, force: true })
  }
})

test('a directory with no SKILL.md fails', () => {
  const parent = mkdtempSync(join(tmpdir(), 'skill-spec-'))
  const root = join(parent, 'empty-skill')
  mkdirSync(root, { recursive: true })
  try {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL SKILL\.md/)
  } finally {
    rmSync(parent, { recursive: true, force: true })
  }
})

test('a link deeper than one level fails', () => {
  const parent = mkdtempSync(join(tmpdir(), 'skill-spec-'))
  const root = join(parent, 'deep-link')
  mkdirSync(join(root, 'references', 'nested'), { recursive: true })
  writeFileSync(join(root, 'references', 'nested', 'inner.md'), 'inner\n')
  writeFileSync(
    join(root, 'SKILL.md'),
    '---\nname: deep-link\ndescription: Points two levels down.\n---\n\nSee [inner](references/nested/inner.md).\n',
  )
  try {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL link depth/)
  } finally {
    rmSync(parent, { recursive: true, force: true })
  }
})

test('a scripts/ mention passes when the file exists and fails when it does not', () => {
  withSkill(
    'scripts-plural',
    '---\nname: scripts-plural\ndescription: Names a script under scripts/.\n---\n\nRun `scripts/real.mjs`.\n',
    (root) => {
      mkdirSync(join(root, 'scripts'), { recursive: true })
      writeFileSync(join(root, 'scripts', 'real.mjs'), 'console.log("real")\n')
      const existing = runScript(gate, [root])
      assert.equal(existing.status, 0, existing.output)
      assert.match(existing.output, /ok {3}script mentions — scripts\/real\.mjs/)
      const absent = runScript(gate, [root, '--json'])
      assert.equal(absent.status, 0, absent.output)
      writeFileSync(
        join(root, 'SKILL.md'),
        '---\nname: scripts-plural\ndescription: Names a script.\n---\n\nRun `scripts/absent.mjs`.\n',
      )
      const missing = runScript(gate, [root])
      assert.equal(missing.status, 1, missing.output)
      assert.match(missing.output, /FAIL script mentions/)
    },
  )
})

test('a script mention inside another word is not matched', () => {
  withSkill(
    'proofscript',
    '---\nname: proofscript\ndescription: Names a path that is not a scripts directory.\n---\n\nRun `proofscript/run.js`.\n',
    (root) => {
      mkdirSync(join(root, 'proofscript'), { recursive: true })
      writeFileSync(join(root, 'proofscript', 'run.js'), 'console.log("run")\n')
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /none mentioned/)
    },
  )
})

test('a SKILL.md with a byte-order mark passes', () => {
  withSkill(
    'bom-skill',
    '\uFEFF---\nname: bom-skill\ndescription: Starts with a byte-order mark.\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /ok {3}frontmatter/)
    },
  )
})

test('a SKILL.md with CRLF line endings passes', () => {
  withSkill(
    'crlf-skill',
    '---\r\nname: crlf-skill\r\ndescription: Uses CRLF line endings.\r\n---\r\n\r\nBody.\r\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /ok {3}frontmatter/)
    },
  )
})

test('a link to the skill root is not an escaping link', () => {
  withSkill(
    'root-link',
    '---\nname: root-link\ndescription: Links to its own root.\n---\n\nSee [the root](.).\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /ok {3}links stay inside/)
    },
  )
})

test('a link inside a fenced code block is an example, not a link', () => {
  withSkill(
    'fenced-link',
    '---\nname: fenced-link\ndescription: Shows a link inside a code fence.\n---\n\n```md\n[outside](../../etc/passwd)\n```\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /ok {3}links stay inside/)
    },
  )
})

test('the line limit is exclusive at its boundary', () => {
  withSkill('line-boundary', '---\nname: line-boundary\ndescription: Counts lines.\n---\n\nBody.\n', (root) => {
    const result = runScript(gate, [root, '--max-lines', '6'])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL budget/)
  })
})

test('the token budget counts the body, not the frontmatter', () => {
  const description = 'D'.repeat(1000)
  withSkill('body-budget', `---\nname: body-budget\ndescription: ${description}\n---\n\nBody.\n`, (root) => {
    const result = runScript(gate, [root, '--max-tokens', '50'])
    assert.equal(result.status, 0, result.output)
    assert.match(result.output, /ok {3}budget/)
  })
})

test('a relative link with a fragment resolves to its file', () => {
  withSkill(
    'fragment-link',
    '---\nname: fragment-link\ndescription: Links to a fragment.\n---\n\nSee [notes](references/notes.md#details).\n',
    (root) => {
      mkdirSync(join(root, 'references'), { recursive: true })
      writeFileSync(join(root, 'references', 'notes.md'), '# Notes\n\n## Details\n')
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /ok {3}links resolve/)
    },
  )
})

test('a reference path named in the body must exist', () => {
  withSkill(
    'missing-reference-target',
    '---\nname: missing-reference-target\ndescription: Names a missing reference.\n---\n\nRead `references/missing.md` for details.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL reference targets/)
    },
  )
})

test('a script path in plain text must exist', () => {
  withSkill(
    'plain-script',
    '---\nname: plain-script\ndescription: Names a script in prose.\n---\n\nRun scripts/missing.mjs.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL script mentions/)
    },
  )
})

test('a translated pair beside a reference is not a second reference', () => {
  withSkill(
    'paired-reference',
    '---\nname: paired-reference\ndescription: Has a translated reference.\n---\n\nRead `references/notes.md`.\n',
    (root) => {
      mkdirSync(join(root, 'references'), { recursive: true })
      writeFileSync(join(root, 'references', 'notes.md'), '# Notes\n')
      writeFileSync(join(root, 'references', 'notes.zh.md'), '# 笔记\n')
      writeFileSync(join(root, 'references', 'notes.ja.md'), '# ノート\n')
      writeFileSync(
        join(root, 'references', 'notes.i18n.yaml'),
        'source: notes.md\nlanguage: zh\nsource_sha: 000000000000\n',
      )
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /ok {3}reference mentions/)
    },
  )
})

test('a leading ./ script path is checked', () => {
  withSkill(
    'dot-script',
    '---\nname: dot-script\ndescription: Names a dot script.\n---\n\nRun `./scripts/missing.mjs`.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL script mentions/)
    },
  )
})

test('a fenced script command is checked', () => {
  withSkill(
    'fenced-script',
    '---\nname: fenced-script\ndescription: Names a fenced script.\n---\n\n```sh\nnode scripts/missing.mjs\n```\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL script mentions/)
    },
  )
})

test('a script with another extension is checked', () => {
  withSkill(
    'ruby-script',
    '---\nname: ruby-script\ndescription: Names a ruby script.\n---\n\nRun `scripts/missing.rb`.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL script mentions/)
    },
  )
})

test('a nested script path is checked', () => {
  withSkill(
    'nested-script',
    '---\nname: nested-script\ndescription: Names a nested script.\n---\n\nRun `scripts/lib/missing.mjs`.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL script mentions/)
    },
  )
})

test('a shipped but unnamed script fails script coverage', () => {
  withSkill(
    'unnamed-script',
    '---\nname: unnamed-script\ndescription: Ships an unnamed script.\n---\n\nBody.\n',
    (root) => {
      mkdirSync(join(root, 'scripts'), { recursive: true })
      writeFileSync(join(root, 'scripts', 'extra.mjs'), 'console.log(1)\n')
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL script coverage/)
    },
  )
})

test('a leading ./ reference target is checked', () => {
  withSkill(
    'dot-reference',
    '---\nname: dot-reference\ndescription: Names a dot reference.\n---\n\nSee `./references/missing.md`.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL reference targets/)
    },
  )
})

test('a plain reference deeper than one level fails', () => {
  withSkill(
    'deep-reference',
    '---\nname: deep-reference\ndescription: Names a deep reference.\n---\n\nSee `references/sub/missing.md`.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL reference targets/)
    },
  )
})

test('a whitespace-only description fails', () => {
  withSkill('blank-description', '---\nname: blank-description\ndescription: "   "\n---\n\nBody.\n', (root) => {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL description/)
  })
})

test('the name limit is a parameter, defaulting to the current specification', () => {
  const name = 'a'.repeat(70)
  withSkill(name, `---\nname: ${name}\ndescription: A long name.\n---\n\nBody.\n`, (root) => {
    const defaulted = runScript(gate, [root])
    assert.equal(defaulted.status, 1, defaulted.output)
    assert.match(defaulted.output, /FAIL name/)
    const raised = runScript(gate, [root, '--name-max', '100'])
    assert.equal(raised.status, 0, raised.output)
  })
})

test('a references file instead of a directory fails without a crash', () => {
  withSkill(
    'references-file',
    '---\nname: references-file\ndescription: Has a references file.\n---\n\nBody.\n',
    (root) => {
      writeFileSync(join(root, 'references'), 'not a directory\n')
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL references directory/)
      assert.doesNotMatch(result.output, /ENOTDIR|at markdownFiles/)
    },
  )
})

test('reference-style and HTML links are resolved', () => {
  withSkill(
    'reference-link',
    '---\nname: reference-link\ndescription: Uses reference links.\n---\n\n[notes][n] and <a href="references/also.md">also</a>.\n\n[n]: references/missing.md\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL links resolve/)
    },
  )
})

test('a link in the frontmatter description is not a body link', () => {
  withSkill(
    'frontmatter-link',
    '---\nname: frontmatter-link\ndescription: "See [docs](references/missing.md)."\n---\n\nBody.\n',
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
      assert.match(result.output, /ok {3}links resolve/)
    },
  )
})

test('a symlinked reference that escapes the skill fails containment', () => {
  withSkill(
    'symlink-link',
    '---\nname: symlink-link\ndescription: Links through a symlink.\n---\n\nSee [evil](references/evil.md).\n',
    (root) => {
      mkdirSync(join(root, 'references'), { recursive: true })
      symlinkSync('/etc/hostname', join(root, 'references', 'evil.md'))
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL links stay inside/)
    },
  )
})

test('the line budget defaults to the current specification and is a parameter', () => {
  const body = `---\nname: long-budget\ndescription: Runs long.\n---\n\n${'line\n'.repeat(510)}`
  withSkill('long-budget', body, (root) => {
    const defaulted = runScript(gate, [root])
    assert.equal(defaulted.status, 1, defaulted.output)
    assert.match(defaulted.output, /FAIL budget/)
    const raised = runScript(gate, [root, '--max-lines', '1000'])
    assert.equal(raised.status, 0, raised.output)
  })
})

test('a BCP 47 translation tag is ignored as a reference pair', () => {
  withSkill(
    'bcp47-pair',
    '---\nname: bcp47-pair\ndescription: Has a traditional Chinese pair.\n---\n\nRead `references/notes.md`.\n',
    (root) => {
      mkdirSync(join(root, 'references'), { recursive: true })
      writeFileSync(join(root, 'references', 'notes.md'), '# Notes\n')
      writeFileSync(join(root, 'references', 'notes.zh-Hant-TW.md'), '# 筆記\n')
      const result = runScript(gate, [root])
      assert.equal(result.status, 0, result.output)
    },
  )
})

test('the specification minimal frontmatter-only skill passes', () => {
  withSkill('frontmatter-only', '---\nname: frontmatter-only\ndescription: Minimal skill.\n---\n', (root) => {
    const result = runScript(gate, [root])
    assert.equal(result.status, 0, result.output)
  })
})

test('kana and Hangul are charged as CJK in the budget', () => {
  withSkill('kana-budget', `---\nname: kana-budget\ndescription: Kana body.\n---\n\n${'あ'.repeat(6000)}\n`, (root) => {
    const result = runScript(gate, [root])
    assert.equal(result.status, 1, result.output)
    assert.match(result.output, /FAIL budget/)
  })
  withSkill(
    'hangul-budget',
    `---\nname: hangul-budget\ndescription: Hangul body.\n---\n\n${'한'.repeat(6000)}\n`,
    (root) => {
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL budget/)
    },
  )
})

test('an absolute link inside the skill fails as non-relative', () => {
  withSkill(
    'absolute-link',
    (() => {
      return '---\nname: absolute-link\ndescription: Uses an absolute link.\n---\n\n\n'
    })(),
    (root) => {
      mkdirSync(join(root, 'references'), { recursive: true })
      writeFileSync(join(root, 'references', 'guide.md'), '# Guide\n')
      const absolute = join(root, 'references', 'guide.md')
      writeFileSync(
        join(root, 'SKILL.md'),
        `---\nname: absolute-link\ndescription: Uses an absolute link.\n---\n\nSee [guide](${absolute}).\n`,
      )
      const result = runScript(gate, [root])
      assert.equal(result.status, 1, result.output)
      assert.match(result.output, /FAIL links stay inside/)
      assert.match(result.output, /absolute:/)
    },
  )
})
