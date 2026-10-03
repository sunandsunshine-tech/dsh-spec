# 把 dsh-spec 变为公开仓库:配置、动作与注意事项

面向本仓库维护者的公开前报告。日期 2026-09-23。结论来自四路材料:对本仓库与 `sunandsunshine-tech/dsh-spec` 设置的实测、GitHub 官方文档(`docs.github.com` 与 `github.blog`)、近三个月(2026-06-23 → 2026-09-23)的社区一手共识、以及 14 个主流公开仓库的配置抽样。每条结论都带可点击来源;实测结论带执行的命令。

本文是 `docs/` 下的一篇无配对文档(见 [本目录的常设指令](../AGENTS.md)),只有中文一侧。

## 0. 执行摘要

**技术上现在就可以公开。** 别人最容易漏的三件事这里已经具备:MIT `LICENSE`、第三方来源通知 `THIRD_PARTY_NOTICES.md`、可公开访问的 pinned 基线(上游 `deepseek-ai/deepseek-harness` 是 public + MIT)。全历史(含 30 个 PR 分支引用)没有扫到任何凭证形状的字符串;没有 fork、没有 Actions 运行记录、没有 packages、没有 webhook 或 deploy key、没有 issue、仅一名协作者。

**公开前需要处理的是四个决定和一个不一致,不是一堆技术配置。**

1. **一个不一致(建议当 bug 修)**:`THIRD_PARTY_NOTICES.md` 第 7 行写「pinned at `dsh-v0.1.6-alpha.2` (`ddefc45…`)」,而 `AGENTS.md`、`scripts/ports.json` 的 `baseline`、`docs/releases/v0.2.0.md` 与 submodule 都是 `dsh-v0.1.7-alpha.2` (`00102833…`)。该文件自 PR #3 之后再没被改过,而基线在 PR #18 升到 v0.1.7。公开仓库的出处声明写错版本,是外部读者最先拿来质疑可信度的点。
2. **版权署名主体**:`LICENSE` 第一行是 `Copyright (c) 2026 北京三与叁山餐饮服务有限公司 (SunAndSunshine)`。这一行会随每一份副本永久公开,换成个人署名或更中性的主体是现在最便宜的时候。
3. **提交作者邮箱**:31 个提交的作者邮箱是同一个个人 163 邮箱(另有部分提交的 committer 是 `noreply@github.com`)。公开后它逐一可查;接受、或改写成 GitHub noreply 再公开,是两种都成立的答案,但要在公开前选。
4. **「公开即不可撤回」的清单确认**:31 个提交的完整历史、32 个 PR(含正文与评论)、2 个已关闭未合并 PR 的分支提交(`refs/pull/22/head`、`refs/pull/23/head`)、40 篇 Agent Note、2 个 tag 与 v0.2.0 release 会全部公开。
5. **这份报告本身是否留在公开树里**。

**公开后立刻要做的是三类设置**:安全功能(secret scanning 会自动开、CodeQL、私有漏洞报告)、Actions 默认值(即使用不到 workflow 也要设,fork PR 审批与 token 只读)、main 的 ruleset(现在私有免费版返回 403,公开后即可用)。**有一个时间点值得记下**:GitHub 2026-09-17 宣布对 public 仓库默认禁用 `pull_request_target` 触发,2026-11-02 起强制;本仓库将来若要加 CI,应在那个默认生效后再设计 workflow。

**公开会解锁的比想象多**:secret scanning 对公开仓库自动、免费、扫全历史与所有分支;code scanning/CodeQL 免费;rulesets 与 branch protection 从 403 变为可用;private vulnerability reporting 与 repository security advisories 仅公开仓库可用;artifact attestations 在 Free 计划下也仅公开仓库可用。反过来,**fork 一旦公开就无法禁止**,`Stars` 与 `watchers` 会被清零,私转公时所有 push rulesets 会被禁用(官方原文),并且公开仓库默认进入 GitHub Archive Program,第三方可通过公开 API 归档。

## 1. 本仓库现状(2026-09-23 实测)

| 项 | 实测值 |
|---|---|
| 归属与可见性 | `sunandsunshine-tech/dsh-spec`,private,org 为 Free 计划,当前账号是 org `admin`(实测 `gh api user/memberships/orgs/…`) |
| 许可证 | MIT;`LICENSE` 版权方为公司法定全名 |
| 分支与 tag | 仅 `main`;tag `v0.1.0`,`v0.2.0`;release 仅 `v0.2.0`(非 draft、非 prerelease) |
| 提交 | 31 个(`git rev-list --all --count`);作者邮箱仅一个个人 163 邮箱 |
| PR / issue | 32 个 PR(30 merged,2 closed 未合并:`#22`、`#23`);0 个 issue |
| 引用面 | origin 上只有 `refs/heads/main`、两个 tag、以及 GitHub 自管的 30 条 `refs/pull/<N>/head`;本地另有 726 个 `refs/translation-pairing/snapshots/*` 引用,**未推送**,不会随公开暴露 |
| 协作者 | 仅 `DreamStar92` |
| Actions | 已启用,`allowed_actions: all`,`sha_pinning_required: false`;0 次运行、0 个 artifact、0 个 environment、0 个 secret |
| 安全功能 | `security_and_analysis: null`(免费私有仓库无 GHAS);Dependabot alerts 关闭(API 403);0 个 advisory;无 packages、webhook、deploy key |
| Rulesets / 分支保护 | 返回 403「Upgrade to GitHub Pro or make this repository public to enable this feature」——当前不可用 |
| 社区 profile | 57%:已有 README、LICENSE、PR 模板;缺 code of conduct、contributing、issue template |
| 仓库特性 | Issues 开、Wiki 关、Discussions 关、Projects 开、Pages 关、fork 关 |
| 合并策略 | 仅 squash;merge commit 与 rebase 关;合并后自动删分支 |
| 构建面 | 无 `package.json`、无 `.github/workflows`;`.github/` 只有 PR 模板与 release 模板;Node ≥ 22.19(本机 v24.21.0) |
| 基线 | `submodules/dsh` → `https://github.com/deepseek-ai/deepseek-harness`(该仓库 public + MIT),钉在 `dsh-v0.1.7-alpha.2` (`00102833…`) |
| 出处文本 | 16 个移植文件带 `SPDX-License-Identifier: MIT` 与上游路径/修订;`scripts/ports.json` 是登记表 |
| 体积 | 仓库 735 KB;历史最大 blob 是 301 KB 的 `vendor-mdast.mjs`(vendored Markdown 解析器) |

