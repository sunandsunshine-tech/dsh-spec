# 填表结果示例:用本表单评估本仓库

对 [`questions.md`](questions.md) 的逐题作答,取证日期 2026-09-23;字段含义与字段契约见 [`form.md`](form.md),任务正文见 [`checklist.md`](checklist.md),决定与阶段见 [`example-plan.md`](example-plan.md)。

三种性质:

- **实测** — 答案直接来自仓库现状,附证据。
- **建议** — 答案是一个低风险的推荐值。
- **待确认** — 涉及法律、署名、资金或未来投入,答案先给建议与代价,选择留给维护者。

## 一、答案总表

| 题 | 选择 | 性质 | 触发 |
|---|---|---|---|
| Q-F1 仓库归谁所有 | **组织** | 实测 | `PRE-01` |
| Q-F2 当前状态 | **从未公开**(取证时) | 实测 | `PRE-10`、`PRE-20` |
| Q-F3 几个人能合并能发布 | **只有我一人** | 实测 | `PRE-14`、`P30-08`、`LONG-05` |
| Q-F4 公众通过什么拿到 | **通过 git 或 gh 安装的技能仓库**(不发布到注册中心) | 实测 | `DAY-08`、`DAY-10` |
| Q-F5 有没有 workflow | **没有** | 实测 | `DAY-06`(经 Q-A1) |
| Q-F6 第三方或派生内容 | **vendored 依赖 + 抽取或派生自其他项目 + git submodule** | 实测 | `PRE-05`、`PRE-20` |
| Q-F7 有没有 release 或 tag | **有**(取证时 `v0.1.0`、`v0.2.0`) | 实测 | `DAY-10`、`P30-01` |
| Q-F8 文档语言 | **双语配对**(README 与 Agent Note 都已配对) | 实测 | `PRE-22` |
| Q-F9 历史协作面 | **仅本人提交**(全部 PR 同一作者) | 实测 | `PRE-08` |
| Q-F10 是否含敏感材料 | **否**(两次扫描 0 命中) | 实测 | `PRE-10` |
| Q-L1 许可证 | **MIT**(已存在) | 实测 | `PRE-02` |
| Q-L2 逐文件标注 | **SPDX 标识符**(16 个移植文件已带) | 建议 | `PRE-04` |
| Q-L3 第三方声明 | **清单加生成器**(`THIRD_PARTY_NOTICES.md` 已有重生成命令) | 实测 | `PRE-05` |
| Q-L4 入站权利 | **DCO 从 day0 生效**(写进 `CONTRIBUTING.md`;`scripts/verify-dco.ts` 检查;agent 不得代签) | 建议 | `PRE-06` |
| Q-L5 relicensing 弹性 | **不留余地** | 建议 | 无 |
| Q-P1 版权署名主体 | **公司法定全名 + 品牌括注**(维持现状) | 待确认 | `PRE-02` |
| Q-P2 提交作者邮箱 | **改写历史并改用 noreply** | 待确认 | `PRE-07`、`PRE-08` |
| Q-P3 账号加固 | **组织强制 2FA** | 建议 | `PRE-09` |
| Q-P4 可见性变更权限 | **仅组织 owner 可改** | 建议 | `PRE-01` |
| Q-H1 历史怎么发布 | **完整历史**(已扫描干净) | 建议 | `PRE-10`、`PRE-20` |
| Q-H2 分支与 tag | **只留主分支与发布 tag**(取证时已达成) | 实测 | `PRE-11`、`DAY-08` |
| Q-H3 历史 PR 与 issue | **原样公开**(PR 文本已扫描) | 建议 | `PRE-12` |
| Q-H4 Actions 历史与日志 | **不适用**(Q-F5=没有) | — | — |
| Q-S1 secret scanning | **依赖公开仓库默认** | 实测 | `DAY-02` |
| Q-S2 push protection | **依赖账号级默认,并检查仓库级是否可用** | 建议 | `DAY-02` |
| Q-S3 额外密钥检测 | **trufflehog 做公开前一次性历史与活体验证** | 建议 | `PRE-10` |
| Q-S4 code scanning | **CodeQL default setup** | 建议 | `DAY-03` |
| Q-S5 依赖与供应链告警 | **都不开**(无 manifest,无可分析对象) | 实测 | 无 |
| Q-S6 私有漏洞报告 | **开启** | 建议 | `DAY-04` |
| Q-S7 SECURITY.md | **基本版**(支持范围 + 报告渠道,不承诺 SLA) | 建议 | `PRE-14` |
| Q-A1 启用 Actions 吗 | **启用但受限**(保留将来加 CI 的能力,先收紧默认值) | 建议 | `DAY-06` |
| Q-A2 fork PR 审批 | 不适用(Q-F5=没有) | — | — |
| Q-A3 GITHUB_TOKEN 权限 | 不适用(Q-F5=没有) | — | — |
| Q-A4 action 版本策略 | 不适用(Q-F5=没有) | — | — |
| Q-A5 workflow 静态检查 | 不适用(Q-F5=没有) | — | — |
| Q-A6 触发事件 | 不适用(Q-F5=没有) | — | — |
| Q-A7 cache 策略 | 不适用(Q-F5=没有) | — | — |
| Q-A8 CI 测试范围 | 不适用(Q-F5=没有) | — | — |
| Q-A9 发布凭据 | 不适用(Q-F4 无注册中心发布) | — | — |
| Q-R1 主分支保护 | **Ruleset**(公开后 403 消失) | 建议 | `DAY-08` |
| Q-R2 评审与必需检查 | **评审加必需状态检查**,维护者设为 bypass actor | 建议 | `DAY-08` |
| Q-R3 合并方式 | **Squash**(已配置,rebase 与 merge commit 已关) | 实测 | `DAY-09` |
| Q-R4 签名提交 | **不要求**(用 release 完整性代替) | 建议 | 无 |
| Q-R5 发布完整性 | **Immutable releases**(不做 attestation,无构建产物) | 建议 | `DAY-10` |
| Q-R6 变更记录 | **GitHub Releases + 仓库内发布说明**(取证时 `docs/releases/` 与 `.github/release_template.md` 已有) | 实测 | `P30-01` |
| Q-C1 README 深度 | **含前置条件、命令与失败形态**(现状已达标,来源与许可另见通知文件) | 实测 | `PRE-15` |
| Q-C2 CONTRIBUTING | **详细版**(门禁命令、评审方式、AI 披露) | 建议 | `PRE-16` |
| Q-C3 行为准则 | **Contributor Covenant 2.1 英文原文,单语不配对**(中文只给指针) | 待确认 | `PRE-17` |
| Q-C4 issue 模板 | **Issue forms 加 config.yml**(把安全报告引到私有通道) | 建议 | `PRE-17` |
| Q-C5 可选元数据 | **都不采用**(单人维护,CODEOWNERS/GOVERNANCE 留到招募时) | 实测 | 无 |
| Q-C6 可发现性 | **description 已有;补 topics**;homepage 不加 | 实测 | `DAY-12` |
| Q-C7 协作功能 | **Issues 开、Wiki 关、Discussions 关、Projects 关** | 建议 | `DAY-11` |
| Q-I1 agent 说明文件 | **AGENTS.md**(根与子树已有) | 实测 | 无 |
| Q-I2 AI 贡献政策 | **允许并披露** | 建议 | `PRE-18` |
| Q-I3 披露机制 | **Assisted-by trailer**(历史提交已在用,补写进政策) | 实测 | `PRE-18` |
| Q-I4 自主 agent PR | **要求事先获批** | 建议 | `PRE-18` |
| Q-I5 品牌匿名化 | **不要求**(现在写的是上游 harness 名,不是模型品牌) | 建议 | 无 |
| Q-G1 维护者容量与预期 | **只有我,尽力而为**(不写 SLA) | 待确认 | `PRE-14` |
| Q-G2 资助渠道 | **不开** | 实测 | 无 |
| Q-G3 漏洞数据公开 | **修复后发布 advisory** | 建议 | `P30-08` |
| Q-G4 AI slop 处理 | **政策写明加人工** | 建议 | `P30-07` |
| Q-G5 长期状态 | **保持活跃** | 待确认 | 无 |

