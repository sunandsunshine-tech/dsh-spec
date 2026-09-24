# 公开与发布规划示例

这份规划同时是**公开执行规划**和**本次发布的规划**:按 §5 顺序执行,完成后仓库公开、`v0.3.0` 发布、发布后的运营底座就位。

依据:`questions.md`(62 题)、`checklist.md`(任务定义)、`sources.md`(来源与台账)、[`example-answers.md`](example-answers.md)(逐题作答示例)。条目编号 `WP-*` 工作包、`T*` 阶段条目;「对应清单」指向 `checklist.md`,标「新增」的条目执行时一并补入。

## 0. 执行原则

1. **底层到上层,一次做对。** 先定文件与内容的真值,再上会校验这些真值的自动化,再动历史,再动平台,最后发布。反例写在第 5 节各阶段开头:先上 CI 再改基线,CI 要重跑;先切可见性再改写历史,强推就打在公开仓库上。
2. **每条有完成判据**,结束时不留未完成项。
3. **阶段内并行只允许写作用域不重叠**;需要并行开 PR 时用 worktree(见 §3)。
4. **不可撤回或需授权的动作由维护者执行**:历史改写、可见性切换、平台设置、发布。

## 1. 决策台账(全部已定)

| 项 | 决定 |
|---|---|
| 许可证 | 保持 MIT |
| 版权行 | 维持现状(公司法定全名 + 品牌括注);外部贡献出现后考虑 `and contributors` |
| 联系邮箱 | 用公司邮箱写进 `SECURITY.md` 与 CoC 执行联系人 |
| 提交邮箱 | 改用 noreply 并改写历史 |
| 入站权利 | **DCO 从 day0 生效**:写进 `CONTRIBUTING.md`,并配 `scripts/verify-dco.ts` 检查;agent 不得代签 |
| CoC | Contributor Covenant 2.1 英文原文,单语不配对;中文只给指针 |
| AI 贡献 | 允许并披露;`Assisted-by:`;自主 agent 的 PR 需事先获批 |
| CI | `pull_request` 门禁 + `push: [main]` 验证;只读 token;action 钉 SHA;`submodules: recursive`;node 24 |
| vendored 检测 | 依赖提交 API,`push: [main]` 触发,不加定时器 |
| advisory | 只两条边界:待检内容能影响采用者执行环境;解析不可信输入可被触发挂死或资源耗尽。门禁可系统性绕过按普通缺陷走 release notes |
| 功能开关 | homepage 不加;Projects/Wiki/Discussions 关;Issues 开;topics 五个标签 |
| 路线图 | 不建独立文件,后续用 milestones |
| 文档归属 | 表单套装随仓库开源;公开前报告归档进 `docs/open-source/`;两份工作文件整理成 [`example-answers.md`](example-answers.md) 与 [`example-plan.md`](example-plan.md) 后不保留 |
| release 模板 | 增补「相关 issue 与 PR」区块 |
| 基线 | bump 到 `dsh-v0.1.7-rc.1`;此后 **dsh 每次发布都跟一次** |
| 版本号 | 本次发布 `v0.3.0` |
| 团队 | 不强制;适合并行的工作包各自开 PR;worktree 按需安排,本规划不额外着墨 |
| 不做 | dsh-client-ui-ux 不抽取;agent-teams 笔记不跟进;Auto review 不安装(见 §8) |

## 2. 交付物与文件归属