秘密扫描(公开前最关键的一项)的结论与口径:

- 扫描范围:工作树全部 tracked 文件 + `main`、两个 tag、以及**抓取下来的 30 个 PR 分支引用**的完整历史(`git fetch origin '+refs/pull/*/head:refs/remotes/pr/*'` 后 `git log --all -p`)。
- 模式:AWS `AKIA…`、GitHub `ghp_/gho_/ghs_/github_pat_`、PEM 私钥头、Slack `xox…`、OpenAI `sk-…`、Google `AIza…`、JWT 三段式,以及 `password|secret|api_key|token = …` 形式的赋值。
- 结果:全部 0 命中。另无 `.env`、`id_rsa`、`.pem`、`credentials` 类文件;`git log --all --diff-filter=D` 显示被删除的文件只有 Agent Note 与技能文件。
- 32 个 PR 的正文、评论与 review 文本(共 1993 行)同样 0 命中。
- 工作树里 Tracked 的 `TODO/FIXME` 只出现在技能自己的示例语料中,不是遗留标记。

仓库自己的门禁与测试全绿,公开后加 CI 是「接线」而不是「修绿」:

```
node --test 'tests/**/*.test.ts'                 → tests 130, pass 130, fail 0
node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts check --all --root .
                                                 → 40 篇 Agent Note 通过分类与格式;6 件冻结归档通过
node scripts/verify-port-provenance.ts           → 16 个移植文件对上 dsh-v0.1.7-alpha.2 (00102833)
node scripts/verify-skill-structure.ts --root skills/<name>  → 九个技能逐个通过
```

## 2. 改可见性的机制与官方原文后果