## 二、需要维护者拍板的五件事

除下列五件外,上表其余答案为低风险默认值;这五件有外部后果,公开后再改代价更高。

1. **版权署名(Q-P1)与许可(Q-L1)** — 现状是 MIT,版权方写公司法定全名。保留它是把本仓库作为公司开源项目的最自然读法;改成品牌名或个人署名要在公开前改 `LICENSE` 第一行,公开后要动每一份副本与 fork。建议保留公司名 + 品牌括注,或改成与组织名一致的品牌署名。
2. **提交邮箱(Q-P2)** — 历史提交的作者侧是一个个人邮箱,committer 侧部分已是 `noreply@github.com`。取证时没有 fork、没有外部 clone、没有不可变 release;改写会改变全部提交 SHA,已关闭 PR 的引用与签名会失效。接受公开也是成立的答案。建议改写。
3. **行为准则(Q-C3)** — Contributor Covenant 是社区默认文本,样本里 11/14 有;上游 `deepseek-ai/deepseek-harness` 没有,OSPS Baseline 也不要求。单人维护时它的实际作用是出事时有依据。建议采用官方英文原文;配中文版与不配都成立。
4. **维护者容量与长期状态(Q-G1、Q-G5)** — 这是预期题:现在只有一名维护者,没有资助渠道。建议公开时只承诺「尽力而为」,不写 SLA;30 天后按实际报告量再决定是否招募。G5 保持活跃。
5. **P30-08 的漏洞响应** — 若开启私有漏洞报告并写 SECURITY.md,就等于承诺有人看。建议在公开后 30 天内走一遍「私密报告 → 修复 → 发布 advisory」的流程,再定对外的响应口径。

