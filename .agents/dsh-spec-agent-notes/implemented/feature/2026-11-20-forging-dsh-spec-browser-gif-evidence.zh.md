# Agent Note: 锻造 dsh-spec-browser-gif-evidence

Status: implemented

[English](2026-11-20-forging-dsh-spec-browser-gif-evidence.md) | 中文

## Problem

用户可见的浏览器 UI 变更需要评审者能够检查的证据，但单张截图或测试结果无法展示导致结果的操作顺序。DeepSeek Harness 在 `record-browser-gif` 中保存了这项工作流：一次隔离的真实运行、确定性的编码、产物检查和可选的 PR（Pull Request）附件。它的命令、应用路径、凭据提供者策略和所有 GUI PR 都必须附带 GIF 的强制规则属于 DSH；照搬这些文字会让通用采用者的证据声明依赖另一个项目的布局。

## Decision

本包交付 `dsh-spec-browser-gif-evidence`，其目录位于 `skills/dsh-spec-browser-gif-evidence/`。该技能拥有捕获、编码、验证和可选发布；UI 是否可接受仍由 UI 评审工作流判断。用户可见的浏览器 UI 变更默认从采用者真实构建的一次隔离运行生成 GIF 证据。项目可以为具名变更选择等价证据或豁免默认要求。fixture（测试前置数据）只在用户明确要求或项目证据政策选择该形式时存在；mock transport、合成交互和测试专用 hook 需要显式替代政策。

该技能携带一份聚焦的发布参考和生成的 Node bundle `scripts/encode-browser-gif.mjs`；其源码位于 `package/dsh-spec-browser-gif-evidence/`。编码器写入并验证临时的 GIF，只有时长、尺寸、动画和大小检查全部通过后才把它放到输出路径。仓库测试通过生成后的入口执行，留在安装副本之外，并把快速预检与一个共享的真实媒体场景分层。安装副本与落地目录逐字节一致；评估输入保留在 `tests/skill-evals/`，不会进入任一分发树。

## Source and settings

来源仓库：`deepseek-ai/deepseek-harness`。

来源基线：`dsh-v0.2.2-rc.5`（`9c2670d3bce5275e0d1610272958121af87787bb`），读取日期为 2026-11-20。

来源文件：

- `.agents/skills/record-browser-gif/SKILL.md`
- `.agents/skills/record-browser-gif/scripts/encode_gif.py`
- `.agents/skills/record-browser-gif/scripts/test_encode_gif.py`

| 设置 | 值 |
|---|---|
| 名称 | `dsh-spec-browser-gif-evidence` |
| 目标 | 从采用者真实构建的一次隔离运行生成经过验证的浏览器交互 GIF 证据 |
| 边界 | 不判断 UI 设计是否可接受，不选择应评审的 UI 状态，不安装浏览器或媒体工具，也不把证据媒体提交到分支 |
| 交付物 | 技能入口、发布参考、Node 编码器 bundle、notices 和安装副本；仓库测试、Agent Note 配对与开发评估语料位于交付物之外 |
| 受众与语言 | 修改浏览器渲染 UI 的软件团队；英文交付并附中文触发词汇 |
| 运行时 | Node.js 24 系列的 24.11 及以上版本，或 26 及以上版本、Git、`ffmpeg`、`ffprobe`、可运行构建，以及浏览器控制或项目声明的 Playwright fallback |
| 已读评审页面 | Agent Skills index、specification、best practices、evaluating skills 与 using scripts，读取日期 2026-11-20 |

## Source constraints

