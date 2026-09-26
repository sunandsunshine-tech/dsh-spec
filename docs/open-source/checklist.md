# 开源仓库任务清单

本表是 [`questions.md`](questions.md) 的输出侧:题库里每个选项右端的 `→` 编号在这里有唯一一条任务描述;用法、agent 钩子与字段契约见 [`form.md`](form.md)。四段按时间排列,**PRE** 在切换可见性之前完成,**DAY** 是公开当天,**P30** 是公开后 30 天内,**LONG** 是长期事项。

没有在表单里被触发的编号直接跳过。每条给出触发选项、GitHub 界面位置或命令、以及依据来源编号(见 [`sources.md`](sources.md))。

## PRE 公开前

- [ ] **PRE-01 确认谁能改可见性、组织是否允许公开仓库** — 触发:Q-F1 任一、Q-P4 任一 — 位置:Organization → Settings → Access → **Member privileges** → Repository visibility change;以及 Organization → Settings → Repository → Repository creation — 依据 [S02][S45][S03]
- [ ] **PRE-02 选定许可并写入 LICENSE** — 触发:Q-L1 任一、Q-P1 任一 — 动作:在仓库根写 `LICENSE`,第一行为版权署名主体;GitHub 通过 SPDX 识别,识别不到会显示为无许可 — 依据 [S63][S68][S70]
- [ ] **PRE-03 许可为 Apache-2.0 时补 NOTICE** — 触发:Q-L1=Apache-2.0、Q-L3=NOTICE — 动作:新增 `NOTICE` 保留归属声明,并在修改过的第三方文件上标注 — 依据 [S70]
- [ ] **PRE-04 逐文件许可标注** — 触发:Q-L2=SPDX 或 REUSE — 动作:文件头加 `SPDX-License-Identifier`;选 REUSE 时补 `LICENSES/` 与检查工具 — 依据 [S66][S63]
- [ ] **PRE-05 生成或更新第三方通知** — 触发:Q-L3=清单或生成器、Q-F6 含 vendored/派生/submodule — 动作:列出每个包的名称、版本、许可全文与出处;抽取类项目另写明上游路径与偏离方式 — 依据 [S70][S61][S66]
- [ ] **PRE-06 配置入站权利机制** — 触发:Q-L4=DCO/CLA、Q-L5=保留 — 动作:DCO 加 `Signed-off-by` 检查与说明;CLA 接入签署流程并在 CONTRIBUTING 说明 — 依据 [S63][S88]
- [ ] **PRE-07 配置提交邮箱隐私** — 触发:Q-P2 任一非「保留现状」 — 位置:<https://github.com/settings/emails> 勾选 Keep my email addresses private 与 Block command line pushes that expose my email — 依据 [S26][S91]
- [ ] **PRE-08 改写历史中的作者与 committer** — 触发:Q-P2=改写全部历史、Q-F9 允许 — 动作:备份 `main` 为本地分支 → `git filter-repo` 改写邮箱 → 强推 `main` 与两个 tag;改写后所有 SHA 变化,已关闭 PR 引用失效 — 依据 [S23][S26]
- [ ] **PRE-09 开启组织级 2FA 要求** — 触发:Q-P3=组织强制 2FA — 位置:Organization → Settings → Authentication security — 依据 [S63][S35]
- [ ] **PRE-10 敏感材料扫描与处置** — 触发:Q-F10 任一、Q-S3 任一、Q-H1 任一 — 动作:对工作树与全历史(含 `refs/pull/*`)跑密钥形状扫描;发现命中先轮换凭据再决定是否重写历史;PR/issue 文本一并扫 — 依据 [S07][S23][S43][S73]
- [ ] **PRE-11 清理分支与 tag** — 触发:Q-H2 任一带清理的选项 — 动作:删除未维护分支与临时 tag,只留主分支、发布分支与发布 tag — 依据 [S72][S44]
- [ ] **PRE-12 处置历史 PR 与 issue 中的敏感内容** — 触发:Q-H3 任一非「原样公开」 — 动作:编辑或删除含凭据、内部链接、客户信息的评论;需要时把讨论迁到私有仓库 — 依据 [S07][S43][S87]
- [ ] **PRE-13 删除不再需要的 Actions 运行与 artifact** — 触发:Q-H4=先删除 — 位置:Actions → 选择 run → Delete run;artifact 单独删除 — 依据 [S01][S47]
- [ ] **PRE-14 写 SECURITY.md** — 触发:Q-S7 任一非「不写」、Q-G1 任一 — 动作:写明支持版本范围、报告渠道(可指向私有漏洞报告)、响应预期 — 依据 [S20][S63][S67]
- [ ] **PRE-15 写 README** — 触发:Q-C1 任一、Q-F8 确定语言 — 动作:用途、前置条件、安装、最小示例、限制;抽取类项目写明来源与许可 — 依据 [S20][S87]
- [ ] **PRE-16 写 CONTRIBUTING** — 触发:Q-C2 任一非「不写」 — 动作:开发环境、测试命令、PR 期望、评审方式;不接受公开贡献时在 README 明说 — 依据 [S20][S87][S79]
- [ ] **PRE-17 补行为准则与 issue 模板** — 触发:Q-C3 任一非「不采用」、Q-C4 任一非「不加」 — 动作:`CODE_OF_CONDUCT.md`;`.github/ISSUE_TEMPLATE/` 下的 md 模板需含 `name:`/`about:`,forms 需含 `name:`/`description:`,必要时加 `config.yml` — 依据 [S20][S22][S92]
- [ ] **PRE-18 写 AI 政策、agent 说明文件与披露机制** — 触发:Q-I1/Q-I2/Q-I3/Q-I4/Q-I5 任一非「不做」 — 动作:政策落进 `CONTRIBUTING.md` 或独立文件;说明文件放 `AGENTS.md` / `CLAUDE.md` / `.github/copilot-instructions.md`;披露用 `Assisted-by:` trailer 或在 PR 模板设问 — 依据 [S74][S75][S76][S77][S78][S79]
- [ ] **PRE-19 走快照方案** — 触发:Q-H1=快照或新建仓库 — 动作:取当前树快照到新仓库或新历史,复核无凭据与 PII,重新创建 tag 与 release;原仓库保持私有 — 依据 [S86][S87]
- [ ] **PRE-20 冷启动自测** — 触发:通用 — 动作:在临时目录 `git clone --recurse-submodules`,按 README 逐条执行;确认 submodule 指向的仓库可匿名访问 — 依据 [S87][S05]
- [ ] **PRE-21 发布凭据迁移准备** — 触发:Q-F4 含注册中心发布(npm/PyPI/Maven/crates.io/GHCR)、Q-A9 任一 — 动作:在注册中心配置 OIDC/trusted publishing,移除仓库 secret 中的长期 token,确认发布 job 与构建 job 隔离 — 依据 [S59][S60][S51][S83]
- [ ] **PRE-22 确定语言与翻译流程** — 触发:Q-F8 任一 — 动作:选定主语言;双语时建立两侧同步机制(配对记录或结构检查),并在 CONTRIBUTING 说明 — 依据 [S20][S77]

