# Agent Note: manager 只拥有 manifest 点名的技能

Status: proposed

[English](2026-10-10-the-manager-owns-only-the-skills-its-manifest-names.md) | 中文

## Problem

`status` 把每个安装目录都当成本集合的来比对：某个目录带 `SKILL.md`、而 manifest 没有点它的名，就报 unlisted 并以非零退出。于是共用 `.agents/skills/` 的两套集合会互相把对方判红 —— [#63](https://github.com/sunandsunshine-tech/dsh-spec/issues/63) 用「别家目录加一套完整安装」复现了它。把别家的技能写进 `manifest.skills` 不是出路：`install` 与 `upgrade` 会把 manifest 里的每个名字都拿到本仓库解析，外来的名字会让整轮失败，而不是被跳过。

## Proposal

归属看安装器写下的东西，不看网络：`gh skill install` 往每个装好的 `SKILL.md` 注入 `metadata.github-repo`，这个字段记的正是文件来自哪个仓库。`status` 就按它给每个安装目录分类：

- **名字在 `skills` 里** —— 本集合的，照旧与 manager 自己的修订比对。
- **不在 `skills`，`github-repo` 是本集合的仓库** —— 本集合的，但当前修订已不再发布它：一条 finding，`upgrade` 会具名删掉那个目录。
- **没有 `metadata.github-repo`，或指向别的仓库** —— 别家集合装的：一行 `other`，退出码不受影响，因为两套集合并存的项目不该因为别家的技能让本集合的检查失败。项目没有要过的可选技能报为 `absent` —— 那正是这个字段描述的状态，不是问题。

`uninstall` 从另一侧画同一条线：它删整套，或 `--skill <name>` 点名的那一个；名字不在 manifest 里会被拒绝，而不是被跳过。正是这条拒绝让别家集合的目录不被触碰，而且这是代码的性质，不是某次比较的结果。

归属在本地判定。`status` 不联网，这是它原有的契约；分类也不需要访问仓库，因为安装器写下的元数据就在盘上。

## Alternatives considered

**把别家技能写进 `manifest.skills`。** 它败在实测上：`install` 与 `upgrade` 会把 manifest 里的每个名字都拿到本仓库解析，外来的名字会让整轮失败，而不是被跳过；`status` 也只是把一条 finding 换成另一条。

**联网解析归属，按每个技能的来源仓库判定。** 它落败，因为 `status` 的契约就是本地检查、不联网；一次会在飞机上失败的仓库遍历，会把漂移报告变成一次故障。

**不分类，凡是 manifest 没点名的目录都放过。** 它落败，因为两种状态会并成一种：本集合装过、而被当前修订下线的技能会永远留在树里，没有任何东西报告它，也没有任何东西清理它。点出归属，才分得开「放过」与「清掉」。

**用 manifest 而不是 manager 自己安装的那份文件来比对修订。** 它落败，因为 manifest 按设计不声明修订 —— 它随安装好的 manager 一起发布，写在那里的修订是项目无法与自己装到的东西核对的声明 —— 理由由 [manager 自己的安装就是那个 pin](../../implemented/process/2026-09-21-the-manager-s-own-install-is-the-pin.zh.md) 拥有。manifest 也随修订走，说不了项目是从哪里来的。

## Acceptance criteria

- 本集合的安装旁边放着别家集合的目录时，它被报成一行 `other`，且 `status` 退出 0。
- `github-repo` 是本集合、名字却已不在当前修订发布之列的目录，是一条 finding；`upgrade` 具名删掉它。
- [#63](https://github.com/sunandsunshine-tech/dsh-spec/issues/63) 里的复现步骤退出 0。
- 以上每一项都由 `status` 在本地判定，不访问网络。
- `uninstall --skill <name>` 对 manifest 不含的名字以退出码 2 拒绝，且不触碰任何别家集合的目录。
- 项目没有要过的可选技能被报为 `absent`，不会让检查失败。

## Risks

- 分类信任注入的 `metadata.github-repo`，而它只是一个文件里的字段，不是文件系统强制的事实：手写一个声称来自本集合仓库的目录，会被当成本集合的，`upgrade` 会删掉它。
- 在元数据出现之前装上的技能没有 `github-repo`，于是被归为别家集合而放过；那个陈旧目录会一直留着，直到有人手动删掉。
- 名字从 `skills` 里消失而目录还在，会成为一条只有 `upgrade` 能清掉的 finding；从不升级的项目会一直看到它。
