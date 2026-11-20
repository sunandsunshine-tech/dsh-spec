# Agent Note: 锻造 dsh-spec-browser-gif-evidence

Status: implemented

[English](2026-11-20-forging-dsh-spec-browser-gif-evidence.md) | 中文

## Problem

用户可见的浏览器 UI 变更需要评审者能够检查的证据，但单张截图或测试结果无法展示导致结果的操作顺序。DeepSeek Harness 在 `record-browser-gif` 中保存了这项工作流：一次隔离的真实运行、确定性的编码、产物检查和可选的拉取请求附件。它的命令、应用路径、凭据提供者策略和所有 GUI PR 必须具备 GIF 的强制规则属于 DSH；逐字搬运会让通用采用者的证据声明依赖另一个项目的布局。

## Decision

本包从 `skills/dsh-spec-browser-gif-evidence/` 交付 `dsh-spec-browser-gif-evidence`。该技能拥有捕获、编码、验证和可选发布；UI 是否可接受仍由 UI 审查工作流判断。用户可见的浏览器 UI 变更默认从采用者真实构建的一次隔离运行生成 GIF 证据。项目可以为具名变更选择等价证据或豁免默认要求；fixture 录制只在用户明确要求时存在。

该技能携带一份聚焦的发布参考与两个 Python 脚本：`encode_gif.py` 执行确定性编码和编码后媒体检查，`test_encode_gif.py` 通过真实 `ffmpeg` 与 `ffprobe` 执行编码器测试。安装副本与落地目录逐字节一致；评估输入保留在 `tests/skill-evals/`，不会进入任一分发树。

## Source and settings

来源仓库：`deepseek-ai/deepseek-harness`。

读取的来源修订：`2e39e70496aa02986ca6a820c5d497e816b69d7e`，读取日期为 2026-11-20。三个来源文件在仓库基线 `dsh-v0.2.2-rc.1`（`66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`）上逐字节相同。

来源文件：

- `.agents/skills/record-browser-gif/SKILL.md`
- `.agents/skills/record-browser-gif/scripts/encode_gif.py`
- `.agents/skills/record-browser-gif/scripts/test_encode_gif.py`

| 设置 | 值 |
|---|---|
| 名称 | `dsh-spec-browser-gif-evidence` |
| 目标 | 从采用者真实构建的一次隔离运行生成经过验证的浏览器交互 GIF 证据 |
| 边界 | 不判断 UI 设计是否可接受，不选择应审查的 UI 状态，不安装浏览器或媒体工具，不把证据媒体提交到分支 |
| 交付物 | 技能入口、发布参考、编码器、编码器测试、通知、安装副本、Agent Note 单元与开发评估语料 |
| 受众与语言 | 修改浏览器渲染 UI 的软件团队；英文交付并附中文触发词汇 |
| 运行时 | Python 3、`ffmpeg`、`ffprobe`、可运行构建，以及浏览器控制或项目声明的 Playwright fallback |
| 已读评审页面 | Agent Skills index、specification、best practices、evaluating skills 与 using scripts，读取日期 2026-11-20 |

## Source constraints

| 单元 | 位置 | 约束 |
|---|---|---|
| B1 | `SKILL.md` 描述与开头 | 将简短、真实的 UI 演示录制为 GIF；优先使用浏览器控制并确定性编码 |
| B2 | 每个 GUI 拉取请求 | 产品用户可见的 GUI 变更包含演示 GIF；除非明确要求，否则不得用 fixture 或测试专用行为替代 |
| B3 | 录制条件 | 使用被演示树的真实服务器、真实凭据路径与真实模型流程；报告提交、来源、模式覆盖以及是否运行真实模型轮次 |
| B4 | 分离 | 录制与编码留在本地；发布是独立步骤，只在任务包含拉取请求附件时执行 |
| B5 | 准备 | 以全新临时状态和隔离浏览器上下文构建确切提交；一个 storyboard 来自一次运行 |
| B6 | 捕获 | 使用三到六个有意义状态、语义定位器、已验证就绪、稳定 viewport 和一个被演示页面 |
| B7 | 安全 | 捕获不得包含凭据、个人数据、无关标签页或通知 |
| B8 | 编码 | 要求 Python、`ffmpeg` 与 `ffprobe`；验证时长、尺寸、帧数和最大字节数 |
| B9 | 截图 | 视频不可用或用户要求 storyboard 时，捕获顺序稳定、尺寸一致的已确认截图 |
| B10 | 验证 | 检查编码后的 GIF，而非只看源帧；确认可读性、最终保持和敏感内容缺失 |
| B11 | 发布 | 使用附件工作流而不是提交媒体文件；发布前后检查被演示对象的 live head |
| B12 | 拆分产物 | 将超限证据拆成来自同一次运行的连续、不重叠部分 |
| B13 | 既有资产分支 | 早期 DSH 拉取请求媒体存放在仓库专用资产分支 |

## Dispositions

