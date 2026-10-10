# Terminology

本表约定本项目的中英术语统一译法。它是翻译简报匹配改动片段的依据：每一行都被每一对双语文档的两侧遵守，因此增删或修改一行都是维护者的决定——见 [本目录的常设指令](AGENTS.md)。

**通用规则：**
- "中文"列为中文译文的正文默认用词。若该列为英文，则中文译文的正文中保留英文不翻译。
- 首次出现按"首次出现"列书写（带括号注释）；后续出现只写括号前的部分（可能为中文，也可能为英文），不出现括号内的注释。
- "不要译作"列为严格禁止的译法。
- 如果某术语已经作为另一个术语的组成部分被括注过，则该术语后续单独出现时无需再次括注。
- 本表是成对文档的约束：每一行都是门禁要求两侧共同遵守的决定，因此不影响译者措辞的行不属于本表。

| English | 中文 | 首次出现 | 不要译作 | 备注 |
|---|---|---|---|---|
| AI | AI | AI（人工智能） |  |  |
| API | API |  |  |  |
| CI | CI |  |  |  |
| CLI | CLI | CLI（命令行界面） |  |  |
| e2e | e2e |  |  |  |
| JSON Schema | JSON Schema |  |  |  |
| JSONL | JSONL |  |  |  |
| LLM | LLM | LLM（大语言模型） |  |  |
| SDK | SDK |  |  | 只指受支持的 Python 与 TypeScript SDK 所使用的 JSON-RPC 客户端／服务器协议；DeepSeek Harness 项目本身不是 SDK |
| PR | PR | PR（Pull Request） |  |  |

## 英文类（中英文文本中均使用英文）

| English | 中文 | 首次出现 | 不要译作 | 备注 |
|---|---|---|---|---|
| fixture | fixture | fixture（测试前置数据） |  |  |
| fork | fork |  |  |  |
| worktree | worktree |  |  | git 工作区概念 |
| subagent | subagent |  |  |  |
| harness | harness |  |  |  |
| prompt | 提示词 |  |  |  |
| monorepo | monorepo |  |  |  |
| lint | lint |  |  |  |
| dry run | dry run |  | 试运行、空跑 | `--dry-run` 的模式 |
| half-apply | half-apply |  | 半应用 | 一次操作只做了一半 |
| pin | pin |  | 钉子、钉住、钉定 | 把一个安装固定在某个 ref 上 |
| rebase | rebase |  | 变基 |  |
| release | release |  | 发行版 | 名词；动词「发布」照常用 |
| squash | squash |  | 压缩提交 | 合并 PR 时的提交折叠 |
| tag | tag |  | 标签 | git 的 tag；界面标签不受此限 |

## 双语类（中英文文本各自使用中英文）