## DAY 公开当天

- [ ] **DAY-01 切换可见性** — 触发:通用 — 位置:Settings → General → Danger Zone → Change visibility;或 `gh repo edit --visibility public --accept-visibility-change-consequences`;或 `PATCH /repos/{owner}/{repo}` 带 `private: false` — 依据 [S01][S03][S40]
- [ ] **DAY-02 确认 secret scanning 与 push protection 状态** — 触发:Q-S1、Q-S2 — 位置:Settings → Security and quality → Advanced Security;确认扫描已运行,按可用档位开启 push protection — 依据 [S06][S07][S08][S42]
- [ ] **DAY-03 启用 code scanning** — 触发:Q-S4 任一非「不启用」 — 位置:Settings → Security and quality → Advanced Security → CodeQL analysis → Set up → Default(或 advanced) — 依据 [S09][S10][S49]
- [ ] **DAY-04 启用私有漏洞报告** — 触发:Q-S6=开启 — 位置:同上区块 → Private vulnerability reporting → Enable — 依据 [S11][S12]
- [ ] **DAY-05 配置依赖与供应链告警** — 触发:Q-S5 任一 — 位置:Settings → Security and quality;Dependabot alerts / security updates / version updates(默认 3 天 cooldown)/ 恶意包告警;需要时加 dependency review Action 到 PR 检查 — 依据 [S31][S32][S33][S51][S62]
- [ ] **DAY-06 收紧 Actions 权限与审批** — 触发:Q-A1、Q-A2、Q-A3 — 位置:Settings → Actions → General:Fork pull request workflows 审批档位;Workflow permissions 设为只读;取消 Allow GitHub Actions to create and approve pull requests;不使用时直接禁用 Actions — 依据 [S18][S19][S63]
- [ ] **DAY-07 加固 workflow 本身** — 触发:Q-A4、Q-A5、Q-A6、Q-A7 — 位置:各 workflow 文件;第三方 action 钉全长 SHA;接入 actionlint 或 zizmor;禁用或白名单 `pull_request_target`;按 job 设 `permissions: {}`;对低信任事件与发布 job 设 `cache-mode` — 依据 [S58][S71][S72][S52][S53][S54]
- [ ] **DAY-08 建立主分支与 tag 规则** — 触发:Q-R1、Q-R2、Q-R4、Q-H2 保留分支加规则 — 位置:Settings → Rules → Rulesets:main 上要求 PR、必需检查、阻止 force push、可选线性历史与签名提交;`v*` tag 限制创建/删除/更新 — 依据 [S15][S16][S17][S44]
- [ ] **DAY-09 设定合并方式** — 触发:Q-R3 — 位置:Settings → General → Pull Requests;按选择开关 squash/merge/rebase,并保持 Automatically delete head branches — 依据 [S48]
- [ ] **DAY-10 开启发布完整性** — 触发:Q-R5、Q-F4、Q-F7 — 位置:Settings → General → Releases → Enable immutable releases;需要时加 release attestation — 依据 [S13][S57][S14]
- [ ] **DAY-11 设定协作功能开关** — 触发:Q-C7 — 位置:Settings → General → Features:Issues / Discussions / Wiki;Projects 的可见性单独在项目设置里确认 — 依据 [S36][S37][S30]
- [ ] **DAY-12 补齐可发现性元数据** — 触发:Q-C6 — 位置:仓库主页右侧 About:Description、Topics、Website、Social preview — 依据 [S86][S92]
- [ ] **DAY-13 匿名验证** — 触发:通用 — 动作:登出浏览器打开 README;`curl -sSL https://raw.githubusercontent.com/<owner>/<repo>/<branch>/README.md`;匿名 `git clone --recurse-submodules`;跑一次文档里的安装命令 — 依据 [S05][S87]
- [ ] **DAY-14 发布公告(可选)** — 触发:通用 — 动作:发一条 release 或 README 顶部说明,写清这是什么、能做什么、去哪提问 — 依据 [S41]