| 单元 | 处置 | 目标 | 依据 |
|---|---|---|---|
| B1 | Keep | 默认、捕获、编码与验证职责 | 要求与提供者无关 |
| B2 | Re-bind | 用户可见浏览器 UI 变更默认生成 GIF 证据；保留项目覆盖与明确 fixture 请求 | 通用强制政策属于 DSH；目标需要可覆盖的默认 |
| B3 | Re-bind | 确切提交与树、采用者观察到的真实服务、显式真实或替代说明 | DSH 凭据与模型轮次细节是产品事实 |
| B4 | Keep | 录制留在本地；发布独立且取决于任务 | 远程状态边界与领域无关 |
| B5 | Adapt | 项目声明的构建/启动命令与全新应用、浏览器状态 | DSH 命令与环境名是通用规则的值 |
| B6 | Keep | 短状态序列、语义就绪与稳定尺寸 | 捕获判断与领域无关 |
| B7 | Keep | 无凭据、个人数据或无关内容 | 安全边界与领域无关 |
| B8 | Keep | 确定性编码器与已校验元数据上限 | 随包脚本提供精确机制 |
| B9 | Keep | 视频不可用时使用有序截图与持续时间 | 替代证据形式与领域无关 |
| B10 | Keep | 检查编码输出的可读性、顺序、保持与安全 | 编码器元数据不能建立视觉质量 |
| B11 | Re-bind | 项目发布机制，以 GitHub `gh --attach` 为例子；保留 live-head 检查 | 评审平台与附件命令是采用者事实 |
| B12 | Keep | 来自一次运行的连续、不重叠部分 | 完整性规则与平台无关 |
| B13 | Dissolve | 采用者自己的仓库历史拥有既有媒体；本技能从不修改遗留资产 | DSH 分支名及维护政策不迁移 |

## Rulings

- **默认值取决于能力。** 缺少浏览器、构建、媒体或发布能力时产生明确交接；不得声称已经演示 UI。
- **DSH 的真实模型政策被泛化为真实产品行为。** 录制说明使用真实集成路径、fixture 或其他替代；fixture 仅在明确请求时允许。
- **UI 是否可接受不是本技能的判断。** 独立 UI 审查工作流决定覆盖与可接受性；本技能生成并验证所请求产物。
- **编码器随包交付而非运行时重建。** 确定性命令提供稳定验证，避免每次在 agent 上下文里重写帧处理逻辑。
- **Python 测试与编码器相邻。** 它们需要真实媒体工具；工具缺失时不属于常规 CI。

## Verification

| 要求 | 锚点 | 证据 |
|---|---|---|
| Agent Skills 结构、链接与描述预算 | Mechanical | `verify-skill-spec.mjs` |
| 编码器 trim、速度、截图、覆盖与尺寸拒绝 | Mechanical | 使用 `ffmpeg` 与 `ffprobe` 的 Python unittest |
| 能力缺失交接与明确 fixture 披露 | Judged | 开发评估语料 |
| 安装副本与语料门禁 | Mechanical | `skill:refresh`、`check:corpus`、repository-shape tests |
| 既有媒体分支 | Dissolved | 不分发 DSH 资产分支政策 |
| 真实浏览器 UI 捕获 | Unverified by local CI | 当前 checkout 没有浏览器应用或媒体工具；由采用者提供 |
| 模型行为与发现质量 | Unverified | 本提交未附模型评估运行 |

## Alternatives considered

**逐字复制 DSH 技能与脚本。** 落选，因为 DSH 构建命令、应用路径、模型政策和所有 GUI PR 的强制规则会成为通用项目的错误指令。

**只保留文字工作流。** 落选，因为编码、最终帧时序、大小拒绝与编码后验证是可重复的机械义务，不应在每次运行时重写。

**让每个 UI 变更无条件生成 GIF。** 落选，因为原生、终端、服务端渲染或非浏览器 UI 需要项目自己的替代证据，而且能力缺失时要求明确交接，而不是伪造要求。

**把 GIF 提交到变更分支。** 落选，因为随后每个克隆都会下载评审媒体；附件把产物留在讨论中，而不是源码历史中。

**把 fixture 录制视为真实流程。** 落选，因为评审者需要知道证据实际证明了什么；fixture 仅在请求并标注时有效。

## Consequences

- 浏览器 UI 变更有来自一次真实构建的默认证据路径。
- 能力缺失时产生明确的未完成交接，而不是静默给出较弱结果。
- 技能随包提供确定性编码器与测试，不增加运行时包。
- 发布参考足以执行，同时不会把 GitHub 变成唯一评审平台。
- 主要成本是环境深度：真实证据仍需要可运行应用、浏览器控制、媒体工具，以及请求发布时的发布访问。
- **回滚：** 删除技能目录与安装镜像、Agent Note 单元、评估语料和根通知条目。
- **发布授权：** 变更准备进入堆叠拉取请求；发布与合并需要维护者授权。
