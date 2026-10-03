# Agent Note: 把仓库公开

Status: implemented

[English](2026-09-24-opening-this-repository.md) | 中文

## Problem

公开这个仓库要定下一组「改起来很贵」的决定:用哪个许可证、入站贡献带来什么权利、由哪份行为准则代言、AI 协助的贡献披露什么、公开的历史带着谁的身份、pull request 上跑什么、仓库页面摆哪些功能。每个决定都有站得住的答案,而那些答案当时只存在于公开工作自己的规划材料里,不是一份能活过那次会话的记录。

随仓库开源的填表套装是同一个问题的另一面。`form.md`、`questions.md`、`checklist.md` 与 `sources.md` 任何仓库都能用,而对着它们写出的两份工作文件——填表结果与由它推导的规划——带着本组织的账号状态。公开的套装要展示一份填好的表单,而不带上填它时用的那个账号。

## Decision

**许可证保持 MIT。** 上游与全部 vendored 包都是 MIT,本仓库的抽取物连同 `THIRD_PARTY_NOTICES.md` 与它一致。

**行为准则是 Contributor Covenant 2.1 官方英文原文,不建中文配对。** 以英文原文为准;而配对约定要求两侧同等权威,所以中文一侧要么是第二个权威,要么只是一个指针。本仓库只留指针。

**入站贡献从 day0 起带 DCO。** `CONTRIBUTING.md` 写明 `Signed-off-by` 要求,`scripts/verify-dco.ts` 检查 PR 范围内每个提交都带与作者一致的签名。agent 不替他人签名,检查也只认贡献者本人的签名。

**允许 AI 贡献,但必须披露。** 贡献用 `Assisted-by:` trailer 声明协助,并且由人继续为改动实际做了什么负责;自主 agent 提交的 PR 需事先获批。历史里本来就在用这个 trailer,政策写下的是既有做法,不是新规矩。

**公开的提交身份是 GitHub noreply 地址。** 仓库转公开之前改写每个提交的作者与 committer 邮箱,此时还没有 fork、没有外部 clone、也没有不可变 release;先在账号侧打开邮箱隐私设置,让改写后的身份在下次推送时不被拦回。

**CI 是一份权限最小的 workflow。** `.github/workflows/checks.yml` 在 `pull_request` 与 `push: [main]` 上触发,声明 `permissions: {contents: read}`,检出时开 `submodules: recursive`,用 Node 24,并把每个第三方 action 钉到全长 commit SHA。vendored 依赖快照只在 `push: [main]` 时提交,不加定时器。

**仓库页面保持最小。** 不加 homepage;Issues 开;Wiki、Discussions 与 Projects 关。

**表单套装作为示例公开。** `example-answers.md` 与 `example-plan.md` 承载方法——答案总表、必须由维护者拍板的决定、被跳过的题、任务落点、带依赖与验收的执行编排——并去掉本组织的账号状态;`making-this-repository-public.md` 作为公开前那次审计的记录归档在它们旁边。两份工作文件不保留。

**基线 pin 移到 `dsh-v0.2.0-rc.2`,此后每次 dsh 发布都跟一次。** 固定一套动作:按 tag 浅克隆、逐个比对移植文件与 `submodules/dsh`、有变化就重搬并更新 `ports.json`、改四处 pin,最后跑 provenance 与全量门禁。

三篇笔记各自拥有相邻的地盘,这里只链接、不复述:[the pin is the published tag](2026-09-22-the-pin-is-the-published-tag.zh.md) 拥有「安装跟随什么」——那是已装技能集的修订,不是抽取基线;[merging and publishing need authorization](2026-09-23-merging-and-publishing-need-authorization.zh.md) 拥有「为什么合并与发布是维护者的行为」;[the pull-request lifecycle](2026-09-21-the-pull-request-lifecycle.zh.md) 拥有这套决定所遵循的阶段、合并方式,以及 `Assisted-by:` trailer 在提交信息里的位置。

## Alternatives considered

- **改用 Apache-2.0。** 它多出专利授权与 NOTICE、修改标注义务。它输了:本仓库不含专利敏感的代码,而「抽取 + 重对账」的固定动作每重搬一次都要为这项义务买单。
- **给行为准则配中文版。** 它能触达更多读者。它输了:配对约定让两侧同等权威,而官方文本的译本不是。
- **用 CLA 代替 DCO。** 它保留另一条 relicensing 路径。它输了:CLA 要向偶发贡献者索要一轮法务往返,而签名是项目真能检查的那句声明。
- **禁止 AI 协助的贡献。** 它省掉披露问题。它输了:真正要的规则是「有人理解并为改动负责」,披露能达到,而一条无人能执行的禁令达不到。
- **接受现有提交邮箱,或从树快照重建历史。** 两条都免掉改写。接受它输了:改写在任何 fork、clone 与不可变 release 出现之前最便宜;快照重建输了:它丢掉抽取所依赖的可复核历史。
- **不上 CI,或让 vendored 快照定时提交。** 门禁在本地反正都会跑。不上 CI 输了:从不在 PR 上跑的检查,没法设为必需;定时器输了:依赖图谱会在新 advisory 出现时自行重算,而公开仓库的定时 workflow 停活 60 天后会被禁用。
- **打开 Wiki、Discussions、Projects 与 homepage。** 每项都只是一个开关。它们输了:那会开出与仓库内已受门禁管理的文档重复的房间。
- **把两份工作文件留在示例旁边。** 读者能拿它们对照。它们输了:它们带着组织私有的账号状态,而读者需要的是示例那部分。
- **让 submodule 自动升级。** pin 会跟着 dsh 走。它输了:设计是「钉住 + 人工重抽取」,跟发布走的固定动作才让 provenance 门禁保持意义。

## Consequences

**换来了什么。** 公开的每个决定各有一个落点,后来的维护者拿到的是写明的许可证、披露规则、身份改写与 CI 形状,而不是一份要重新拼出来的对话记录;填表套装也可被别的仓库复用,因为它的示例带的是方法,不是这个账号。

**代价是什么。** 改写会换掉全部提交 SHA,已关闭 PR 对旧提交的引用随之失效;示例失去了让原始答案有说服力的具体账号证据,读者得在方法本身的基础上接受它。

**留给读者什么。** 规划把工作排了序:这些决定点名的基线 bump、策略文档、workflow 与脚本在各自所属的阶段落地,任何平台行为都不早于授权它的那个阶段——可见性切换、rulesets 与发布只在各自的阶段、且只在维护者授权后发生,这件事由 [merging and publishing need authorization](2026-09-23-merging-and-publishing-need-authorization.zh.md) 拥有。