**入口有三条,含义相同。** UI:Settings → General → Danger Zone → Change repository visibility([官方步骤](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility));REST:`PATCH /repos/{owner}/{repo}`,请求体 `private: false`([REST 文档](https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#update-a-repository));CLI:`gh repo edit --visibility public --accept-visibility-change-consequences`([gh 手册](https://cli.github.com/manual/gh_repo_edit))。仓库 admin 即可改;org 可把权限收窄为仅 owner([组织设置](https://docs.github.com/en/organizations/managing-organization-settings/restricting-repository-visibility-changes-in-your-organization)),本仓库当前账号是 owner,实测不受限。

**官方列出的 private → public 后果,逐条:**

- 代码对任何能访问 github.com 的人可见;
- **任何人都可以 fork**;
- **所有 push rulesets 会被禁用**;
- 变更会作为 activity 发布;
- **Actions 历史与日志对所有人可见**;若曾使用同 org 其他仓库的 reusable/required workflow,日志会暴露其文件路径与仓库名(本仓库 0 次运行,无此项);
- **Stars 与 watchers 会被清零**(本仓库当前为 0);
- 仓库**自动获得 GitHub Advanced Security 能力**;
- 默认纳入 GitHub Archive Program,第三方可经公开 API 归档([文档](https://docs.github.com/en/repositories/archiving-a-github-repository/about-archiving-content-and-data-on-github))。

同一页还给了反方向的代价(公开后再改回 private):public fork 会留在独立网络里,**不可恢复**;stars/watchers 再次清空;私有免费仓库下 GHAS 功能停用;Pages 站点下线。也就是说公开的副作用不可回滚,重新私有并不等于回到原状。

**公开自动解锁、值得在第一天就确认开着的功能:**

| 功能 | 公开仓库下的状态 | 官方依据 |
|---|---|---|
| Secret scanning | **自动运行、免费、扫全历史与所有分支** | [GitHub security features](https://docs.github.com/en/code-security/getting-started/github-security-features)、[secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning) |
| Push protection | 对公开仓库默认可用;另有账号级 push protection for users,默认开启,阻止向公开仓库推入 secret | [push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection) |
| Code scanning / CodeQL default setup | 公开仓库免费可用,需启用 | [code scanning](https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning) |
| Private vulnerability reporting / security advisories | **仅公开仓库可用**(github.com) | [repository security advisories](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories) |
| Rulesets / protected branches | 公开仓库在 Free 计划下可用 | [about rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) |
| Artifact attestations | Free/Pro/Team 下**仅公开仓库**可用 | [artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations) |
| Actions 分钟数 | 公开仓库的标准 GitHub-hosted runner 免费 | [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |

**四个容易误判的点(官方文档已澄清):**

- **Packages 不随仓库公开而公开**:package 只继承仓库的访问权限,不继承可见性;默认发布为 private,转到 public 后不能再改回 private([文档](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility))。本仓库没有 package,不受影响。
- **Traffic/Insights 不公开**:可读者仍是拥有 push 权限的人([文档](https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-traffic-to-a-repository))。
- **secret scanning 的 alert 本身不公开**:可读者是仓库/组织 owner、security manager 与 admin([文档](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-secret-scanning-alerts/viewing-alerts))。
- **Projects 与仓库可见性相互独立**,不随仓库转公开自动变化([文档](https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-visibility-of-your-projects))。

## 3. 公开前要做的(逐项)

### 3.1 对齐 `THIRD_PARTY_NOTICES.md` 的基线版本

现状(实测):`git grep -n 'dsh-v0\.1\.'` 把同一个事实写在了四处,其中一处不一致。

| 文件 | 写法 |
|---|---|
| `AGENTS.md` | `dsh-v0.1.7-alpha.2` |
| `scripts/ports.json` `baseline` | `dsh-v0.1.7-alpha.2` / `00102833…` |
| `docs/releases/v0.2.0.md` | `dsh-v0.1.7-alpha.2` / `00102833` |
| `THIRD_PARTY_NOTICES.md` 第 7 行 | `dsh-v0.1.6-alpha.2` / `ddefc45…` |

`git log --oneline -- THIRD_PARTY_NOTICES.md` 只有一次提交(PR #3);基线在 PR #18 升到 v0.1.7 时没有带上它。16 个移植文件头部与 `ports.json` 的逐文件 `sha` 仍然写 `ddefc45…`,那是「这份代码从哪个修订移植」,与「仓库当前钉在哪个基线」是两个事实;公开仓库的通知文件应把后者写对,或者把两个事实在文里分开说清。建议的最小修正是把第 7 行改为:

```
Upstream: <https://github.com/deepseek-ai/deepseek-harness>, pinned at `dsh-v0.1.7-alpha.2` (`00102833dfaee1da9f48a3a8eae9d34005a75218`).
```

这正是 `AGENTS.md` 规范钩子里 `owner.one-home` 那条红线针对的同一类漂移 —— 一个路径或常量属于拥有它的东西，别处一律从那里推导；同一个 baseline 现在有两个字面量。

### 3.2 版权署名主体(决定)

`LICENSE` 第一行把版权方写成公司法定全名。它公开后出现在每一份副本、每一个 fork、以及第三方归档里,事后改名要动所有副本。可选项:保留公司署名(把 dsh-spec 作为公司开源项目,是最自然的读法)、改为个人署名、或改用 `SunAndSunshine` 这类与 org 名一致的中性署名。这是法律与品牌决定,本报告不替其选择。

### 3.3 提交作者邮箱与署名(决定 + 命令)

实测 `git log --format='%ae|%ce' | sort -u`:作者侧是一个个人 163 邮箱,committer 侧部分是 `noreply@github.com`。公开后作者邮箱在 GitHub 每个提交页可查,也是 secret scanning 与 bot 抓取的目标。

三条路,按代价排序:

1. **接受**:31 个提交的历史不动,代价是邮箱公开。
2. **公开前统一改写为 GitHub noreply**:现在改写最便宜——没有 fork、没有 star、没有外部 clone 的既成事实,也没有已发布的不可变 release。`git filter-repo` 改写作者与 committer 后强推 `main` 与两个 tag;代价是 32 个 PR 的 head 提交仍取自旧对象(PR 引用由 GitHub 托管,不受强推影响),以及需要先把当前 `main` 备份成一条本地分支。
3. **拆出一段干净历史**:上游的基线本来就是 `submodules/dsh`,而本仓库才 31 个提交;若将来要彻底换血,可以只取树快照(见 §6.7 的 NHS Digital 快照法)。

配套设置:在 GitHub 账号的邮箱设置里勾选「Keep my email addresses private」并启用「Block command line pushes that expose my email」,否则改写完的邮箱会在下一次推送时被 GH007 拦下([GitHub 文档](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address))。注意 noreply 地址**不是身份证明**——2026 年 5 月的 TanStack 供应链事件里,攻击者用伪造的 `claude <claude@users.noreply.github.com>` 身份混入历史;它只用于隐私,不用于信任。

### 3.4 「不可撤回」清单确认

公开前应逐项确认这些内容可以公开,而不是公开后再发现:

- 31 个提交的完整 diff 与提交信息;
- 32 个 PR 的标题、正文、评论(1993 行)与 diff;其中 #22、#23 是关闭未合并的 WIP 分支,它们的提交只存在于 `refs/pull/*`,公开后可被 fetch;
- 40 篇 Agent Note(其中 6 件已冻结归档)、9 个技能的正文与全部资源;
- 2 个 tag 与 v0.2.0 release。
- 扫描结论:以上文本无凭证、无内部主机名/IP、无客户数据;有大量中文设计讨论,属于可公开的方法论内容。

### 3.5 公开后的秘密扫描会重扫历史

公开仓库的 secret scanning 会自动扫全历史与所有分支,并把 partner secret 直接通报给服务商吊销。因此 3.1–3.4 的扫描是**公开前**的最后一道人工复核,不是替代品。公开前值得再跑一次同样的形状扫描;若历史里出现命中,官方处置顺序是**先轮换凭据,再决定是否重写历史**——重写历史「may not be warranted」,而且旧提交仍可能通过 SHA 缓存视图、fork 与 PR 引用被访问([官方文档](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository))。本仓库历史里曾有一道 `verify-no-secrets.ts` 门禁,在提交 `4f7ea6a`「门禁只读交给它的范围」的重构中被有意移除;公开前因此只有平台扫描与这次人工扫描两道。

### 3.6 冷启动可安装性

README 的安装命令是 `gh skill install sunandsunshine-tech/dsh-spec dsh-spec-manager@latest --dir .agents/skills`,当前在仓库外无法执行(private)。公开后应在一个干净环境验证一次:`gh skill install` 能解析 `@latest`(实测最新 release 是 `v0.2.0`)、submodule 能匿名 clone、README 的每一条命令可用。一个已记录的设计事实:本仓库提交的安装副本(`.agents/skills/dsh-spec-manager/SKILL.md`)的 `metadata.github-ref` 是 `refs/heads/release/v0.2.0`,而该分支在 release 合并后已删除(实测 `gh api …/branches/release/v0.2.0` 404);按 `AGENTS.md`,本仓库自身的刷新用 `upgrade --revision <current-branch>`,不依赖这条 pin——外部采用者从 `@latest` 装,拿到的是 tag。这条差异应写进采用文档,避免外部读者用 `--only-skill-set` 复现时困惑。

### 3.7 决定这份报告是否随仓库公开

`docs/` 无门禁、无层级预算,删除或移出这份文件不影响任何检查。若希望公开树里只留产品文档,在切换可见性前删除本文件即可。

## 4. 公开后十分钟内要做的设置

按优先级排列,位置都写成界面上能直接找到的路径。

1. **Settings → Security and quality → Advanced Security**
   - 确认 secret scanning 已自动开启;开启 **CodeQL default setup**(仓库是 JavaScript/TypeScript,无 `package.json`,default setup 仍可静态分析 `.ts`/`.mjs`);
   - 开启 **Private vulnerability reporting**(公开仓库专属;它同时点亮 Security 页的 report 入口);
   - Dependabot alerts:本仓库无 manifest,收益有限,可按需开。
2. **Settings → Actions → General**
   - Actions permissions:本仓库目前 `allowed_actions: all`、`sha_pinning_required: false`。若保留 Actions,设为只允许选定 action 或至少打开 **Require actions to be pinned to a full-length commit SHA**;
   - Fork pull request workflows:改为 **Require approval for all outside collaborators**(公开仓库默认只对 first-time contributors 要求审批);
   - Workflow permissions:改为 **Read repository contents and packages permissions**;
   - 取消 **Allow GitHub Actions to create and approve pull requests**;
   - 若确定不加 CI,直接 **Disable Actions** 是攻击面最小的选择:本仓库没有 workflow,禁用不损失任何现有能力。
3. **Settings → Rules → Rulesets**(公开后 403 消失)
   - 对 `main` 加一条 branch ruleset:Require a pull request before merging、Block force pushes、Require linear history(可选)、Require signed commits(可选);
   - 对 `v*` 加一条 tag ruleset:Restrict creations/deletions/updates。注意 push rulesets 在私转公时会被平台禁用,所以约束要用 branch/tag ruleset 表达;
   - 加了 CI 之后再把必过检查接进 ruleset。**不要在 2026-11-02 前设计依赖 `pull_request_target` 的 workflow**。
4. **Settings → General → Features 与仓库元数据**
   - 加 topics:`ai-agents`、`agent-skills`、`developer-tools`、`documentation`、`code-review` 一类,便于检索(官方与 NHS Digital 的公开流程都把 topics 列为公开检查项);
   - 填 homepage 或 social preview;决定 Discussions 是否开启(Issues 已开、Wiki 已关、Projects 已开)。
5. **Organization → Settings → Authentication security 与 Member privileges**
   - 打开 **two-factor requirement**(实测当前 `two_factor_requirement_enabled: false`);
   - 确认 base permission 仍是 `none`(实测已是);
   - 决定是否把可见性变更收窄为仅 org owners(实测当前未限制)。
6. **补公开仓库的社区健康文件**(当前 profile 57%)
   - `SECURITY.md`:写清支持范围(v0.2.x)、报告渠道(可直接指向 Private vulnerability reporting)与响应预期。这是公开仓库最该有、而本仓库现在没有的一份;
   - `CONTRIBUTING.md`:接受什么、怎么跑门禁(README 已有命令,可引用)、以及 AI 贡献披露规则(见 §6.5);
   - `CODE_OF_CONDUCT.md`:Contributor Covenant 2.1 是事实默认文本;
   - `.github/ISSUE_TEMPLATE/`:当前完全没有;`.md` 模板需要 `name:` 与 `about:` 键才会被 profile 识别;
   - 可选:`CODEOWNERS`、`SUPPORT.md`、`.github/FUNDING.yml`、`CITATION.cff`。
7. **公开后立刻用匿名身份验证**:登出浏览器打开 README 与 raw 文件;`curl -sSL https://raw.githubusercontent.com/sunandsunshine-tech/dsh-spec/main/README.md`;`git clone --recurse-submodules`;跑一次 README 的安装命令。

## 5. 主流公开仓库的选择(14 个仓库抽样)

抽样方法:对每个仓库用 `gh api repos/{owner}/{repo}/community/profile` 与 `contents` 接口读取标准路径上的文件(`.` 表示在该标准路径未检出)。`Issue 模板`、`SECURITY`、`workflow`、`Dependabot`、`CODEOWNERS` 取自 `contents` 接口——profile 的 `issue_template` 字段在本样本全部为 null,不能用它判断;其余列取自 community profile。样本:microsoft/vscode、facebook/react、nodejs/node、kubernetes/kubernetes、rust-lang/rust、golang/go、vercel/next.js、denoland/deno、python/cpython、ollama/ollama、deepseek-ai/deepseek-harness、cli/cli、modelcontextprotocol/servers、torvalds/linux。

| 仓库 | profile | CoC | CONTRIB | SECURITY | README | PR 模板 | Issue 模板 | workflow | Dependabot | CODEOWNERS |
|---|---|---|---|---|---|---|---|---|---|---|
| microsoft/vscode | 100 | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| facebook/react | 100 | Y | Y | Y | Y | Y | Y | Y | Y | . |
| nodejs/node | 100 | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| kubernetes/kubernetes | 100 | Y | Y | Y | Y | Y | Y | .（自有 Prow） | . | . |
| rust-lang/rust | 87 | Y | Y | . | Y | Y | Y | Y | . | . |
| golang/go | 87 | Y | Y | Y | Y | Y | Y | .（自有 builder） | . | . |
| vercel/next.js | 87 | Y | Y | . | Y | Y | Y | Y | . | Y |
| denoland/deno | 100 | Y | Y | Y | Y | Y | Y | Y | . | . |
| python/cpython | 100 | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| ollama/ollama | 62 | . | Y | Y | Y | . | Y | Y | . | . |
| deepseek-ai/deepseek-harness | 62 | . | Y | . | Y | Y | Y | Y | Y | . |
| cli/cli | 100 | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| modelcontextprotocol/servers | 87 | Y | Y | Y | Y | Y | . | Y | Y | . |
| torvalds/linux | 42 | . | . | . | Y | . | . | . | . | . |

汇总出的排序:

- **近乎普遍**:`LICENSE` 与 README(14/14,README 的 profile 字段未列出 linux 的 `README`,该文件实际存在)、`CONTRIBUTING`(13/14)、PR 模板与 `.github/ISSUE_TEMPLATE`(各 12/14)、`.github/workflows` 与 CoC(各 11/14;没有 workflow 的三个仓库里,k8s 与 Go 用自有 CI——Prow 与 Go builder——linux 用邮件列表)。
- **常见但不普遍**:`SECURITY.md`(10/14)、Dependabot 配置(7/14)。
- **少数派**:`CODEOWNERS`(5/14)、`SUPPORT.md`/`GOVERNANCE.md`/`FUNDING.yml`(各 1/14);`CITATION.cff` 在本样本 0/14。
- **与本仓库最相关的对照是它的上游**:`deepseek-ai/deepseek-harness`(public、MIT)只有 README、CONTRIBUTING、PR 模板、issue 模板、workflow 与 Dependabot,没有 CoC、没有 SECURITY.md。也就是说,「抽取来源本身公开成什么样」已经给出了一条被接受的基线。

把这些与「公开首日」结合,结论是:公开当天真正的地板是 **LICENSE + README + 一份 SECURITY/披露渠道 + 一个贡献入口**;CoC、issue 模板、CODEOWNERS、FUNDING、CITATION 都是后续按社区规模补的。本仓库在文件层面只差 SECURITY/CONTRIBUTING/CoC/issue 模板,而 `AGENTS.md`、`docs/` 与门禁体系已经比大多数样本更完整。

## 6. 近三个月社区共识(2026-06-23 → 2026-09-23)

### 6.1 供应链事件:重心从「偷凭据」转向「劫持 CI 身份」

- **2026-08-04,keyv 及同族(Shai-Hulud 第二波)**:维护者 GitHub 账号被控后攻击者**直接推 main 并立即发版**,因此恶意版本带有「由 GitHub Actions 签发的有效 provenance」;`preinstall` 触发,窃取 npm/GitHub/AWS/K8s/Vault/Stripe/Slack,并从 runner 进程内存抓 OIDC token;最终规模报道到 868 个包 / 1381 个版本([Aikido](https://www.aikido.dev/blog/keyv-and-friends-compromised-in-npm-supply-chain-attack))。
- **2026-08-20,arrayref(一个 Rust crate 被投毒)**:crates.io 上 `arrayref`、`internment`、`append-only-vec` 被重新发布并依赖恶意 build-script crate,约 86–107 分钟后下架([Rust Blog](https://blog.rust-lang.org/2026/08/20/supply-chain-attack-on-arrayref/))。
- **2026-07-14,AsyncAPI**:攻击者开 37 个 PR 作掩护,其中一个利用配置错误的 Actions workflow 窃取高权限 PAT,再以 `@asyncapi` 名义发 4 个恶意包([Wiz](https://threats.wiz.io/all-incidents/m-red-team-asyncapi-supply-chain-compromise-via-github-actions))。
- **[共识]** 对公开仓库的直接含义:一旦启用 Actions,`pull_request_target`、fork PR、cache 与第三方 action 就是攻击面。本仓库目前**没有 workflow**,这是优势;将来加 CI 时应把它当作安全设计题,而不是 YAML 模板题。
- **[过时但为理解基础, 2026-05]** TanStack 事件:`pull_request_target` 检出 fork + Actions cache 投毒 + 从 runner 内存取 OIDC token,6 分钟发 84 个产物;SLSA 官方借此说明「有效签名 ≠ 可信」([SLSA](https://slsa.dev/blog/2026/05/mini-shai-hulud-what-slsa-can-and-cannot-do)、[TanStack 尸检](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem))。

### 6.2 GitHub Actions 加固:平台把默认值改向安全侧

- **2026-06-18**:`actions/checkout` 默认拒绝在 `pull_request_target` / `workflow_run` 中检出 fork 代码(opt-out 需显式写 `allow-unsafe-pr-checkout`)([changelog](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/))。
- **2026-09-17**:workflow 执行保护 GA,并引入**面向 public 仓库默认禁用 `pull_request_target`** 的规则:先以 evaluate 模式运行,**2026-11-02 起自动强制**,可按 workflow 文件级加白名单([changelog](https://github.blog/changelog/2026-09-17-workflow-execution-protections-in-github-actions-generally-available))。这是本报告里唯一带「将来时间点」的动作项。
- **2026-09-10**:`cache-mode` 在 workflow/job 级 GA,低信任事件默认只读,缓解 cache 投毒([changelog](https://github.blog/changelog/2026-09-10-control-github-actions-cache-access-with-cache-mode))。
- **2026-07-23,Packagist/Composer 公开了可直接照抄的 zizmor 配置**:`persona: pedantic` + `advanced-security: false` 让发现即失败,自身 action 也钉 SHA 并用 `persist-credentials: false`;点名规则包括 `unpinned-uses`、`template-injection`、`dangerous-triggers`、`excessive-permissions`([Packagist](https://blog.packagist.com/securing-our-github-actions-workflows-with-zizmor/))。
- **[共识]** 三条硬规则:第三方 action 钉全长 commit SHA(并由 Dependabot/Renovate 产出「新 SHA」PR,而不是自动跟随);workflow 级 `permissions: {}`、逐 job 授最小权限;用 OIDC/Trusted Publishing 取代长期凭据。npm 侧窗口内的动作包括 staged publishing、v12 默认禁用 install scripts、以及计划 2027-01 取消 bypass-2FA 令牌直发([GitHub 2026-07-28 总结](https://github.blog/security/supply-chain-security/disrupting-supply-chain-attacks-on-npm-and-github-actions/))。
- **[可判定] 小仓库能不能不上 CI**:以 **OpenSSF OSPS Baseline v2026.08.28** 为准,Level 1 不要求 CI,只要求「存在 CI 时」不可让不可信代码拿到特权凭据;「CI 至少跑一个测试套件」是 Level 2(定义为 ≥2 名维护者且有一批稳定用户)。但只要有 workflow,工作流卫生就是 Level 1 义务,并且 OpenSSF Scorecard 把 Dangerous Workflow 列为 Critical、Token Permissions 列为 High([Baseline](https://baseline.openssf.org/versions/2026-08-28)、[Scorecard](https://scorecard.dev/))。

### 6.3 秘密扫描与泄漏处置

- GitHub 官方的默认覆盖在窗口内继续扩大(新增服务商进入默认 push protection,[2026-08-07 changelog](https://github.blog/changelog/2026-08-07-secret-scanning-coverage-updates/));公开仓库自动获得 secret scanning。
- **[共识] 分层部署**:push protection(平台侧、默认)+ gitleaks(pre-commit 与按 diff 限范围的 CI)+ trufflehog(带活体验证的全历史扫描)。CI 只扫新提交,历史发现用 baseline 冻结而不是阻塞构建——在历史发现上阻塞的团队会在一两个月内把扫描关掉。
- **[共识] 泄漏后先轮换再谈重写历史**,官方原文与代价清单见 §3.5。窗口内没有出现「只装一个扫描器就够」的权威说法。

### 6.4 地板之争:OSPS Baseline 才是 2026 年的答案,SLSA/Sigstore 不是

- **OpenSSF OSPS Baseline v2026.08.28** 是目前唯一把「任何项目的最低要求」写成 MUST 列表的公开标准:Level 1 包含敏感资源 MFA、主分支禁止直接提交、防止 secret 误入版本库、公开讨论与贡献流程说明、OSI/FSF 认可许可、公开变更记录、依赖清单、不含不可审查的二进制、安全联系人。Level 2(≥2 名维护者且有一批稳定用户)才追加签名发布或签名清单、每 commit DCO 语义声明、CI 至少一个测试套件、带时限的 CVD 政策与私有漏洞报告通道。**Sigstore / attestation / SLSA 分级不在 Level 1 门槛里。**
- **[共识]** npm 内建 provenance 已到 SLSA Build L2;L3 要求平台级隔离。本仓库不发布包与构建产物,签名与 attestation 体系对它基本不适用。
- **[共识, 2025-10 起有效]** Immutable releases 是零维护成本的发布完整性开关,开启后 tag 不可移动、asset 不可改,并自动生成 release attestation;对已经发布的 v0.2.0 这类 release 值得开启([文档](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases))。

### 6.5 AI 贡献治理:窗口内最相关的一条

本仓库的 `AGENTS.md`、`.agents/skills/` 与 22 个带 `Assisted-by: DeepSeek Harness (dsh)` trailer 的提交,使它天然处在这个议题的中心。

- **量化共识(2026-08-18 数据集)**:星标最高的 800 个仓库中取样 703 个,**38% 已有面向 agent 的说明文件**(AGENTS.md 217、CLAUDE.md 179),**明确禁止 AI PR 的只有 7 个**;主流是「写清期望」而不是「禁止」([数据集](https://github.com/sujeito-operator/ai-contribution-policy))。
- **收敛中的机制**:`Assisted-by:` git trailer 正在成为事实标准——Apache(用 `Generated-by:`)、Fedora、Rocky、OpenInfra、OpenTelemetry、LLVM、Linux 内核都推荐或要求它;`Co-authored-by:` 被批评为暗示模型有法人身份、破坏 CLA/DCO 的权属链([All Things Open 综述](https://allthingsopen.org/articles/open-source-ai-contributions-assisted-by-git-trailer-standard))。本仓库已经在用 `Assisted-by:` 且只写工具名、不写模型版本,与内核「保留标签但去掉具体模型名」的当前倾向一致。
- **项目政策文本的常见形状**:人拥有提交、AI 只当工具、必须披露、必须能解释、自主 agent 的 PR 直接关。实例:Godot(2026-06-30)、Home Assistant(2026-07-20,明确给非母语者的翻译/润色开口子)、Nerves(2026-08-20,"Contributions are made by people, not tools")、Node.js(2026-08-19,要求说明本人做了什么验证,并建议在提交信息里匿名化商业模型品牌)。
- **[争议]** Debian 在 2026-08 就 LLM 贡献发起 8 选项 GR;内核社区对 `Assisted-by` 仍在争论(是否保留、是否去掉模型名),决定可能推迟到 10 月 Maintainers Summit。纯「禁 AI」是少数派,但在清洁室/GPL 污染敏感的项目(WINE、ReactOS)里是功能性要求而非审美偏好。
- **对本仓库的动作**:公开时补 `CONTRIBUTING.md`,写明 `Assisted-by:` 的用法与「人负责解释与验证」的要求。这是本仓库少数「已经这么做了、但没有写下来」的规则之一。

### 6.6 治理、许可与来源

- **[共识] DCO 优于 CLA**:ownCloud 退役全版权转让 CLA 改用 DCO,并诚实指出 CLA 才是项目保留 relicensing 能力的东西;OSPS Level 2 把「每个 commit 由贡献者声明有权提交」写成 MUST([ownCloud](https://owncloud.com/blogs/we-killed-our-own-cla-heres-why-thats-a-good-thing/))。本仓库目前 0 个 `Signed-off-by`,若接受外部贡献,应决定 DCO 还是 CLA。
- **[共识] MIT vs Apache-2.0**:两者在闭源商用上等价;Apache-2.0 多出显式专利授权与专利报复条款,并要求保留 NOTICE、标注修改过的文件。本仓库是 MIT 抽取 + vendored 包,MIT 与现有 `THIRD_PARTY_NOTICES.md` 是一致的;若将来引入专利敏感贡献再考虑 Apache-2.0。
- **[共识] 来源可机器读**:REUSE/SPDX 头是为「拷贝后信息不丢」而生,正对应本仓库的抽取与 vendored bundle 场景;虽然不是 OSPS Level 1 的必选项,但本仓库 16 个移植文件已有 SPDX 头,继续保持即可。
- **[共识] 许可按版本变化**:GitHub 的依赖图谱改为按版本区间记录许可历史并优先从包注册中心取数据(relicensing 会永久留痕),因此 vendored 内容必须锁定到具体版本——`THIRD_PARTY_NOTICES.md` 的逐包版本表正是这个用途,§3.1 的基线对齐也要一并做对。
- 维护者侧:窗口内 Akrites 公开信(AWS/Anthropic/Google/Microsoft/OpenAI 等联署)承诺为无人维护的关键包兜底;Shipyard 的 IPFS 资金未续、Neovim 有大额捐赠未动用——公开仓库的长期风险是「发布不是终点」。

### 6.7 转公开这件事本身的方法论

- **政府级最低标准(英国 GDS/DSIT,2026-05-14;OpenSSF 2026-09-10 解读)**:公开前要先达到「命名责任人、安全披露渠道、无提交密钥、自动化漏洞管理、补丁 SLA」;把代码设为私有**不是**缺少维护能力的合规缓解手段([OpenSSF](https://openssf.org/blog/2026/09/10/open-by-default-after-ai-the-gds-guidance-and-the-enforcement-question/))。
- **可照抄的流程(NHS Digital,2026-08-21 更新)**:取仓库快照、丢弃全部历史 → fit-for-publishing checklist(用途、文档、无凭据/PII、无数据)→ 内部 + 外部双人复核 → 高级经理确认 → 打 topics 后公开([NHS Digital](https://nhsdigital.github.io/rap-community-of-practice/implementing_RAP/publishing_code/how-to-publish-your-code-in-the-open/))。「丢历史」对本仓库不是必需(实测历史干净),但它说明了另一条路线的成本结构。
- **OSPO Alliance 的四路审查**:IP/法务、安全(含 git 历史)、技术、治理;公开前最低文件集是 `LICENSE`/`README`/`CONTRIBUTING`/`CODE_OF_CONDUCT`/`SECURITY`/`CHANGELOG`,并明确警告「用未清洗的完整历史发布」与「发布整个内部仓库而不是划定的子集」是两个最常见错误([OSPO Alliance](https://ospo-alliance.org/faq/governance/07-can-we-open-source-internal-projects/))。本仓库是划定的抽取物、历史干净,已避开这两条。

## 7. 风险、回退与公开之后

- **公开不可撤回。** 官方只承诺「无法从他人的 clone 与 fork 中移除数据」,Support 只在「轮换凭据无法缓解风险」时才协助删除敏感数据;DMCA 只处理版权,不处理敏感数据。公开前的一次扫描胜过公开后的一切补救。
- **重新私有不等于回到原状。** public fork 会留在独立网络、stars/watchers 清空、免费私有仓库下 GHAS 停用。对「先公开试试」这种想法,应当按单向门对待。
- **公开后的运营负担**:公开仓库的第一个月会出现 issue、外部 PR 与安全报告。若没有 `SECURITY.md` 与响应渠道,报告会走公开 issue,反而放大风险。窗口内 50 个受资助项目的数据显示,92% 在项目结束时会启用 secret scanning、code scanning、分支保护、私有漏洞报告与 Dependabot——这五项正是公开仓库的运营底座。
- **AI slop 与噪声**:窗口内多个高热度事件都是「AI 生成的漏洞报告/PR 淹没维护者」。`CONTRIBUTING.md` 里写清「不理解的改动会被无复审关闭」「自主 agent 的 PR 会被关闭」是当前最有效的过滤器。
- **删除分支要彻底**:Packagist 的经验里有一条与本仓库直接相关——「不再维护的分支应该删掉而不是留着」。本仓库已经删掉 `release/v0.2.0`,这是正确状态;但它的安装副本 pin 仍指向它(§3.6),公开文档应说清。

## 8. 一页行动清单

公开前:

- [ ] 修 `THIRD_PARTY_NOTICES.md` 第 7 行的基线版本(§3.1)
- [ ] 决定 `LICENSE` 的版权署名主体(§3.2)
- [ ] 决定提交作者邮箱:接受 / 改写为 noreply / 重建历史;改写后确认账号侧 GH007 设置(§3.3)
- [ ] 复核「不可撤回」清单,确认 32 个 PR 与 40 篇 Agent Note 可公开(§3.4)
- [ ] 再跑一次秘密形状扫描,确认 0 命中(§3.5)
- [ ] 决定本报告是否留在公开树(§3.7)
- [ ] 准备 `SECURITY.md` 与 `CONTRIBUTING.md`(可与其同一天提交)

公开当天:

- [ ] org:打开 two-factor requirement;确认 base permission 为 none
- [ ] Security and quality:确认 secret scanning;开 CodeQL default setup 与 Private vulnerability reporting
- [ ] Actions:设置 fork PR 审批为 all outside collaborators、token 只读、禁止 Actions 建/审 PR、要求 action 钉 SHA,或直接禁用 Actions
- [ ] Rules:对 `main` 与 `v*` 加 ruleset
- [ ] Features:加 topics、homepage、social preview;决定 Discussions
- [ ] 匿名验证 README、raw 文件、submodule clone 与 `gh skill install …@latest`
- [ ] 对 v0.2.0 开启 immutable release(可选)

公开后一个月:

- [ ] 补 `CODE_OF_CONDUCT.md` 与 `.github/ISSUE_TEMPLATE/`
- [ ] 在 `CONTRIBUTING.md` 写 `Assisted-by:` 披露规则;决定 DCO 还是 CLA
- [ ] 若加 CI:在 2026-11-02 之后设计,配 zizmor、SHA pin、`permissions: {}`,并接进 ruleset
- [ ] 决定是否接入 OpenSSF Scorecard(免费自检)
- [ ] 观察 secret scanning 告警与外部 PR 质量,必要时收紧 Actions 与 PR 政策

## 9. 来源

**GitHub 官方文档**

- [Setting repository visibility](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility) · [Restricting repository visibility changes in your organization](https://docs.github.com/en/organizations/managing-organization-settings/restricting-repository-visibility-changes-in-your-organization) · [Update a repository (REST)](https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#update-a-repository) · [Forks](https://docs.github.com/en/pull-requests/reference/forks)
- [GitHub security features](https://docs.github.com/en/code-security/getting-started/github-security-features) · [Quickstart for securing your repository](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository) · [Secret scanning](https://docs.github.com/en/code-security/concepts/secret-security/secret-scanning) · [Push protection](https://docs.github.com/en/code-security/concepts/secret-security/push-protection) · [Code scanning](https://docs.github.com/en/code-security/concepts/code-scanning/code-scanning) · [Repository security advisories](https://docs.github.com/en/code-security/concepts/vulnerability-reporting-and-management/repository-security-advisories) · [Configuring private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository) · [Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases) · [Artifact attestations](https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations)
- [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) · [Managing GitHub Actions settings for a repository](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository) · [Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [About community profiles for public repositories](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/about-community-profiles-for-public-repositories) · [Creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) · [Configuring issue templates](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository)
- [Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository) · [GitHub Private Information Removal Policy](https://docs.github.com/en/site-policy/content-removal-policies/github-private-information-removal-policy) · [DMCA Takedown Policy](https://docs.github.com/en/site-policy/content-removal-policies/dmca-takedown-policy) · [Setting your commit email address](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-email-preferences/setting-your-commit-email-address) · [About archiving content and data on GitHub](https://docs.github.com/en/repositories/archiving-a-github-repository/about-archiving-content-and-data-on-github)

**GitHub 官方公告(github.blog,窗口内)**

- [Disrupting supply chain attacks on npm and GitHub Actions](https://github.blog/security/supply-chain-security/disrupting-supply-chain-attacks-on-npm-and-github-actions/)(2026-07-28)
- [Safer pull_request_target defaults for actions/checkout](https://github.blog/changelog/2026-06-18-safer-pull_request_target-defaults-for-github-actions-checkout/)(2026-06-18)
- [Workflow execution protections in GitHub Actions GA](https://github.blog/changelog/2026-09-17-workflow-execution-protections-in-github-actions-generally-available)(2026-09-17)
- [Control GitHub Actions cache access with cache-mode](https://github.blog/changelog/2026-09-10-control-github-actions-cache-access-with-cache-mode)(2026-09-10)
- [Secret scanning coverage updates](https://github.blog/changelog/2026-08-07-secret-scanning-coverage-updates/)(2026-08-07)
- [What 50 open source projects taught us about security in the AI era](https://github.blog/open-source/maintainers/what-50-open-source-projects-taught-us-about-security-in-the-ai-era/)(2026-08-13)
- [Immutable releases are now generally available](https://github.blog/changelog/2025-10-28-immutable-releases-are-now-generally-available/)(2025-10-28,窗口前,仍有效)

**标准与社区共识**

- [OpenSSF OSPS Baseline v2026.08.28](https://baseline.openssf.org/versions/2026-08-28) · [OpenSSF Scorecard](https://scorecard.dev/) · [SLSA: Mini Shai-Hulud — what SLSA can and cannot do](https://slsa.dev/blog/2026/05/mini-shai-hulud-what-slsa-can-and-cannot-do) · [REUSE Specification v3.3](https://reuse.software/spec-3.3/)
- [Open by Default After AI: the GDS guidance](https://openssf.org/blog/2026/09/10/open-by-default-after-ai-the-gds-guidance-and-the-enforcement-question/)(2026-09-10)
- [NHS Digital: How to publish your code in the open](https://nhsdigital.github.io/rap-community-of-practice/implementing_RAP/publishing_code/how-to-publish-your-code-in-the-open/) · [OSPO Alliance: can we open source internal projects](https://ospo-alliance.org/faq/governance/07-can-we-open-source-internal-projects/)
- [Aikido: keyv and friends compromised](https://www.aikido.dev/blog/keyv-and-friends-compromised-in-npm-supply-chain-attack)(2026-08-04) · [Rust Blog: supply chain attack on arrayref](https://blog.rust-lang.org/2026/08/20/supply-chain-attack-on-arrayref/)(2026-08-20) · [Wiz: AsyncAPI compromise](https://threats.wiz.io/all-incidents/m-red-team-asyncapi-supply-chain-compromise-via-github-actions)(2026-07-14) · [TanStack postmortem](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem)(2026-05)
- [Packagist: securing our GitHub Actions workflows with zizmor](https://blog.packagist.com/securing-our-github-actions-workflows-with-zizmor/)(2026-07-23)
- [Assisted-by: how open source projects are drawing the line on AI contributions](https://allthingsopen.org/articles/open-source-ai-contributions-assisted-by-git-trailer-standard) · [AI contribution policy dataset](https://github.com/sujeito-operator/ai-contribution-policy)(2026-08-18) · [Godot contribution policy](https://godotengine.org/article/contribution-policy-2026/)(2026-06-30) · [Home Assistant AI policy](https://developers.home-assistant.io/docs/ai_policy/)(2026-07-20) · [Nerves AI policy](https://nerves-project.org/newsletter/2026-08-20-nerves-sets-an-ai-policy/)(2026-08-20) · [Node.js AI guidelines](https://github.com/nodejs/node/blob/main/doc/contributing/ai-guidelines.md)(2026-08-19) · [Debian GR on LLM contributions](https://lists.debian.org/debian-devel-announce/2026/08/msg00002.html)(2026-08-15)
- [ownCloud: we killed our own CLA](https://owncloud.com/blogs/we-killed-our-own-cla-heres-why-thats-a-good-thing/)(2026-04-23) · [Akrites open letter](https://akrites.org/letter/)(2026-06-25) · [The end of IPFS at Shipyard](https://ipshipyard.com/blog/2026-the-end-of-ipfs-at-shipyard/)(2026-08-24)

**本仓库实测**

- `gh api repos/sunandsunshine-tech/dsh-spec`、`…/community/profile`、`…/rulesets`、`…/branches/main/protection`、`…/actions/permissions`、`…/actions/runs`、`…/hooks`、`…/keys`、`…/collaborators`、`orgs/sunandsunshine-tech`、`user/memberships/orgs/sunandsunshine-tech`
- `git rev-list --all --count`、`git for-each-ref`、`git ls-remote origin`、`git log --all -p | grep -E '<credential shapes>'`、`git log --format='%ae|%ce' | sort -u`、`git log --all --diff-filter=D --name-only`
- `node --test 'tests/**/*.test.ts'`、`node .agents/skills/dsh-spec-manager/scripts/dsh-spec.ts check --all --root .`、`node scripts/verify-port-provenance.ts`、`node scripts/verify-skill-structure.ts --root skills/<name>`
- 主流仓库抽样:`gh api repos/{owner}/{repo}/community/profile` 与 `…/contents/{path}`,样本与结果见 §5
- 本报告中的 59 个外部链接在 2026-09-23 逐一 `curl -sSL` 取回,全部 200;`https://raw.githubusercontent.com/sunandsunshine-tech/dsh-spec/main/README.md` 是唯一例外,它在仓库仍为 private 时返回 404,§4 第 7 步会在公开后验证它
