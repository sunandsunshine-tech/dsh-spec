# Agent Note: frontmatter 在采用者项目里没有归属者

Status: implemented

[English](2026-09-21-frontmatter-has-no-owner-in-an-adopted-project.md) | 中文

## 问题

`verify-md-metadata` 会拒绝项目 Markdown 中任何格式错误的 YAML frontmatter 块。它是在一次批量重排把本仓库九个 frontmatter 块塌缩成一行之后写下的，在本仓库里它确实有存在的价值：技能 README 带有 frontmatter，而除此之外没有别的东西读它。

采用本集合的项目并没有这样的文件。笔记机制使用自己的头部块——`# Agent Note:` 加 `Status:`——由格式门禁管；这套 frontmatter 所来自的 `kind:` 分类属于文档机制，而文档机制已经删除；安装副本又在所有散文门禁的范围之外，那里的 README 根本不会被读到。项目拥有的唯一 frontmatter 是它自己的，而本集合交付的机制没有任何一条要求它。于是这道门禁执行了一条没有归属者的规则，并且让每个新项目的第一次运行失败：`init` 写出六个 Markdown 文件，没有一个带 frontmatter 块，而门禁把「没有可检查的东西」当作失败——按「门禁不得在空语料上通过」这条规则，它这样做是对的。

## 决策

`verify-md-metadata` 退出集合，记录现在点名七道门禁。检查留在规则所在之处：本仓库自己的门禁 `scripts/verify-skill-structure.ts` 负责校验 README 系列的 frontmatter——围栏、闭合、`key: value` 行——因为技能 README 是本套件交付的唯一 frontmatter，而那道门禁本来就拥有打包层。

## 曾考虑的替代方案

**为这道门禁放宽空语料规则。** 读到文件但没有 frontmatter 块时通过，只有什么都没读到才失败。它落选，是因为这削弱了让聚合检查可信的性质——什么都不报告的门禁等于没有运行——只为保留一项其主题在采用者项目里并不存在的检查。

**在 `init` 的某个模版里带上 frontmatter 块。** 写出的文件中就有一个带 frontmatter，门禁有东西可查，新项目也就绿了。它落选，是因为这是为了满足检查而发明约定：那个块只为让门禁有事可做而存在，而此后每个项目都得留着它。

**保留门禁，让没有 frontmatter 的项目自行跳过。** 门禁按名称寻址，项目不跑它就行。它落选，是因为聚合检查会运行记录中的每一道门禁，而一道必须被项目排除的门禁是集合的缺陷，不是项目做的选择。

## 后果

- 新项目 `install` 之后再跑 `dsh-spec.ts all --check` 不再因为一个没人写过的文件而失败；记录里的集合是七道门禁。
- 确实使用 frontmatter 的项目没有随包发布的形态检查。那属于评审职责，这样的项目可以自己接一道检查。
- 本仓库保留自己的覆盖：结构门禁现在校验 `README.md` 与 `README.zh.md` 的 frontmatter，而这正是促使删除那道门禁的事故落地之处。
- 验证：`dsh-spec.ts all --check --root .` 以 `run: 7 gate(s), 0 failed` 结束；向空仓库执行 `install`、提交后再运行 `dsh-spec.ts all --check --root <该项目>`，同样以 `run: 7 gate(s), 0 failed` 结束；`verify-skill-structure.ts` 在所运行的技能目录上通过。

## 相关

- [把 frontmatter 当作块，而不是段落](../bug-fix/2026-09-18-frontmatter-is-a-block-not-a-paragraph.zh.md) —— 它的检查离开了随包集合的那次事故。