**随仓库开源(`docs/open-source/`)**:`form.md`、`questions.md`、`checklist.md`、`sources.md`、[`example-answers.md`](example-answers.md)(答题样例 + 交互问询样例)、[`example-plan.md`](example-plan.md)(本规划的公开版)、`making-this-repository-public.md`(公开前报告)。
**不保留**:两份工作文件(内容分别转入两份示例后删除)。
**新增**:`SECURITY.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`.github/ISSUE_TEMPLATE/`(表单 + `config.yml`)、`.github/workflows/checks.yml`、`.github/dependabot.yml`、`scripts/vendored.json`、`scripts/verify-dco.ts`。
**修改**:`THIRD_PARTY_NOTICES.md`、`scripts/ports.json`、`AGENTS.md`(pin 行)、`.github/release_template.md`、`form.md`(文件构成)、`questions.md` 与 `checklist.md`(回填)、`docs/releases/v0.3.0.md`(新增)。
**新增 Agent Note**:`.agents/dsh-spec/notes/implemented/process/` 下一篇公开决策,配 `.zh.md` 与 `.i18n.yaml`,过笔记门禁。

## 3. 拓扑与工作包

| 工作包 | 内容 | 写作用域 | 依赖 | 可由谁做 |
|---|---|---|---|---|
| `WP-1` | 表单套装整理与示例化(对应 `PR-1`) | `docs/open-source/**`(含报告移入该目录)、`.agents/dsh-spec/notes/implemented/process/**` | 编排定稿;`example-plan.md` 反映最终编排 | 独立执行者或维护者 |
| `WP-2a` | 策略文档:`SECURITY.md`、`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md` | 这三个文件 | 邮箱地址已定 | 独立执行者 |
| `WP-2b` | 基线与通知:`ports.json` ref/sha、submodule 检出、`AGENTS.md` pin 行、`THIRD_PARTY_NOTICES.md`、`.github/release_template.md`、`.github/ISSUE_TEMPLATE/**` | 这些文件与 submodule | 无 | 独立执行者或维护者 |
| `WP-3a` | 自动化入口:`.github/workflows/checks.yml`、`.github/dependabot.yml` | 这两个文件 | 与 `WP-3b` 先约定脚本名与调用方式 | 独立执行者 |
| `WP-3b` | 自动化脚本:`scripts/vendored.json`、`scripts/verify-dco.ts` | `scripts/**` | 无 | 独立执行者 |
| `WP-3c` | 表单回填:`questions.md` 的 Q-A2–Q-A8 与 `checklist.md` 的三条新任务 | 这两个文件 | `WP-3a/3b` 落定后 | 维护者 |
| `WP-V` | **只读验收者**:跑门禁、验链接、核对脱敏与文件归属 | 不写 | 每个工作包完成后 | 独立执行者(只读) |
| `WP-L` | 维护者保留:历史和平台操作、发布 | — | 见 §5 | 维护者 |

**串并行判断**

- `WP-2a` 与 `WP-2b`、`WP-3a` 与 `WP-3b` 写作用域不重叠 → 可并行。**但同一份 checkout 只能待在一个分支上**,所以并行开 PR 必须给每个工作包一个 worktree;否则就串行,每包一个分支、一个 PR。
- worktree 的 submodule 有两个坑:①`git worktree add` 不带 submodule,而 `verify-port-provenance` 要读 `submodules/dsh`;②**复制法在本环境实测不成立**——`cp -a` 与 `cp -al` 复制 `submodules/dsh`(397M、exit 0)后副本里**没有 `.git`**,符号链接同样不行,门禁都 exit 1(`… does not exist at ddefc45 …`),因为门禁要在子模块历史里解析每个移植文件的来源修订。**正确做法是既不克隆也不复制,而是给子模块开一个 linked worktree**:`git -C submodules/dsh worktree add --detach <外层 worktree>/submodules/dsh "$(git submodule status | awk '{print $1}')"` —— 实测 0.86 秒、对象共享、门禁 exit 0;收尾 `git -C submodules/dsh worktree remove --force <path>` 再删外层 worktree,残留用 `git -C submodules/dsh worktree prune`。
- `WP-1` 与 `WP-2/3` 互不阻塞;`example-plan.md` 以编排定稿为前提。
- `WP-V` 在每个包合并前跑一次;`WP-3c` 只能在 `WP-3a/3b` 之后。
- **T0–T2 全部合并之前不得进入 T3**(历史改写是最后的内容层操作)。

## 4. PR 职责安排

仓库生命周期规定:每个改动都是 PR;**agent 开 PR 并停在开 PR,合并是维护者的行为;发布同样需要授权**。

| PR | 覆盖 | 描述要点 | 评审与合并 |
|---|---|---|---|
| `PR-1` docs(open-source) | `WP-1` | 表单套装的用途与来源;两份示例的整理原则与脱敏边界;报告归档后的链接修正 | 维护者评审;合并需授权 |
| `PR-2` docs/chore(基线) | `WP-2a`、`WP-2b` | DCO 与 AI 披露口径;通知文件与基线对齐的证据(16 文件比对输出);release 模板新增区块 | 同上 |
| `PR-3` feat(自动化) | `WP-3a`、`WP-3b`、`WP-3c` | CI 最小权限设计;vendored 提交机制与 token scope;DCO 检查判据 | 同上;合并后把 `checks` 设为必需检查 |
| `PR-4` chore(release) | 发布 | 按模板写双语发布说明;列出相关 issue 与 PR | 与其它 PR 同一种 squash 合并;发布提交自带安装副本 |
| 历史操作 | T3 | 不产生 PR;`git bundle` 备份 + 一条说明改写原因的提交留痕 | 维护者本人执行 |

每个 PR 的描述按模板五节写,`Verification` 附真实命令与输出;`PR-3` 合并后,后续 PR 的验证改为附 CI 运行链接。

## 5. 阶段与条目(底层到上层)

### T0 内容定稿与示例化(`PR-1`)

> 为什么最底层:后面所有阶段引用的文件与决策都以这里为准。

| 条目 | 对应清单 | 动作 | 完成判据 |
|---|---|---|---|
| `T0-1` | 新增 | 把工作文件整理成 [`example-answers.md`](example-answers.md):改为「用本表单评估本仓库」的示例,去掉组织私有设置与账号状态 | 文件存在;`md-links` 过;无私有信息 |
| `T0-2` | 新增 | 在 `example-answers.md` 末尾加「交互问询样例」:维护者提问 → 建议 → 结论的问答表 | 有问、有建议、有结论 |
| `T0-3` | 新增 | 把工作文件整理成 [`example-plan.md`](example-plan.md):保留完整编排,去掉账号相关执行细节 | 文件存在;阶段/依赖/验收齐全 |
| `T0-4` | 新增 | 公开前报告移入 `docs/open-source/`,修相对链接(`AGENTS.md` → `../AGENTS.md`) | 移动后 `md-links` 过 |
| `T0-5` | 新增 | 更新 `form.md` 的文件构成:示例两份替换工作文件,归档报告入列 | 列表与目录一致 |
| `T0-6` | 新增 | 删除两份工作文件 | 两个文件不在工作树 |
| `T0-7` | 新增 | 新增公开决策的 Agent Note(双语 + 配对记录) | 笔记分类与格式门禁通过 |

### T1 仓库基线(`PR-2`)

> 为什么在自动化之前:CI 校验的就是这些文件与这个基线;先上 CI 再改基线,CI 要重跑一遍。

| 条目 | 对应清单 | 动作 | 完成判据 |
|---|---|---|---|
| `T1-1` | 新增 | **基线 bump**:`ports.json` 的 `baseline.ref`/`sha` 改为 `dsh-v0.1.7-rc.1`/`46a7f68b…`;submodule 检出到该 tag;`AGENTS.md` 与 `THIRD_PARTY_NOTICES.md` 的 pin 行同步 | 四处写法一致;`verify-port-provenance` 通过 |
| `T1-2` | 新增 | 记录 16 个移植文件与 rc.1 的比对结论(逐字节一致,无需重搬) | 结论进入 `PR-2` 描述与 Note |
| `T1-3` | `PRE-14` | `SECURITY.md`:支持范围、私有报告 + 公司邮箱、不承诺 SLA | 文件存在 |
| `T1-4` | `PRE-16`、`PRE-18`、`PRE-06` | `CONTRIBUTING.md`:门禁命令、评审与合并方式、双语规则、AI 披露、**DCO 要求(day0)**、安全报告路径 | 与 `verify-dco.ts` 口径一致 |
| `T1-5` | `PRE-17` | `CODE_OF_CONDUCT.md`:Contributor Covenant 2.1 英文 + 执行联系人与利益冲突段;不建配对 | 文件存在;无 `.zh.md` |
| `T1-6` | `PRE-17` | `.github/ISSUE_TEMPLATE/`:bug/feature 表单 + `config.yml` 指向私有通道 | 仓库页可见 |
| `T1-7` | 新增 | `.github/release_template.md`:在 `Full Changelog` 前增补「相关 issue 与 PR」区块,双语同步 | 两侧结构一致;配对门禁通过 |
| `T1-8` | `PRE-05` | `THIRD_PARTY_NOTICES.md` 基线行随 bump 改写(原 v0.1.6 陈旧问题一并消除) | 四处基线一致 |

### T2 自动化(`PR-3`)

> 为什么在历史之前:CI 的第一次运行要覆盖最终的文件真值;此后只改历史,不动内容。

| 条目 | 对应清单 | 动作 | 完成判据 |
|---|---|---|---|
| `T2-1` | 新增 | `.github/workflows/checks.yml`:`pull_request` + `push: [main]`;`permissions: {contents: read}`;`checkout` 开 `submodules: recursive`;node 24;跑测试、`check --all`、provenance、九个技能结构、DCO 检查、`md-links` | 首次运行全绿 |
| `T2-2` | 新增 | `.github/dependabot.yml`:`github-actions`,weekly | 两个 action 的 SHA 走 PR 更新 |
| `T2-3` | 新增 | `scripts/vendored.json` + 提交步骤:`push: [main]` 时提交依赖快照;落地前核实 token scope | 依赖图谱出现这些包并能出告警 |
| `T2-4` | 新增 | `scripts/verify-dco.ts`:PR 范围内每个提交带 `Signed-off-by` 且与作者一致 | 缺签名时检查失败 |
| `T2-5` | 新增 | 回填 `questions.md` 的 Q-A2–Q-A8 与 `checklist.md` 的三条新任务 | 表单与清单一致;任务编号无悬空 |

### T3 身份与历史(维护者执行)

> 为什么在平台之前:改写会换掉所有 SHA;之后任何提交都会留下旧身份的记录。

| 条目 | 对应清单 | 动作 | 完成判据 |
|---|---|---|---|
| `T3-1` | `PRE-07` | 账号侧开启 noreply 与「阻止命令行推送暴露邮箱」 | 设置生效 |
| `T3-2` | `PRE-13` | 删除旧版本的 GitHub release(正文已在 `docs/releases/` 存档) | release 列表为空 |
| `T3-3` | `PRE-08` | 备份 `main` 为本地分支并 `git bundle` 存档 → `git filter-repo` 改写 → 强推 `main` 与全部 tag | 邮箱只剩 noreply;tag 指向新 SHA |
| `T3-4` | `PRE-08` | 用存档的发布说明重建旧版本 release | 指向新 tag |
| `T3-5` | 新增 | 留痕:说明改写原因的提交(或 Note 修订)与校验输出 | 仓库内可查 |

### T4 公开与平台设置(维护者执行)

> 为什么在历史之后:`v*` 保护要打在稳定的 tag 上;`checks` 这个名字要已在 T2 存在。

| 条目 | 对应清单 | 动作 | 完成判据 |
|---|---|---|---|
| `T4-1` | `PRE-01`、`PRE-09`、`PRE-11`、`PRE-12` | 公开前核实:可见性权限、分支与 tag 最小面、PR 文本无敏感;组织开 2FA 强制;base permission `none` | 四项确认 |
| `T4-2` | `DAY-01` | 切换可见性;随后把可见性变更收窄为仅 owner | 仓库 public |
| `T4-3` | `DAY-02`、`DAY-03`、`DAY-04` | 确认 secret scanning;检查 push protection 档位;开 CodeQL default setup;开私有漏洞报告 | 四项在 Security 页可见 |
| `T4-4` | `DAY-06` | Actions:token 只读、取消建/审 PR、打开 SHA pinning、fork PR 审批设为所有外部贡献者 | 设置生效 |
| `T4-5` | `DAY-08` | Rulesets:`main` 要求 PR 与必需检查(`checks`)、阻止 force push;`v*` 限制创建/删除/更新;维护者设为 bypass actor | 直接推 main 被拒;PR 上出现必需检查 |
| `T4-6` | `DAY-11`、`DAY-12` | 确认 Projects/Wiki/Discussions 关、Issues 开;补五个 topics;确认 description | 仓库页显示正确 |
| `T4-7` | `DAY-10` | 开启 immutable releases | 设置生效 |
| `T4-8` | `DAY-13` | 匿名验证:raw 文件、`git clone --recurse-submodules`、README 命令、`gh skill install …@latest` | 四项匿名成功 |

### T5 发布 v0.3.0(`PR-4`)

> 为什么在公开之后:发布与公开同时可见,且 immutable 已开。

| 条目 | 对应清单 | 动作 | 完成判据 |
|---|---|---|---|
| `T5-1` | `P30-01` | 按模板写 `docs/releases/v0.3.0.md`:双语、分类、逐条署名 | 结构过配对门禁 |
| `T5-2` | 新增 | 发布 PR:描述按模板写,列出相关 issue 与 PR | PR 合并(发布提交) |
| `T5-3` | `DAY-10` | 打 `v0.3.0` tag,以该文档为正文创建 release | release 显示 immutable |
| `T5-4` | `DAY-14` | 公开公告:release 即公告 | 公告可见 |
| `T5-5` | 新增 | 发布后自检:干净环境 `gh skill install …@v0.3.0`;安装副本与发布副本一致 | 命令成功 |

### T6 公开后 30 天与长期

| 条目 | 对应清单 | 动作 | 完成判据 |
|---|---|---|---|
| `T6-1` | `P30-04` | 分诊外部输入,规则回写 `CONTRIBUTING.md` | 有分诊记录 |
| `T6-2` | `P30-07` | 噪声处理规则落地 | 写入文档 |
| `T6-3` | `P30-08` | 走一遍「私密报告 → 修复 → advisory(仅两条边界)」 | 演练留档 |
| `T6-4` | `P30-06` | OpenSSF Scorecard(可选) | 报告可查 |
| `T6-5` | `LONG-03` | 台账复核 + **每次 dsh 发布跟一次基线**(§6) | 复核记录 |
| `T6-6` | `LONG-05` | 维护者交接(条件触发) | `CODEOWNERS` 与 org 角色就位 |

## 6. 基线跟进(每次 dsh 发布都跟)

固定动作,五步:

1. 取新 tag,`--depth 1 --branch <tag>` 克隆到临时目录;
2. 对 16 个移植文件逐个 `cmp` 与 `submodules/dsh` 比对;
3. 有变化就重搬并更新 `ports.json` 的逐文件 `sha` 与 `relation`;无变化则记录"逐字节一致";
4. 改四处 pin:`ports.json` 的 `baseline`、submodule 检出、`AGENTS.md`、`THIRD_PARTY_NOTICES.md`;
5. 跑 `verify-port-provenance` 与全量门禁,写一条 release note。

**本次**:pin 从 `dsh-v0.1.7-alpha.2` bump 到 `dsh-v0.1.7-rc.1`(tag `46a7f68b…`);16 个移植文件已核对**逐字节一致**,无需重搬;范式文件(根 `AGENTS.md`、`CONTRIBUTING.md`、`.agents/notes/README.md`、`docs/AGENTS.md`)也一致。

## 7. 发布准备(v0.3.0)

- 版本号 `v0.3.0`;发布说明文档放 `docs/releases/v0.3.0.md`,按 `.github/release_template.md` 的形态写(双语文档、类别标题、逐条署名、末尾 `Full Changelog`);
- **release 模板新增「相关 issue 与 PR」区块**,与 `Full Changelog` 并列,让读者能直接点进详情;
- 发布 PR 与其它 PR 同一种 squash 合并;**发布提交自带它发布的安装副本**;
- 发布在 T4 之后:此时 immutable releases 已开启,tag 与 asset 不可改;
- 发布后自检安装路径与副本一致性,并确认 `v*` 规则集生效。

## 8. 明确不做

| 不做 | 原因 |
|---|---|
| 换 Apache-2.0 | 上游与全部 vendored 包都是 MIT;NOTICE 与修改标注对"抽取 + 重对账"是纯成本,且无专利面 |
| 加 `package.json` 换 Dependabot | 破掉"零依赖、无 package.json"的身份;告警改由依赖提交取得 |
| vendored 定时提交 | 图谱持久,新 advisory 自行重算;公开仓库定时 workflow 停活 60 天后被禁用 |
| 独立 `ROADMAP.md` | 承诺型文档与"尽力而为"的容量预期冲突;需要时用 milestones |
| CoC 双语配对 | 配对约定要求两侧同等权威,与"以官方英文原文为准"冲突 |
| 把门禁可绕过写成 advisory | 那是缺陷而非采用者安全事件,走 release notes |
| 抽取 `dsh-client-ui-ux` | dsh 客户端专属(自有 token、ui-primitives、平台适配),违背本包"与生态无关"的宗旨 |
| 跟进 agent-teams 笔记 | 它是功能实现决策记录,不是使用指南;上游 `agent-experience` 技能未变 |
| 安装 Auto review | 实验性、非默认层;人工审批闸门已在 |
| homepage / Wiki / Discussions | 空房间,且与受门禁管理的仓库文档重复 |
| submodule 自动升级 | 设计是"钉住 + 人工重抽取";跟发布走 §6 的固定动作 |

## 9. 验收门槛

| 阶段 | 门槛(执行并留输出) |
|---|---|
| T0 | 六个文档 `md-links` 通过;两份示例无私有信息;笔记门禁通过 |
| T1 | 四处 pin 一致;`verify-port-provenance` 通过;五份文件存在;release 模板两侧结构一致 |
| T2 | CI 首次全绿:`node --test 'tests/**/*.test.ts'`(130 通过 0 失败)、`check --all`、`verify-port-provenance`、九个技能结构、DCO 检查、`md-links`;依赖图谱出现 vendored 包 |
| T3 | `git log --format='%ae\|%ce' \| sort -u` 只剩 noreply;`git ls-remote` tag 指向新 SHA;旧版本 release 指向新 tag |
| T4 | 匿名 `curl`/`clone` 成功;ruleset 生效;topics 可见;secret scanning 无告警 |
| T5 | `v0.3.0` immutable;干净环境 `gh skill install …@v0.3.0` 成功 |
| T6 | 分诊与演练留档;台账与基线复核记录在案 |