| English | 中文 | 首次出现 | 不要译作 | 备注 |
|---|---|---|---|---|
| artifact | 产物 |  | 制品 |  |
| append-only | 仅追加 |  |  |  |
| background job | 后台任务 |  |  |  |
| build target | 构建目标 |  |  |  |
| cancel | 取消 |  |  |  |
| capability | 能力 |  |  | 必须与 `feature` → `功能` 区分 |
| checkpoint | 检查点 |  |  |  |
| composition bundle | 组合包 |  |  | 只约束应用或插件的组合语境，不约束所有 `bundle` |
| consumer | 消费方 |  | 消费者 |  |
| context | 上下文 |  |  |  |
| contract | 约定 |  |  | 如：`pairing contract` →`配对约定` |
| counterpart | 对侧文件 |  | 对应物、配对物 | 双语配对语境；泛指"另一侧"时可写「另一侧」 |
| directory | 目录 |  |  | 命名角色：暴露供发现或选择的条目及元数据 |
| policy | 策略 |  |  | 命名角色：决定允许、选择、限制或观察什么 |
| store | 存储 |  |  | 命名角色：拥有一组数据并主要提供数据操作 |
| block | 块 |  |  |  |
| adapter | 适配器 |  |  |  |
| engine | 引擎 |  |  | 命名角色：实现领域算法或有状态执行模型 |
| handle | 句柄 |  |  | 命名角色：引用并控制或观察一个实时资源 |
| gateway | 网关 |  |  | 命名角色：适配进程、网络、RPC 或 API 边界 |
| resolver | 解析器 |  |  | 命名角色：根据输入计算或定位一个答案 |
| presenter | 展示转换器 |  |  | 命名角色：把领域值纯转换为渲染意图 |
| Agent Note | Agent Note | | 决策记录、代理笔记 | 路径编码的决策记录；中文正文保留英文 |
| gate | 门禁 | | 关卡、检查器 | 退出码非零的机械检查 |
| standing orders | 常驻指令 | 常驻指令（standing orders） | 常设命令 | `AGENTS.md` 承担的每次会话指令 |
| decision record | 决策记录 | | 决议记录 | 见 Agent Note |
| proposal | 提案 | | 建议书 | 尚未实现的决策记录 |
| lifecycle | 生命周期 | | 生命期 | `proposed`/`implemented`/`rejected`/`archived` |
| class | 类别 | | 分类、种类 | 决策记录的路径分类 |
| pairing | 配对 | | 对齐 | 一份文档与其译文构成的一组 |
| paired document | 配对文档 | | 双语文档 | 同时维护两种语言的文件 |
| sidecar | 伴随记录 | 伴随记录（sidecar） | 边车 | `foo.i18n.yaml` 一致性记录 |
| scope | 范围 | | 作用域 | 门禁读取的文档集合 |
| corpus | 语料 | | 文档集 | 一道门禁实际读取的文件集合；空语料使门禁失败 |
| aggregate | 聚合检查 | | 汇总门禁 | `run.ts --all`：manifest 所列的每一道门禁 |
| installed copy | 安装副本 | | 已安装拷贝 | `.agents/skills/` 下的部署产物 |
| skill set | 技能集合 | | 集合、套件 | 本技能集合的自称 |
| refresh | 刷新 | | 更新、同步 | 用 `gh` 把技能集合带到新版本 |
| upgrade | 更新 | | 升级 | CLI 动词:把已安装的技能集合带到新版本;「更新」归它,「刷新」归 refresh |
| extraction | 抽取 | | 提取 | 从源项目得到本技能集合的过程 |
| baseline | 基线 | | 基准 | `submodules/dsh/`，固定的抽取来源 |
| deviation | 偏离 | | 偏差、差异 | 与源项目不同且被记录下来的地方 |
| carrier | 载体 | 载体（carrier） | 载波 | 承载一件事的角色或容器：主线、后台任务、`subagent`、teammate |
| carrier selection | 载体选择 | | | 决定一件事交给哪个载体 |
| carrier policy | 载体策略 | | 载体政策 | |
| cost ladder | 成本阶梯 | | 成本梯 | 本仓库自造词：从主线到后台任务到一个 `subagent` 的载体阶梯 |
| scheduling method | 调度方法 | | | 已授权团队内部把依赖图映到成员槽位的方法 |
| acceptance | 验收 | | 接受 | 它是被通知触发的那一步，不是一次授权 |
| review | 评审 | | 审查、审核 | 仓库维护者在改动转评审之后做的那一步 |
| the review handover | 转评审 | | 评审交接、待评审 | 英文 `handover` 只指这一次：把改动交给仓库维护者评审。三次「之前」的动作是整理，不是交接；合并不叫「交接」 |
| the authorization for the review handover | 转评审授权 | | | 转评审之前必须被问、被回答的那次授权，由仓库维护者回答 |
| the authorization for the merge | 合并授权 | | | 合并之前必须被问、被回答的那次授权，与转评审授权各是一次 |
| the tidy | 整理 | | 清理 | 把分支折成里程碑、让留下的每个提交自带完整状态、并保持 PR 描述最新的那一套操作 |
| the tidy before acceptance | 验收前整理 | | | 三次整理之一 |
| the tidy before review | 评审前整理 | | | 三次整理之一 |
| the tidy before the merge | 合并前整理 | | | 三次整理之一 |
| the driver | 驾驶员 | | 驱动者 | 驱动这次改动的人；开发完成并整理好之后，agent 通知他去验收 |
| the implementer | 实现者 | | 实施者 | 实现这次改动、并在草稿状态验收它的人 |
| the repository maintainer | 仓库维护者 | | 维护人员 | 转评审与合并保留给他；那两次授权都由他回答 |
| notifying the driver to accept | 通知验收 | | 通知接受 | 会话内的一条通知，不是授权；句子里需要点名时写「通知驾驶员验收」 |
| append-only between tidies | 两次整理之间只追加 | | | fixup 只以新提交叠上去，不重写已推的历史；`append-only` 单用仍是「仅追加」 |