## 三、被跳过的题

条件不成立,不需要回答,也不产生任务:

| 题 | 为什么不适用 |
|---|---|
| Q-H4 Actions 历史与日志 | Q-F5=没有 workflow,也没有任何运行记录 |
| Q-A2 – Q-A8 | 没有 workflow,审批、token 权限、SHA pinning、静态检查、触发事件、cache、CI 测试都无处施加 |
| Q-A9 发布凭据 | Q-F4 不含注册中心发布,没有发布凭据可管 |

Q-A1 的适用是「任意」,所以即使没有 workflow 也要回答:Actions 已启用,默认值不是最严的一档,它仍需收紧或禁用。

## 四、本仓库的任务清单

各条按触发顺序排列,落点为本仓库的具体文件或设置。

### PRE 公开前

- [ ] **PRE-01 可见性权限与组织策略** — 落点:Organization → Settings → Access → Member privileges,把可见性变更收窄为仅 owner
- [ ] **PRE-02 许可与署名** — `LICENSE` 已存在且为 MIT;只在改署名主体时改第一行(见第二节第 1 条)
- [ ] **PRE-04 逐文件许可标注** — 16 个移植文件已带 `SPDX-License-Identifier`;落点:确认 `scripts/ports.json` 的 16 条与文件头一一对应(`node scripts/verify-port-provenance.ts` 已通过)
- [ ] **PRE-05 第三方通知对齐** — **本仓库唯一的实质缺陷**:`THIRD_PARTY_NOTICES.md` 第 7 行取证时写 `dsh-v0.1.6-alpha.2`,而 `AGENTS.md`、`scripts/ports.json`、`docs/releases/v0.2.0.md` 与 submodule 都是 `dsh-v0.1.7-alpha.2`;该行随基线 bump 改写为 `pinned at \`dsh-v0.1.7-rc.1\``(见 [`example-plan.md`](example-plan.md) §1、§6)
- [ ] **PRE-06 入站权利** — DCO 从 day0 生效:在 `CONTRIBUTING.md` 写 `Signed-off-by` 要求,`scripts/verify-dco.ts` 检查 PR 范围内每个提交的签名与作者一致;agent 不得代签(见 [`example-plan.md`](example-plan.md) §1)
- [ ] **PRE-07 提交邮箱设置** — 落点:<https://github.com/settings/emails> 勾选 Keep my email addresses private 与 Block command line pushes that expose my email
- [ ] **PRE-08 改写历史** — 备份 `main` → `git filter-repo` 改写作者与 committer → 强推 `main` 与全部 tag;改写后全部提交 SHA 变化,已关闭 PR 的引用与签名失效
- [ ] **PRE-09 组织强制 2FA** — 落点:Organization → Settings → Authentication security,打开 two-factor requirement
- [ ] **PRE-10 公开前最后一次密钥复核** — 已完成:工作树 + `main` + 全部 tag + 已抓取的 PR 分支引用 + PR 文本,凭证形状 0 命中;trufflehog 做一次活体验证
- [ ] **PRE-11 分支与 tag 核实** — 取证时已是最小面:`main` + `v0.1.0`/`v0.2.0`;`release/v0.2.0` 已删除
- [ ] **PRE-12 PR 文本核实** — 已完成:全部 PR 的正文、评论与 review 无凭据、无内部链接
- [ ] **PRE-14 新增 `SECURITY.md`** — 基本版:支持范围 `v0.2.x`、报告渠道指向私有漏洞报告、不承诺 SLA
- [ ] **PRE-15 README** — 现状已含前置条件、安装、技能表与边界;公开前的补充是 topics 与链接自检
- [ ] **PRE-16 新增 `CONTRIBUTING.md`** — 详细版:门禁命令(`node --test 'tests/**/*.test.ts'`、`dsh-spec.ts check --all`)、评审方式、双语配对规则、AI 披露规则
- [ ] **PRE-17 行为准则与 issue 模板** — `CODE_OF_CONDUCT.md`(Contributor Covenant 2.1 英文原文,不建配对)与 `.github/ISSUE_TEMPLATE/`(forms + `config.yml`,把安全报告引到私有通道)
- [ ] **PRE-18 AI 政策落地** — 把「允许并披露、`Assisted-by:`、自主 agent 的 PR 需事先获批」写进 `CONTRIBUTING.md`;`AGENTS.md` 已存在
- [ ] **PRE-20 冷启动自测** — 临时目录 `git clone --recurse-submodules`,按 README 跑一遍;submodule 基线按 tag 克隆(`git clone --depth 1 --branch dsh-v0.1.7-rc.1 …`;取证时为 `dsh-v0.1.7-alpha.2`)
- [ ] **PRE-22 双语机制** — 已有 `README.i18n.yaml` 与配对门禁;写进 `CONTRIBUTING.md`