## 10. 风险与回滚

| 风险 | 处理 |
|---|---|
| 邮箱改写不可逆 | 改写前备份分支 + `git bundle`;改写后先本地校验再强推 |
| tag/release 重建出错 | 私有阶段无人消费;失败从 bundle 恢复或删除 release 重建 |
| 切换可见性不可撤回 | 确认 T4-1 四项后再执行;fork 即刻开放、push rulesets 被禁用、stars/watchers 清零 |
| CI 成为攻击面 | 只读 token、action 钉 SHA、不用 `pull_request_target`、必需检查不加 path 过滤 |
| CI 拉不到 tag 形式的 submodule | `checkout` 开 `submodules: recursive`;worktree 里同样要初始化 submodule |
| DCO 检查误伤(agent 代签) | 只认提交者本人签名;文档明确 agent 不得代签 |
| vendored token scope 未知 | 落地前查 action 文档再写死权限 |
| 平台规则随窗口变化 | `T6-5` 台账兜底;2026-11-02 的触发默认值变化已在设计上避开 |

## 11. 规模

仓库内:新增 4 份文档、2 个 workflow、2 个脚本、1 份发布说明、1 篇配对 Note;修改 8 处;移动 1 处;删除 2 处。平台:组织、安全、Actions/rulesets 三组设置、1 次可见性切换、1 次发布。按半天粒度:T0–T2 各 1–2 个半天(并行时压到 1),T3 半个半天(含备份),T4 半个半天,T5 半个半天,T6 是日历事件。