## P30 公开后 30 天内

- [ ] **P30-01 建立变更记录规范** — 触发:Q-R6、Q-F7、Q-A9=仅手动发布 — 动作:每次发布写 release notes;需要累积视图时同步 `CHANGELOG.md`;写明版本号规则 — 依据 [S41][S63]
- [ ] **P30-02 发布第一个公开版本说明** — 触发:Q-F7=有、DAY-14 — 动作:补一份完整的首版说明,包含安装方式、边界与已知限制 — 依据 [S41][S87]
- [ ] **P30-03 补可选元数据文件** — 触发:Q-C5 任一、Q-G1=我会公开招募共同维护者 — 动作:`CODEOWNERS`、`SUPPORT.md`、`.github/FUNDING.yml`、`CITATION.cff`、`GOVERNANCE.md` 按选中的补 — 依据 [S92][S20][S87]
- [ ] **P30-04 观察并分诊外部输入** — 触发:通用 — 动作:处理 secret scanning 告警、fork PR、issue 与安全报告;记录哪些规则需要写进 CONTRIBUTING — 依据 [S56][S42][S90]
- [ ] **P30-05 完成发布凭据迁移** — 触发:Q-A9=OIDC 或 staged — 动作:切到 trusted publishing;npm 侧可用 stage-only 令牌并在发布前人工 2FA 确认 — 依据 [S59][S60]
- [ ] **P30-06 接入 OpenSSF Scorecard** — 触发:可选 — 动作:用官方 Action 或 CLI 跑一次,按 Dangerous Workflow 与 Token Permissions 优先修 — 依据 [S64]
- [ ] **P30-07 落地噪声处理规则** — 触发:Q-G4、Q-I4 — 动作:把关闭依据写进 CONTRIBUTING;需要时加自动关闭或标签机器人 — 依据 [S90][S79][S76]
- [ ] **P30-08 演练漏洞响应** — 触发:Q-S7、Q-G1、Q-G3 — 动作:走一遍「私密报告 → 修复 → 发布 advisory / 申请 CVE」的路径,确认 SECURITY.md 的承诺可兑现 — 依据 [S11][S63][S89]

