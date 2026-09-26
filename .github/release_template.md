<!--
The shape a release notes document takes. Keep the structure; each comment says what its part owes a
reader, and a comment is deleted once its part is written.

Two sides in one document: the switcher first, then the Chinese side under its own anchor, then the
English side under its own. Each side names its categories as level-3 headings and lists one bullet
per user-visible change, attributed to the person who made it. Replace every `<tag>` and `<prev>`
with the real values — the switcher and the anchors share the same placeholder, so they are replaced
together — and delete a category heading that has no entries. Nothing loads this file
automatically; whoever creates the release fills it in and passes it as the release body.
-->

[中文](#cn-<tag>) | [English](#en-<tag>)

<h3 id="cn-<tag>">新增功能</h3>

<!-- 一条一行,按读者关心的顺序排;句末署上做这件事的人,如 @name。 -->

### 体验优化

<!-- 既有行为变好,而不是新能力。 -->

### 问题修复

<!-- 每条说清修好了什么现象;只看这一行的人应当知道原来错在哪。 -->

### 其他变更

<!-- 依赖、配置、破坏性变更与迁移步骤;有代价的把代价写清。 -->

### 相关 issue 与 PR

<!-- 这次发布关闭的 issue 与合并的 PR;一条一行,链接指向 GitHub。 -->

<h3 id="en-<tag>">New Features</h3>

<!-- One line per change, ordered by what a reader cares about; end it with `by @name`. -->

### Improvements

<!-- Existing behaviour made better, rather than a new capability. -->

### Bug Fixes

<!-- Say what was wrong, not only what is right now. -->

### Chores

<!-- Dependencies, configuration, breaking changes and migration steps; state the cost where there is one. -->

### Related Issues and PRs

<!-- Issues closed and pull requests merged by this release; one line each, linked on GitHub. -->

Full Changelog: [<prev>...<tag>](https://github.com/sunandsunshine-tech/dsh-spec/compare/<prev>...<tag>)