| 单元 | 位置 | 约束 |
|---|---|---|
| B1 | `SKILL.md` 描述与开头 | 将简短、真实的 UI 演示录制为 GIF；优先使用浏览器控制并确定性编码 |
| B2 | 每个 GUI PR | 产品用户可见的 GUI 变更包含演示 GIF；除非明确要求，否则不得用 fixture 或测试专用行为替代 |
| B3 | 录制条件 | 使用被演示树的真实服务器、真实凭据路径与真实模型流程；报告提交、来源、模式覆盖以及是否运行真实模型轮次 |
| B4 | 分离 | 录制与编码留在本地；发布是独立步骤，只在任务包含 PR 附件时执行 |
| B5 | 准备 | 以全新临时状态和隔离浏览器上下文构建确切提交；一个 storyboard 来自一次运行 |
| B6 | 捕获 | 使用三到六个有意义状态、语义定位器、已验证就绪、稳定 viewport 和一个被演示页面；工具调用证据展示身份、状态、下游结果与瞬时状态 |
| B7 | 安全 | 不得捕获凭据、个人数据、无关标签页或通知 |
| B8 | 编码 | 要求 Python、`ffmpeg` 与 `ffprobe`；验证时长、尺寸、帧数和最大字节数 |
| B9 | 截图 | 视频不可用或用户要求 storyboard 时，捕获顺序稳定、尺寸一致的已确认截图 |
| B10 | 验证 | 检查编码后的 GIF，而非只看源帧；确认可读性、最终保持和敏感内容缺失 |
| B11 | 发布 | 使用附件工作流而不是提交媒体文件；发布前后检查被演示对象的 live head |
| B12 | 拆分产物 | 将超限证据拆成来自同一次运行的连续、不重叠部分 |
| B13 | 既有资产分支 | 早期 DSH PR 媒体存放在仓库专用资产分支 |

## Dispositions

| 单元 | 处置 | 目标 | 依据 |
|---|---|---|---|
| B1 | Keep | 默认、捕获、编码与验证职责 | 要求与提供者无关 |
| B2 | Re-bind | 用户可见浏览器 UI 变更默认生成 GIF 证据；保留项目覆盖与显式 fixture 或替代政策 | 通用强制政策属于 DSH；目标需要可覆盖的默认，同时不得暗中把替代当真实 |
| B3 | Re-bind | 确切提交与树、采用者观察到的真实服务、显式真实或替代说明 | DSH 凭据与模型轮次细节是产品事实 |
| B4 | Keep | 录制留在本地；发布独立且取决于任务 | 远程状态边界与领域无关 |
| B5 | Adapt | 项目声明的构建/启动命令与全新应用、浏览器状态 | DSH 命令与环境名是通用规则的值 |
| B6 | Keep | 短状态序列、语义就绪、稳定尺寸，以及工具调用演示所需的可观察工具身份、状态、下游结果与瞬时状态 | 捕获判断与领域无关 |
| B7 | Keep | 无凭据、个人数据或无关内容 | 安全边界与领域无关 |
| B8 | Adapt | 编码器使用 Node、先写临时输出、编码后验证并原子替换 | 目标的 Node 工具链取代上游的 Python 载体，同时保留其时长、帧、大小和元数据保证 |
| B9 | Keep | 连续视频不可用时使用有序截图与持续时间 | 替代证据形式与领域无关 |
| B10 | Keep | 检查编码输出的可读性、顺序、保持与安全 | 编码器元数据不能建立视觉质量 |
| B11 | Re-bind | 项目发布机制，以 GitHub `gh --attach` 为例子；保留 live-head 检查 | 评审平台与附件命令是采用者事实 |
| B12 | Keep | 来自一次运行的连续、不重叠部分 | 完整性规则与平台无关 |
| B13 | Dissolve | 采用者自己的仓库历史拥有既有媒体；本技能从不修改遗留资产 | DSH 分支名及维护政策不迁移 |

## Rulings