### DAY 公开当天

- [ ] **DAY-01 切换可见性** — `gh repo edit --visibility public --accept-visibility-change-consequences`
- [ ] **DAY-02 secret scanning 与 push protection** — 确认平台扫描已运行;检查仓库级 push protection 是否可用,不可用则依赖账号级默认
- [ ] **DAY-03 CodeQL default setup** — Settings → Security and quality → Advanced Security → CodeQL analysis → Set up → Default(仓库是 JS/TS,可分析 `.ts`)
- [ ] **DAY-04 私有漏洞报告** — 同区块 → Private vulnerability reporting → Enable
- [ ] **DAY-06 收紧 Actions** — 落点:Settings → Actions → General:改为只允许选定 action、打开 SHA pinning、token 只读、取消允许 Actions 建/审 PR;近期不加 CI 时禁用 Actions
- [ ] **DAY-08 Rulesets** — 公开后 403 消失;`main` 上要求 PR、必需检查、阻止 force push;`v*` 上限制创建/删除/更新;维护者设为 bypass actor
- [ ] **DAY-09 合并方式核实** — 已配置 squash 与合并后自动删除头分支
- [ ] **DAY-10 发布完整性** — Settings → General → Releases → Enable immutable releases(对已发布的 `v0.2.0` 不追溯)
- [ ] **DAY-11 协作功能** — Wiki 与 Discussions 已关;`Projects` 取证时为开,关闭
- [ ] **DAY-12 可发现性** — description 已有;补 topics(`ai-agents`、`agent-skills`、`developer-tools`、`code-review`、`documentation`)
- [ ] **DAY-13 匿名验证** — 登出浏览器读 README;匿名 `curl` 一个 raw 文件;匿名 `git clone --recurse-submodules`;跑一次 README 的 `gh skill install …@latest`

### P30 公开后 30 天内

- [ ] **P30-01 变更记录** — 取证时已有 `docs/releases/v0.2.0.md` 与 `.github/release_template.md`;发布说明随每次发布按模板更新
- [ ] **P30-04 分诊外部输入** — 观察 secret scanning 告警、fork PR 与 issue;把反复出现的规则补进 CONTRIBUTING
- [ ] **P30-07 噪声处理规则** — 按 Q-G4 把关闭依据写进 CONTRIBUTING
- [ ] **P30-08 漏洞响应演练** — 走一遍私密报告到 advisory 的流程
- [ ] **P30-02 / P30-06(可选)** — 公开后的第一个正式版本补完整说明;接入 OpenSSF Scorecard

