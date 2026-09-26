# 开源仓库决策表单:来源表

`form.md` 中每一处 `[Snn]` 指向本表的一行。本表是表单唯一的引用真值,`form.md` 与 `checklist.md` 不复制来源内容。

字段:**id · 标题(链接) · 发布方 · 发布日期 · 取回日期 · 波动性 · 支撑的论断**。

波动性决定复核周期,见文末复核台账:

- **平台规则** — GitHub Docs 与官方公告,变化最快,每 3 个月复核(下次 2026-12-23)。
- **标准** — OpenSSF / SLSA / REUSE / OSI 等,随版本号变化,版本更新时复核。
- **社区共识** — 项目政策、数据集、事件分析、维护者文章,每 6 个月复核(下次 2027-03-23)。
- **过时** — 保留为背景,不作为当前依据。

## 一、GitHub 平台规则:文档

- **S01** [Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:private→public 的入口与全部官方后果(push rulesets 禁用、任何人均可 fork、Actions 日志公开、stars/watchers 清零、自动获得 GHAS、Archive Program、reusable workflow 路径泄漏)。
- **S02** [Restricting repository visibility changes in your organization](https://docs.github.com/en/organizations/managing-organization-settings/restricting-repository-visibility-changes-in-your-organization) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:org 可把可见性变更收窄为仅 owner;有 admin 权限者仍可改既有仓库。
- **S03** [Update a repository (REST)](https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#update-a-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:`PATCH /repos/{owner}/{repo}` 的 `private: false`/`visibility` 字段与 422 情形。
- **S04** [Forks](https://docs.github.com/en/pull-requests/reference/forks) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:私转公时私有 fork 分离为独立私有网络;网络内提交即使 fork 删除仍可访问;不能单独改 fork 可见性。
- **S05** [About repositories](https://docs.github.com/en/repositories/creating-and-managing-repositories/about-repositories) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:clone 含每个文件的所有版本;有 admin 权限者可改可见性。
- **S06** [GitHub security features](https://docs.github.com/en/code-security/getting-started/github-security-features) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库可免费运行多项 Secret Protection 与 Code Security 功能;各功能的可用层级。
- **S07** [Secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库自动免费运行;扫全历史与所有分支;partner secret 自动通报服务商;alert 的处置顺序是先轮换。
- **S08** [Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:仓库级 push protection 需 Secret Protection 且默认关闭;账号级 push protection for users 默认开启,阻止向公开仓库推入 secret,其绕过不产生 alert。**该页与 S06 对公开仓库的表述存在张力,表单按「先看界面实际状态」处理。**
- **S09** [Code scanning](https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库可用 code scanning;私有仓库需 Code Security 许可。
- **S10** [Configuring default setup for code scanning](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:default setup 的前提与路径。
- **S11** [Repository security advisories](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:仓库级 advisory 与私有漏洞报告仅公开仓库可用;发布 draft 即公开披露。
- **S12** [Configuring private vulnerability reporting for a repository](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库 owner/admin 可启用私有漏洞报告及其路径。
- **S13** [Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:启用后 tag 不可移动/删除、asset 不可改删,并生成 release attestation;关闭不追溯。
- **S14** [Artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:Free/Pro/Team 计划下 artifact attestations 仅公开仓库可用。
- **S15** [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库在 Free 计划下可用 rulesets;push rulesets 仅 Team 的 private/internal 可用。
- **S16** [Available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:branch/tag ruleset 可表达的具体规则(必需 PR、必需检查、线性历史、阻止 force push、签名提交等)。
- **S17** [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库在 Free 计划下可用 protected branches;与 rulesets 并存时的叠加关系。
- **S18** [Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:fork PR 审批档位、GITHUB_TOKEN 默认权限、是否允许 Actions 建/审 PR、SHA pinning 要求;`pull_request_target` 触发的 workflow 不受审批限制。
- **S19** [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库使用标准 GitHub-hosted runner 免费。
- **S20** [About community profiles for public repositories](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:community profile 识别的 health files(README、CODE_OF_CONDUCT、LICENSE、CONTRIBUTING、SECURITY 等)。
- **S21** [Creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:可在账号/组织级设默认 health file;LICENSE 不能设默认。
- **S22** [Configuring issue templates for your repository](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:issue 模板必须位于 `.github/ISSUE_TEMPLATE`;md 模板需要 `name:`/`about:`;表单需要 `name:`/`description:`;`config.yml` 控制入口。
- **S23** [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:泄漏后第一步是轮换;重写历史「may not be warranted」;旧提交仍可通过 SHA 缓存视图、fork、PR 引用访问;无法从他人 clone 移除;Support 只在轮换无法缓解风险时协助。
- **S24** [GitHub Private Information Removal Policy](https://docs.github.com/en/site-policy/content-removal-policies/github-private-information-removal-policy) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:仅处理高风险内容;不适用于内部主机名/IP、公司品牌或整仓库内容;需逐文件链接与风险说明。
- **S25** [DMCA Takedown Policy](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:DMCA 只处理版权,不处理敏感数据或商标。
- **S26** [Setting your commit email address](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:noreply 地址与「阻止命令行推送暴露邮箱」设置。
- **S27** [About archiving content and data on GitHub](https://docs.github.com/en/repositories/archiving-a-github-repository/about-archiving-content-and-data-on-github) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库默认纳入 GitHub Archive Program,第三方伙伴可经公开 API 归档。
- **S28** [Viewing traffic to a repository](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:traffic 对拥有 push 权限者可见,不随公开而对公众开放。
- **S29** [Configuring a package's access control and visibility](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:package 继承访问权限但不继承可见性;默认 private;转 public 后不可逆。
- **S30** [Managing visibility of your projects](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-visibility-of-your-projects) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:Projects 可见性独立于仓库可见性。
- **S31** [Dependabot alerts](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-alerts) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:依赖漏洞告警的可用范围依赖依赖图谱与 manifest。
- **S32** [Dependabot security updates](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-security-updates) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:有 alerts 才能启用 security updates,自动提 PR。
- **S33** [Dependency review](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-review) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:dependency review action 对所有公开仓库可用;可在 PR 上阻止引入有漏洞依赖。
- **S34** [Managing security and analysis settings for your repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-security-and-analysis-settings-for-your-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库建议启用的最小集合与界面位置。
- **S35** [Quickstart for securing your repository](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:官方给出的仓库安全配置顺序(访问、依赖图谱、alerts、security updates、code scanning)。
- **S36** [About wikis](https://docs.github.com/en/communities/documenting-your-project-with-wikis/about-wikis) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开仓库的 wiki 对公众可见。
- **S37** [Enabling or disabling GitHub Discussions for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/enabling-or-disabling-github-discussions-for-a-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:Discussions 的开关位置与公开仓库下的可见性。
- **S38** [Repository roles for an organization](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:admin 角色的权限范围(含安全与破坏性操作)。
- **S39** [GitHub's plans](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:Free 计划下公开仓库与私有仓库可用的功能差异。
- **S40** [gh repo edit](https://cli.github.com/manual/gh_repo_edit) — GitHub CLI 手册,无固定日期,取回 2026-09-23,平台规则。支撑:`--visibility` 与必需的 `--accept-visibility-change-consequences`。**该来源在 cli.github.com,不在 docs.github.com。**
- **S41** [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:release 与 tag 的关系、tag 处的自动 zip/tarball、release 的可见性。
- **S42** [Viewing and filtering alerts from secret scanning](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-secret-scanning-alerts/viewing-alerts) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:secret scanning alert 的可读者是 repo/org owner、security manager 与 admin,alert 本身不对公众开放。
- **S43** [Secret scanning detection scope](https://docs.github.com/en/code-security/reference/secret-security/secret-scanning-scope) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:扫描覆盖 issue/PR/discussion 文本、wiki、gist;大 push 的跳过阈值。
- **S44** [Managing rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/managing-rulesets-for-a-repository) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:ruleset 的创建、enforcement 状态与 bypass 列表。
- **S45** [Enforcing repository management policies in your enterprise](https://docs.github.com/en/enterprise-cloud@latest/admin/enforcing-policies/enforcing-policies-for-your-enterprise/enforcing-repository-management-policies-in-your-enterprise) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:企业可限制成员改可见性,此后仅企业 owner 可改。
- **S46** [About Enterprise Managed Users](https://docs.github.com/en/enterprise-cloud@latest/admin/concepts/identity-and-access-management/enterprise-managed-users) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:EMU 账号下仓库只能 private/internal,不适用于开源。
- **S47** [Deleting a workflow run](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/delete-a-workflow-run) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:公开前删除 Actions 运行记录与 artifact 的手段。
- **S48** [About merge methods on GitHub](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/about-merge-methods-on-github) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:merge commit、squash、rebase 三种合并方式的取舍与对历史形状的影响。
- **S49** [CodeQL code scanning](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:CodeQL 对公开仓库的可用性、default setup 与 advanced setup 的差别。
- **S50** [Controlling who can execute GitHub Actions workflows](https://docs.github.com/en/actions/how-tos/administer/control-workflow-execution) — GitHub Docs,无固定日期,取回 2026-09-23,平台规则。支撑:repo/org/enterprise 级的 workflow 执行策略与允许的触发类型。

## 二、GitHub 平台规则:官方公告(changelog / blog)

- **S51** [Disrupting supply chain attacks on npm and GitHub Actions](https://github.blog/security/supply-chain-security/disrupting-supply-chain-attacks-on-npm-and-github-actions/) — GitHub Blog,2026-07-28,取回 2026-09-23,平台规则。支撑:窗口内改向安全侧的默认值(高影响 npm 账号 72 小时只读、checkout 默认、workflow 执行策略、cache 只读、npm v12 默认禁用 install scripts、Dependabot 3 天 cooldown)。
- **S52** [Safer pull_request_target defaults for actions/checkout](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/) — GitHub Changelog,2026-06-18,取回 2026-09-23,平台规则。支撑:`actions/checkout` 默认拒绝在 `pull_request_target`/`workflow_run` 中检出 fork 代码;opt-out 标记名。
- **S53** [Workflow execution protections in GitHub Actions generally available](https://github.blog/changelog/2026-09-17-workflow-execution-protections-in-github-actions-generally-available) — GitHub Changelog,2026-09-17,取回 2026-09-23,平台规则。支撑:面向 public 仓库默认禁用 `pull_request_target`,先 evaluate、2026-11-02 起强制,可按 workflow 文件加白名单。
- **S54** [Control GitHub Actions cache access with cache-mode](https://github.blog/changelog/2026-09-10-control-github-actions-cache-access-with-cache-mode) — GitHub Changelog,2026-09-10,取回 2026-09-23,平台规则。支撑:cache-mode 的 read/write/write-only/none 与低信任事件默认只读。
- **S55** [Secret scanning coverage updates](https://github.blog/changelog/2026-08-07-secret-scanning-coverage-updates/) — GitHub Changelog,2026-08-07,取回 2026-09-23,平台规则。支撑:新服务商进入默认 push protection,包含免费的公开仓库。
- **S56** [What 50 open source projects taught us about security in the AI era](https://github.blog/open-source/maintainers/what-50-open-source-projects-taught-us-about-security-in-the-ai-era/) — GitHub Blog,2026-08-13,取回 2026-09-23,社区共识(官方样本)。支撑:92% 的项目在资助期结束时启用了 secret scanning、code scanning、分支保护、私有漏洞报告与 Dependabot。
- **S57** [Immutable releases are now generally available](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/) — GitHub Changelog,2025-10-28,取回 2026-09-23,平台规则(窗口前,仍有效)。支撑:immutable releases 的 GA 与设置位置。
- **S58** [Securing the open source supply chain across GitHub](https://github.blog/security/supply-chain-security/securing-the-open-source-supply-chain-across-github/) — GitHub Blog,2026-04-01,取回 2026-09-23,社区共识(官方)。支撑:不要用 `pull_request_target` 执行不可信代码;第三方 action 钉全长 SHA;注意 script injection。
- **S59** [Multiple trusted publishing configurations for npm](https://github.blog/changelog/2026-09-03-multiple-trusted-publishing-configurations-for-npm) — GitHub Changelog,2026-09-03,取回 2026-09-23,平台规则。支撑:一个包可挂多个 OIDC 配置,每个默认只能 stage,直发需逐配置 opt-in。
- **S60** [Stage-only npm tokens for safer automation](https://github.blog/changelog/2026-09-18-stage-only-npm-tokens-for-safer-automation) — GitHub Changelog,2026-09-18,取回 2026-09-23,平台规则。支撑:「Read and write (stage only)」令牌即使绕过 2FA 也无法直发;npm 计划 2027-01 取消 bypass-2FA 直发。
- **S61** [License data quality improvements](https://github.blog/changelog/2026-08-13-license-data-quality-improvements) — GitHub Changelog,2026-08-13,取回 2026-09-23,平台规则。支撑:许可信息按版本区间记录并优先从包注册中心获取,relicensing 会留痕;vendored 内容必须锁定版本。
- **S62** [How we took malware advisories beyond npm](https://github.blog/security/supply-chain-security/how-we-took-malware-advisories-beyond-npm/) — GitHub Blog,2026-08-06,取回 2026-09-23,平台规则。支撑:恶意包告警覆盖 npm、PyPI、Maven、RubyGems、NuGet、Go、crates.io、Composer,需手动开启。

## 三、标准与基准

- **S63** [OpenSSF OSPS Baseline v2026.08.28](https://baseline.openssf.org/versions/2026-08-28) — OpenSSF,2026-08-28,取回 2026-09-23,标准。支撑:Level 1(任何项目:MFA、主分支禁直接提交、防止 secret 入库、公开讨论与贡献流程、OSI/FSF 许可、变更记录、依赖清单、无不可审查二进制、安全联系人)与 Level 2(≥2 名维护者且有一批稳定用户:签名发布或签名清单、每 commit 权利声明、CI 至少一个测试套件、带时限的 CVD 与私有漏洞报告)。
- **S64** [OpenSSF Scorecard](https://scorecard.dev/) — OpenSSF,无固定日期,取回 2026-09-23,标准。支撑:18 项检查的风险权重(Dangerous Workflow 为 Critical,Token Permissions 为 High,Pinned Dependencies 为 Medium,CI Tests 为 Low)与免费自检定位。
- **S65** [Mini Shai-Hulud: what SLSA can and cannot do](https://slsa.dev/blog/2026/05/mini-shai-hulud-what-slsa-can-and-cannot-do) — SLSA,2026-05-15,取回 2026-09-23,标准(窗口前,仍有效)。支撑:有效签名不等于可信;npm 内建 provenance 到 Build L2;L3 才要求平台级隔离;SLSA 不评估 trigger 与权限最小化。
- **S66** [REUSE Specification v3.3](https://reuse.software/spec-3.3/) — REUSE,2024-11-14,取回 2026-09-23,标准。支撑:逐文件许可与版权信息,嵌入文件以便拷贝后保留。
- **S67** [Open by Default After AI: the GDS guidance and the enforcement question](https://openssf.org/blog/2026/09/10/open-by-default-after-ai-the-gds-guidance-and-the-enforcement-question/) — OpenSSF,2026-09-10,取回 2026-09-23,社区共识(官方解读)。支撑:公开前的最低标准(命名责任人、披露渠道、无提交密钥、自动化漏洞管理、补丁 SLA);把代码设为私有不是缺少维护能力的合规缓解手段。
- **S68** [OSI Approved Licenses](https://opensource.org/licenses) — Open Source Initiative,无固定日期,取回 2026-09-23,标准。支撑:哪些许可是 OSI 认可的;S63 的 Level 1 只接受 OSI/FSF 认可的许可。
- **S69** [SPDX License List](https://spdx.org/licenses/) — SPDX,无固定日期,取回 2026-09-23,标准。支撑:SPDX 标识符与许可全文的对应。

## 四、社区共识、事件与项目政策

- **S70** [MIT License vs Apache 2.0: which to pick](https://safeguard.sh/resources/blog/mit-license-vs-apache-2-0-which-to-pick) — Safeguard,2026-03-01,取回 2026-09-23,社区共识(窗口前)。支撑:两者在闭源商用上等价;Apache-2.0 的显式专利授权、专利报复、NOTICE 与标注修改文件义务;MIT 代码不能单方面改成 Apache-2.0 发布。
- **S71** [zizmor audit rules](https://docs.zizmor.sh/audits/) — zizmor,无固定日期,取回 2026-09-23,社区共识。支撑:unpinned-uses、template-injection、dangerous-triggers、excessive-permissions、artipacked、impostor-commit、typosquat-uses、known-vulnerable-actions。
- **S72** [Securing our GitHub Actions workflows with zizmor](https://blog.packagist.com/securing-our-github-actions-workflows-with-zizmor/) — Packagist/Composer,2026-07-23,取回 2026-09-23,社区共识。支撑:可直接照抄的阻塞式配置;permissions 未声明不等于没有权限;SHA 的可信度取决于钉它时的那次审查;未维护分支应删除。
- **S73** [Best secrets detection tools compared 2026](https://safeguard.sh/resources/blog/best-secrets-detection-tools-compared-2026) — Safeguard,2026-05-06,取回 2026-09-23,社区共识(窗口前)。支撑:push protection / gitleaks / trufflehog 的命中与误报实测;CI 只扫新提交,历史发现用 baseline 冻结。
- **S74** [Assisted-by: how open source projects are drawing the line on AI contributions](https://allthingsopen.org/articles/open-source-ai-contributions-assisted-by-git-trailer-standard) — All Things Open,无固定日期(窗口内),取回 2026-09-23,社区共识。支撑:`Assisted-by:` 成为事实标准;`Co-authored-by:` 的法人身份与权属问题;`Generated-by:` 的适用范围;各大基金会的政策分布。
- **S75** [Which projects have a written rule about AI-written PRs](https://github.com/sujeito-operator/ai-contribution-policy) — sujeito-operator,2026-08-18,取回 2026-09-23,社区共识(数据集,CC BY 4.0)。支撑:703/800 仓库中 38% 已有面向 agent 的说明文件(AGENTS.md 217、CLAUDE.md 179);明确禁止 AI PR 的只有 7 个。
- **S76** [Changes to our contribution policies](https://godotengine.org/article/contribution-policy-2026/) — Godot Foundation,2026-06-30,取回 2026-09-23,社区共识。支撑:不接受自主 agent 使用与 AI 生成的实质代码;AI 仅限琐事且必须披露;合并 PR ≤3 个的新贡献者不得擅自提交新功能或重大重构。
- **S77** [AI policy](https://developers.home-assistant.io/docs/ai_policy/) — Open Home Foundation / Home Assistant,2026-07-20,取回 2026-09-23,社区共识。支撑:支持把 AI 当工具但关闭自主 agent 的 PR/issue;允许用 AI 改进非母语者的语法或翻译,要求保留原文。
- **S78** [Nerves sets an AI policy](https://nerves-project.org/newsletter/2026-08-20-nerves-sets-an-ai-policy/) — Nerves,2026-08-20,取回 2026-09-23,社区共识。支撑:「Contributions are made by people, not tools」;文字必须由贡献者本人撰写;政策副本放进每个仓库以便 agent 读到。
- **S79** [Node.js AI use policy and guidelines](https://github.com/nodejs/node/blob/main/doc/contributing/ai-guidelines.md) — Node.js / OpenJS Foundation,2026-08-19,取回 2026-09-23,社区共识。支撑:必须披露并说明本人验证了什么;不理解的 PR 会被无复审关闭;除非事先获批 PR 不得由自动化工具开启;建议在 commit message 中匿名化商业模型品牌。
- **S80** [Debian GR on LLM contributions](https://lists.debian.org/debian-devel-announce/2026/08/msg00002.html) — Debian,2026-08-15,取回 2026-09-23,社区共识(争议)。支撑:8 选项 GR 展示从「社会契约禁止」到「接受」的完整谱系。
- **S81** [Debating the role of large language models in the kernel community](https://lwn.net/Articles/1083123/bigpage) — LWN,2026-07/08,取回 2026-09-23,社区共识(争议)。支撑:`Assisted-by` 标签在内核的采用、未标注现象与是否保留模型名的分歧。
- **S82** [npm supply chain compromise postmortem](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem) — TanStack,2026-05,取回 2026-09-23,社区共识(窗口前,事件基础)。支撑:pwn request + cache 投毒 + runner 内存取 OIDC;伪造 noreply 身份混入历史;后续加固清单。
- **S83** [keyv and friends compromised in npm supply chain attack](https://www.aikido.dev/blog/keyv-and-friends-compromised-in-npm-supply-chain-attack) — Aikido,2026-08-04,取回 2026-09-23,社区共识。支撑:推 main 即发版使恶意版本带有效 provenance;IDE hook 持久化;规模数据。
- **S84** [Supply chain attack on arrayref](https://blog.rust-lang.org/2026/08/20/supply-chain-attack-on-arrayref/) — Rust Blog,2026-08-20,取回 2026-09-23,社区共识。支撑:build script 供应链;下架与账号锁定的时间线。
- **S85** [AsyncAPI supply chain compromise via GitHub Actions](https://threats.wiz.io/all-incidents/m-red-team-asyncapi-supply-chain-compromise-via-github-actions) — Wiz,2026-07-14,取回 2026-09-23,社区共识。支撑:噪声式 PR 洪流作掩护;配置错误的 workflow 窃取高权限 PAT。
- **S86** [How to publish your code in the open](https://nhsdigital.github.io/rap-community-of-practice/implementing_RAP/publishing_code/how-to-publish-your-code-in-the-open/) — NHS Digital,2026-08-21 更新,取回 2026-09-23,社区共识(流程)。支撑:取快照丢历史、fit-for-publishing checklist、内外部双人复核、主管确认、打 topics。
- **S87** [Can we open source our own internal projects?](https://ospo-alliance.org/faq/governance/07-can-we-open-source-internal-projects/) — OSPO Alliance,无固定日期,取回 2026-09-23,社区共识。支撑:IP/安全/技术/治理四路审查;公开前最低文件集;未清洗历史与整仓库发布是两大错误;发布不是终点。
- **S88** [We killed our own CLA — here's why that's a good thing](https://owncloud.com/blogs/we-killed-our-own-cla-heres-why-thats-a-good-thing/) — ownCloud,2026-04-23,取回 2026-09-23,社区共识(窗口前)。支撑:CLA 是 relicensing 能力的来源;改用 DCO 是单向门。
- **S89** [Akrites open letter](https://akrites.org/letter/) — Akrites 及联署方,2026-06-25,取回 2026-09-23,社区共识。支撑:协调披露通道、maintainer of last resort、以补丁部署量衡量成效。
- **S90** [Open source was not ready for AI-speed contributions](https://frenck.dev/open-source-was-not-ready-for-ai-speed-contributions/) — frenck.dev,2026-05-31,取回 2026-09-23,社区共识(窗口前)。支撑:有用的问题是提交者是否理解、验证并负责,而不是 AI 是否碰过。
- **S91** [GH007 push rejected despite matching noreply identity](https://github.com/orgs/community/discussions/189946) — GitHub Community Discussion,2026-03-18,取回 2026-09-23,社区共识。支撑:邮箱隐私保护会产生难以自查的误伤,公开前应在测试仓库验证一次。

## 五、本仓库实测

- **S92** 14 个主流公开仓库的 health file 抽样 — 本报告实测,2026-09-23,取回 2026-09-23,社区共识(测量)。样本与结果:`docs/open-source/making-this-repository-public.md` §5。支撑:各文件的普遍度(README/LICENSE 14/14、CONTRIBUTING 13/14、PR 模板与 issue 模板 12/14、workflows 与 CoC 11/14、SECURITY.md 10/14、Dependabot 7/14、CODEOWNERS 5/14、SUPPORT/GOVERNANCE/FUNDING 各 1/14、CITATION 0/14)。

## 复核台账

| 波动性 | 下次复核 | 复核动作 |
|---|---|---|
| 平台规则(文档 S01–S50) | 2026-12-23 | 逐条打开,确认路径、默认值与可用层级未变;变化则改 `form.md` 对应选项与 `checklist.md` |
| 平台规则(公告 S51–S62) | 2026-12-23 | 检查是否出现新的默认值变化;特别注意 S53 的 2026-11-02 强制日 |
| 标准(S63–S69) | 版本变更时 | 比对 OSPS Baseline 版本号、Scorecard 检查项、REUSE 版本、SPDX 列表 |
| 社区共识(S70–S92) | 2027-03-23 | 重跑一次 14 仓库抽样;检查 AI 政策数据集与主要项目政策是否有更新 |