- **默认值取决于能力。** 缺少浏览器、构建、媒体或发布能力时产生明确交接；不得声称已经演示 UI。
- **DSH 的真实模型政策被泛化为真实产品行为。** 录制说明使用真实集成路径、fixture 或其他替代；替代形式需要用户或项目政策的显式选择。
- **UI 是否可接受不是本技能的判断。** 独立 UI 评审工作流决定覆盖与可接受性；本技能生成并验证所请求产物。
- **编码器随技能交付，而不是在运行时重新实现。** 确定性命令提供稳定验证，避免每次在 agent 上下文里重写帧处理逻辑。
- **编码器的开发测试留在仓库侧。** 快速命令与预检用例在常规套件中运行；一个共享的真实媒体场景在 Node 26 上检查视频时序、截图、代表帧顺序和安全替换。安装后的技能不携带维护测试。
- **跳过的媒体测试不构成证据。** 缺少 `ffmpeg` 或 `ffprobe` 时，专用媒体入口会以明确诊断失败，而不是把工具缺失当作通过。

## Verification

| 要求 | 锚点 | 证据 |
|---|---|---|
| Agent Skills 结构、链接与描述预算 | Mechanical | `verify-skill-spec.mjs` |
| 编码器的时序、trim、速度、截图、原子覆盖与大小拒绝 | Mechanical | `tests/browser-gif-encoder.media.ts`：一个共享的真实 WebM/PPM 场景在 Node 26 上使用真实 `ffmpeg` 与 `ffprobe` 运行 |
| 不执行媒体编码时的命令约定与预检失败 | Mechanical | `tests/cli-contract.test.ts` 与 `tests/browser-gif-encoder.test.ts` |
| 能力缺失交接与明确 fixture 披露 | Judged + Mechanical | `tests/skill-evals/evidence/2026-11-20-pr115/` 下的干净上下文运行；candidate、能力缺失和 fixture 运行通过全部 12 项断言 |
| 安装副本与语料门禁 | Mechanical | `skill:refresh`、`check:corpus`、repository-shape tests |
| 既有媒体分支 | Dissolved | 不分发 DSH 资产分支政策 |
| 在真实浏览器中捕获真实 UI | Judged | candidate 运行构建 fixture，通过一个 headless Chrome 会话捕获三个状态，编码并目视检查 GIF，并清理服务器与浏览器 |
| 模型行为与发现质量 | Judged + Mechanical | 三个行为运行通过 12/12 项断言；八条简短触发探针都符合预期的正例或近邻反例结果 |

## Alternatives considered

**逐字复制 DSH 技能与脚本。** 落选，因为 DSH 构建命令、应用路径、模型政策和所有 GUI PR 的强制规则会成为通用项目的错误指令。

**只保留文字工作流。** 落选，因为编码、最终帧时序、大小拒绝与编码后验证是可重复的机械义务，不应在每次运行时重写。

**保留上游 Python 编码器。** 落选，因为本包已经支持和测试 Node 24/26 工具链，交付技能不应为一个编码器增加第二套语言运行时。Node 实现保留媒体检查，并明确临时输出应在验证后才发布。

**让每个 UI 变更无条件生成 GIF。** 落选，因为原生、终端、服务端渲染或非浏览器 UI 需要项目自己的替代证据，而且能力缺失时要求明确交接，而不是伪造要求。

**把 GIF 提交到变更分支。** 落选，因为随后每个克隆都会下载评审媒体；附件把产物留在讨论中，而不是源码历史中。

**把 fixture 录制视为真实流程。** 落选，因为评审者需要知道证据实际证明了什么；fixture 仅在请求并标注时有效。

## Consequences

- 浏览器 UI 变更有来自一次真实构建的默认证据路径。
- 能力缺失时产生明确的未完成交接，而不是静默给出较弱结果。
- 技能随包交付确定性编码器，不增加运行时包；其测试留在仓库侧，不会给采用者增加负担。
- 发布参考足以直接执行，同时不会把 GitHub 变成唯一评审平台。
- 主要成本是环境深度：真实证据仍需要可运行应用、浏览器控制、媒体工具，以及请求发布时的发布访问。
- **回滚：** 删除技能目录与安装副本、Agent Note 配对、评估语料和根 notices 条目。