### LONG 长期

- [ ] **LONG-03 复核来源台账** — 按 [`sources.md`](sources.md) 的台账,2026-12-23 复核平台规则,2027-03-23 复核社区共识;`S53` 的强制日为 2026-11-02
- [ ] **LONG-05 维护者交接** — 若 Q-G1 改为招募,再加 `CODEOWNERS` 与 `GOVERNANCE.md`,并分配 org 角色

未触发的任务:`PRE-03`(非 Apache-2.0)、`PRE-13`(无 Actions 运行)、`PRE-19`(走完整历史)、`PRE-21`/`P30-05`(无注册中心发布)、`DAY-05`(无 manifest)、`DAY-07`(无 workflow)、`P30-03`(未选可选元数据)、`LONG-01`/`LONG-02`/`LONG-04`(当前不适用)。

## 五、证据

取证对象是仓库自身:文件、git 历史与门禁输出。账号状态——组织计划、可见性开关、协作者与账号安全设置——不在取证范围内。

## 六、若加 CI,Q-A2 – Q-A8 的建议值

本仓库有 130 个测试与六道门禁。Q-A2–Q-A8 的建议值:

| 题 | 建议值 | 理由 |
|---|---|---|
| Q-A2 fork PR 审批 | 所有外部贡献者 | 公开仓库默认只拦首次贡献者;噪声式 PR 本身是攻击手法 |
| Q-A3 GITHUB_TOKEN | 只读 | workflow 级 `permissions: {}`,逐 job 提权 |
| Q-A4 action 版本 | 全部钉 commit SHA | 配合 Dependabot 产出新 SHA 的 PR |
| Q-A5 静态检查 | zizmor(pedantic 阻塞)+ actionlint | Packagist 公开过同类配置 |
| Q-A6 触发事件 | 禁用 `pull_request_target` | 平台 2026-11-02 起对 public 仓库默认禁用 |
| Q-A7 cache | 低信任事件只读;发布 job 设 `none` | cache 投毒是 TanStack 事件的关键一步 |
| Q-A8 CI 测试 | 单一套件:`node --test 'tests/**/*.test.ts'` | 满足 OSPS Level 2 的最低要求 |

## 七、交互问询样例

「作答:决定」与「作答:预期」的题由维护者选定。下表是这类问询的样例,结论对应 [`example-plan.md`](example-plan.md) §1 决策台账、§5 条目与 §8 明确不做。

| 维护者提问 | 建议 | 结论 |
|---|---|---|
| 版权署名主体写公司法定全名,还是改品牌或个人署名? | 保留公司法定全名 + 品牌括注,或改成与组织名一致的品牌署名;改动只在 `LICENSE` 第一行,公开后要动每一份副本与 fork | 维持现状:公司法定全名 + 品牌括注(`example-plan.md` §1 版权行) |
| 提交作者邮箱随历史公开,接受还是改写? | 接受,或改写为 GitHub noreply;改写换掉全部提交 SHA,已关闭 PR 的引用与签名失效;取证时没有 fork、没有外部 clone、没有不可变 release | 改用 noreply 并改写历史(`example-plan.md` §1 提交邮箱) |
| 单人维护的仓库采用行为准则吗?是否配中文版? | 采用 Contributor Covenant 2.1;中文版与官方英文原文能否并存,取决于两侧是否同等权威 | Contributor Covenant 2.1 英文原文,单语不配对;中文只给指针(`example-plan.md` §1 CoC) |
| 对外承诺多少维护投入? | 「尽力而为」,不写 SLA;招募 `CODEOWNERS` 与 org 角色按 30 天后的实际报告量 | 尽力而为、不写 SLA;维护者交接条件触发(`example-plan.md` §5 `T6-6`) |
| 私有漏洞报告与 SECURITY.md 等于承诺有人看,对外响应口径怎么定? | 先演练一次私密报告到 advisory 的流程,再定对外响应口径 | 按 `T6-3` 走一遍私密报告到 advisory 的流程;advisory 只覆盖两条边界(`example-plan.md` §1、§5) |