## LONG 长期

- [ ] **LONG-01 建立资助或承接渠道** — 触发:Q-G1=由组织或公司承接、Q-G2 任一非「不开」 — 动作:`FUNDING.yml` 与 GitHub Sponsors,或在组织/基金会下承接;写清资金用途 — 依据 [S89][S87]
- [ ] **LONG-02 建立治理结构** — 触发:Q-P1=基金会、Q-G1=由组织或公司承接、Q-G2=基金会或公司、Q-C5=GOVERNANCE、Q-F3=6 人以上或有权限的人多于实际在做的人 — 动作:`GOVERNANCE.md` 写决策方式、角色与冲突处理 — 依据 [S87][S92]
- [ ] **LONG-03 复核来源台账** — 触发:通用 — 动作:按 [`sources.md`](sources.md) 的复核台账,每 3 个月核对「平台规则」,版本变化时核对「标准」,每 6 个月核对「社区共识」;变化只回改引用它的题目 — 依据 [S53][S63]
- [ ] **LONG-04 制定归档或移交计划** — 触发:Q-G5 任一非「保持活跃」 — 动作:归档仓库、更新 README 状态、写明替代方案或接手者 — 依据 [S27][S87]
- [ ] **LONG-05 扩展维护者并交接权限** — 触发:Q-G1=我会公开招募共同维护者或已有分工、Q-F3=只有我一人或有权限的人多于实际在做的人 — 动作:增加协作者与 CODEOWNERS、分配 org 角色、写下发布与安全流程 — 依据 [S89][S87][S63]

## 任务与选项的对应关系速查

| 阶段 | 编号 | 触发它的题目 |
|---|---|---|
| PRE | PRE-01 | F1, P4 |
| PRE | PRE-02 | L1, P1 |
| PRE | PRE-03 | L1, L3 |
| PRE | PRE-04 | L2 |
| PRE | PRE-05 | L3, F6 |
| PRE | PRE-06 | L4, L5 |
| PRE | PRE-07 | P2 |
| PRE | PRE-08 | P2, F9 |
| PRE | PRE-09 | P3 |
| PRE | PRE-10 | F10, S3, H1 |
| PRE | PRE-11 | H2 |
| PRE | PRE-12 | H3 |
| PRE | PRE-13 | H4 |
| PRE | PRE-14 | S7, G1 |
| PRE | PRE-15 | C1, F8 |
| PRE | PRE-16 | C2 |
| PRE | PRE-17 | C3, C4 |
| PRE | PRE-18 | I1–I5 |
| PRE | PRE-19 | H1 |
| PRE | PRE-20 | 通用 |
| PRE | PRE-21 | F4, A9 |
| PRE | PRE-22 | F8 |
| DAY | DAY-01 | 通用 |
| DAY | DAY-02 | S1, S2 |
| DAY | DAY-03 | S4 |
| DAY | DAY-04 | S6 |
| DAY | DAY-05 | S5 |
| DAY | DAY-06 | A1, A2, A3 |
| DAY | DAY-07 | A4–A7 |
| DAY | DAY-08 | R1, R2, R4, H2 |
| DAY | DAY-09 | R3 |
| DAY | DAY-10 | R5, F4, F7 |
| DAY | DAY-11 | C7 |
| DAY | DAY-12 | C6 |
| DAY | DAY-13 | 通用 |
| DAY | DAY-14 | 通用(可选) |
| P30 | P30-01 | R6, F7, A9 |
| P30 | P30-02 | F7, DAY-14 |
| P30 | P30-03 | C5, G1 |
| P30 | P30-04 | 通用 |
| P30 | P30-05 | A9 |
| P30 | P30-06 | 可选 |
| P30 | P30-07 | G4, I4 |
| P30 | P30-08 | S7, G1, G3 |
| LONG | LONG-01 | G1, G2 |
| LONG | LONG-02 | P1, G1, G2, C5, F3 |
| LONG | LONG-03 | 通用 |
| LONG | LONG-04 | G5 |
| LONG | LONG-05 | G1, F3 |
