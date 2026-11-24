# Agent Note: 从上游 CI 测试可靠性技能锻造 dsh-spec-ci-test-reliability

Status: implemented

[English](2026-11-20-forging-dsh-spec-ci-test-reliability.md) | 中文

## Problem

技能集合没有处理“单独运行通过，但在 worker 并发、共享主机资源、进程全局修改、平台差异或异步清理下失败”的工作流。面对不稳定测试，Agent 可能在没有确认原因时延长 timeout、增加重试、让整套测试串行或削弱断言。

上游 `dsh-ci-test-reliability` 包含缺失的流程和诊断参考，但它点名单一仓库的测试策略、防御模式文件、测试运行器、CI 提供方、workflow、runner 拓扑和命令选择技能。逐字移植会携带另一个项目的工具链和证据。

## Decision

本包交付 `dsh-spec-ci-test-reliability`，作为面向通用软件工程的技能。它拥有测试隔离、执行拓扑建模、资源分配、进程全局状态约束、平台语义、确定性测试耗时的设计、timeout 预算、状态同步、静止清理、回归证明、不稳定掩盖拒绝规则和只读 flaky 诊断。

快速契约／共享真实资源场景的默认规则位于 `Design the smallest sufficient test`。仅诊断请求只读的规则位于 `Diagnose existing flakes`。执行拓扑章节不再点名任一默认规则，因此每条规则只有一个使用点。

该技能把测试设计与命令选择分开。它先陈述使用项目检查选择实践的通用要求，再点名 `dsh-spec-pre-push-checks`：

`(when available, use the dsh-spec-pre-push-checks skill)`

交付目录包含：

- `SKILL.md` —— 可靠测试流程。
- `references/ci-flake-diagnosis.md` —— 证据与诊断流程。
- `THIRD_PARTY_NOTICES` —— 来源关系以及完整的上游与仓库许可证 notices。

该技能不携带脚本，也没有运行时依赖。其决定依赖采用项目的证据，而不是一个能够判断 readiness、因果所有权或充分复现拓扑的工具。

## Source and revision

上游来源基线于 2026-11-23 读取：

- 仓库：`https://github.com/deepseek-ai/deepseek-harness`
- 基线：`dsh-v0.2.3-alpha.2`（`4b399c39a6d1479cd84ca591b4d7c88e24d38a96`），读取于 2026-11-23
- `.agents/skills/dsh-ci-test-reliability/SKILL.md`
- `.agents/skills/dsh-ci-test-reliability/references/ci-flake-diagnosis.md`

## Settings

- 发布授权：维护者已授权把该技能发布到本包，并创建对应子议题与 pull request。
- 交付语言：英文。
- 触发语言：description 追加中文术语。
- 记录语言：英文，附带中文对侧和配对记录。
- 运行时：没有随包可执行文件；示例使用可移植的操作系统和测试运行器概念。
- 评估：开发场景留在 `skills/` 和 `.agents/skills/` 外，只在使用临时技能副本时放入。

## Target rulings

| # | 决定 | 理由 | 回退方式 |
|---|---|---|---|
| R1 | 目标是任何带自动化测试的软件项目，而不是单一仓库或语言。 | 本包存在的目的就是避免另一个项目的生态和工具链。 | 恢复为单一项目或语言。 |
| R2 | 测试策略、架构和生命周期规则从采用项目的常驻指令（standing instructions）及其点名的文档读取。 | 这些文档才拥有实际约束测试的事实。 | 再次写死来源路径。 |
| R3 | 测试运行器配置、CI workflow、worker 数、job 拓扑和 runner 在影响用例时从项目读取。 | 来源中的 Vitest 和 GitHub Actions 只是实例，不是通用机制。 | 恢复单一测试运行器和 CI 提供方。 |
| R4 | 命令选择与测试设计保持分离。 | 可靠的测试可能搭配不足的出站检查集，而命令选择无法修复不稳定 fixture（测试前置数据）。 | 将命令选择并入本技能。 |
| R5 | 执行拓扑包括用例、文件、worker、独立进程、job 和共享 runner。 | 一个层次的隔离不能保护另一层次共享的资源。 | 无证据地缩小拓扑。 |
| R6 | 获取的资源使用所有者的原子分配器、readiness 信号和静止完成信号。 | check-then-use 分配会与独立使用者竞争。 | 用可用性探测替代原子分配。 |
| R7 | 进程全局值必须区分“原本不存在”，并精确恢复原状态。 | 写入空值或默认值不能恢复不存在的变量或 hook。 | 把所有恢复视为等价。 |
| R8 | 平台拥有的语义是观察结果，而不是精确往返假设。 | 精度、名称大小写、句柄释放和权限因平台而异。 | 用单一平台语义假设所有平台。 |
| R9 | timeout 是点名等待工作的预算，不是同步机制。 | 延长 timeout 可能只是把竞争变慢，没有证明 readiness 或完成。 | 把延长 timeout 当作修复。 |
| R10 | 清理必须等待拥有的完成信号。 | abort、close 或 kill 返回不能证明工作已经停止。 | 把命令返回当作静止。 |
| R11 | 回归需要负向控制和拓扑专属证据。 | 反复运行不能证明重叠，也不能证明目标缺陷会失败。 | 接受重复执行作为充分证据。 |
| R12 | retry 和全局串行化不是默认修复。 | 它们掩盖所有权和拓扑缺陷，并让整套测试承担成本。 | 默认允许掩盖。 |
| R13 | 仅诊断请求保持只读，只分类证据，不改变代码、workflow 或重跑状态。 | 调查权限不包含修复权限。 | 允许诊断触发无关修改。 |
| R14 | 评估清单和 fixture 仅作为开发侧资产。 | 采用者需要运行时指令，而不是本仓库的开发提示和样本失败。 | 把 eval 放入技能交付树。 |
| R15 | 确定性测试耗时是设计反馈：默认采用快速契约用例加上一个共享的昂贵场景，只在结果可能不同的 lane 重复外部工作。 | 更长的 timeout 会保留重复 setup 和过宽覆盖，只会让套件更慢、信息更少。 | 把更大的 timeout 或完整的外部工作矩阵当作默认。 |
| R16 | 交付名称是 `dsh-spec-ci-test-reliability`，在本包命名空间下保留上游 `dsh-ci-test-reliability` 名称。 | 来源与安装后的技能保持可识别，不需要第二套命名词汇。 | 改回偏离上游来源的名称。 |

## Constraint dispositions

`SK` 是上游 `SKILL.md`；`FD` 是 `references/ci-flake-diagnosis.md`。目标位置是 `skills/dsh-spec-ci-test-reliability/` 中对应的小节。

| # | 来源 | 约束 | 处理 | 目标位置 | 依据 |
|---|---|---|---|---|---|
| S0 | `SK:1–8` | 名称、description、标题与范围：真实 CI 拓扑下的可靠测试；隔离属于本技能，命令选择不属于。 | Adapt | 元数据与开头 | 删除来源产品并通用化测试模型。 |
| S1 | `SK:10–16` | 阅读测试层级、生命周期和 CI 拓扑规则；命令选择分开处理。 | Re-bind | Read the owning rules | 绑定到采用项目的声明和检查选择实践。 |
| S2 | `SK:18–29` | 建模文件、worker、进程和共享 runner；识别资源所有者、分配、就绪、清理和完成；不要串行化整套测试。 | Keep | Model the execution topology | 产品名无需修改，规则本身与框架无关。 |
| S3 | `SK:31–41` | 原子分配端口、临时根目录、命名空间和独占路径；区分稳定标识与临时资源。 | Adapt | Allocate resources atomically | 用可移植的分配行为替代来源 API 示例。 |
| S4 | `SK:43–54` | 把进程全局状态视为独占资源；捕获不存在状态，立即恢复，使用有界作用域和 fallback 拦截。 | Adapt | Contain process-global state | 把仅 JavaScript 的标识替换为跨语言等价物，同时保留示例。 |
| S5 | `SK:56–65` | 尊重平台拥有的精度、环境变量名大小写、句柄释放、权限和信号。 | Keep | Respect platform-owned semantics | 通用平台规则可保留。 |
| S6 | `SK:67–73` | 根据 lane 预算 timeout；同时提高 setup 与 teardown；外层等待大于被测 timeout。 | Keep | Budget timeouts against the lane | 通用测试运行器规则。 |
| S6a | 目标要求 | 过长的确定性测试耗时属于测试设计问题，而不是 timeout 预算问题；区分慢工作与快速契约，并运行一个共享的代表性昂贵场景。 | Adapt | Design the smallest sufficient test | 防止延长 timeout 掩盖重复 setup 或过宽矩阵。 |
| S7 | `SK:75–83` | 以 readiness、状态转换、拥有的 promise 和 barrier 同步；timeout 只限制等待；恢复真实时间。 | Adapt | Synchronize on state | 删除 Node/Vitest 词汇，保留规则。 |
| S8 | `SK:85–89` | 获取后立即登记清理，分离所有拥有的资源，并等待静止。 | Keep | Dispose to quiescence | 通用生命周期约定。 |
| S9 | `SK:91–100` | 用失败控制证明目标回归；在相关处证明重叠或跨进程隔离。 | Keep | Prove the intended regression | 通用证据规则。 |
| S10 | `SK:102–116` | 拒绝 timeout、retry、串行化、吞错、弱断言和基于 sleep 的掩盖；保留有界外部提供方重试。 | Keep | Reject flake-masking fixes | 保留明确的外部边界例外。 |
| S11 | `SK:118–120` | 既有 flaky 使用诊断参考；仅诊断保持只读。 | Keep | Diagnose existing flakes | 通用权限边界。 |
| S12 | `SK:122–131` | 用最小聚焦回归和拓扑专属证据验证；只报告观察结果。 | Keep | Validate and report | 通用报告规则。 |
| F0 | `FD:1–11` | 固定修订、workflow 或 job、runner、时间、失败签名和可比较运行；使用 CI 证据。 | Re-bind | Freeze the evidence | 用采用项目的 CI 日志和元数据替代单一 CI 提供方。 |
| F1 | `FD:13–26` | 分别分类资源冲突、生命周期、全局污染、同步、平台、产品并发、外部提供方和 runner 失败。 | Keep | Classify the failure | 类别与产品无关。 |
| F2 | `FD:28–42` | 在最小相关拓扑复现，匹配配置，记录平台限制，并以 barrier 证明竞争。 | Adapt | Reproduce the smallest relevant topology | 用采用项目的运行器和进程替代 Vitest。 |
| F3 | `FD:44–48` | 获得授权后修复分配、readiness、全局状态或 teardown 所有者；把 fixture 数据与资源分配分开。 | Keep | Fix at the owner | 通用所有权规则。 |
| F4 | `FD:50–60` | 只有分类完成、复现或明确限制、负向控制、恢复或清理证据、观察到的检查状态齐全时才结束。 | Adapt | Close the investigation | 用采用项目的 CI 检查状态替代 Actions 状态。 |

## Verification anchors

| # | 要求 | 锚点 | 证据 |
|---|---|---|---|
| A0 | 技能符合 Agent Skills 格式，引用只深一层，description 符合包的目录预算。 | Mechanical | skill-spec gate 通过 14 项检查；`SKILL.md` 为 146 行，description 为 434 字符，正文估计 2,781 tokens。 |
| A1 | 来源的拓扑、资源、全局状态、平台、timeout、同步、清理、回归和掩盖规则都在。 | Judged | 对照 S0–S12 检查 `SKILL.md` |
| A2 | 诊断保留证据、分类、拓扑限制、所有权和只读权限。 | Judged | 对照 F0–F4 检查 `references/ci-flake-diagnosis.md` |
| A3 | 技能不把框架、CI 提供方、来源产品路径或命令写成要求。 | Judged + Mechanical | 人工评审未发现来源产品指称对象；语料的 sibling-reference 门禁通过。 |
| A4 | 推送前关系是可选项，并且只点名机制。 | Mechanical | 语料的 sibling-reference 门禁通过。 |
| A5 | 可运行 fixture 覆盖确定性端口失败、精确全局状态恢复、只读诊断，以及重新设计一个缓慢且重复执行昂贵 setup 的套件。 | Mechanical | 仓库测试运行 fixture 的正向与负向控制，并暂存所有声明输入；四个直接 fixture 入口合计不到一秒。 |
| A6 | 场景上的运行时模型行为。 | 判断 + 机械 | `tests/skill-evals/evidence/2026-11-20-pr116/`、`2026-11-23-pr116/` 与 `2026-11-23-pr121/dsh-spec-test-reliability/` 下的运行均为历史记录修订。隔离诊断与慢套件运行以原名身份通过 10/10 项断言。当前改名改变的是触发面，不是行为指令。 |
| A6a | description 能路由可靠性工作与测试耗时工作，同时不捕获相邻的产品性能、覆盖率、文档或视觉评审任务。 | 判断 + 机械 | 当前对齐名称下，四个正例和四个近邻反例通过稳定 `SELECT:` 标记达到 8/8，证据在 `tests/skill-evals/evidence/2026-11-24-pr126/dsh-spec-ci-test-reliability/trigger-matrix.tsv`。较早探针只作为原 frontmatter 身份的历史证据。 |
| A7 | 安装副本、notices、活跃记录树和翻译配对一致。 | Mechanical | 最终功能套件用桩化语料验证编排约定；真实语料由 `pnpm run check:corpus` 步骤拥有。决策记录、配对、notices、格式、静态与 bundle 检查均通过，此处不再复制进程计数。 |

## Pages read

读取于 2026-11-20：

- `https://agentskills.io/llms.txt`
- `https://agentskills.io/specification.md`
- `https://agentskills.io/skill-creation/best-practices.md`
- `https://agentskills.io/skill-creation/optimizing-descriptions.md`
- `https://agentskills.io/skill-creation/evaluating-skills.md`

## Alternatives considered

**逐字移植上游技能。** 它落败，因为其中的测试运行器、CI 提供方、仓库文件和命令选择机制都是单一项目的实现。

**把测试可靠性并入 pre-push checks。** 它落败，因为可靠性在设计、修改和诊断测试时使用，而命令选择只在准备推送时发生。

**不携带诊断参考。** 它落败，因为主技能会在激活时携带全部证据和复现细节，而上游已经有清晰的按需读取边界。

**增加扫描测试的脚本。** 它落败，因为因果所有权、充分拓扑、因果重叠和证据质量都需要判断，且来源没有提供精确检查器。

**把所有 retry 都视为无效。** 它落败，因为文档化的瞬时外部提供方可以在该边界使用有界重试。该例外比“用 retry 修复本地 flaky”窄。

**把每个 timeout 分组都乘以三。** 它落败，因为耗时本身已经说明存在重复 setup 或过宽的测试层；更大的预算保留了浪费的设计，并让失败更难诊断。

**让诊断隐含修复权限。** 它落败，因为请求范围决定写权限。除非用户也授权修复，诊断只报告证据和交接。

**把 eval 语料放入技能。** 它落败，因为采用者会收到开发提示和样本失败，而不是运行时能力。

## Consequences

- 本包新增一个通用测试设计、评审和 flaky 诊断技能，不依赖测试框架或 CI 提供方。
- 主入口携带运行规则；诊断参考只在已有概率性失败时加载。
- 四个可运行开发场景覆盖核心行为。PR116 与记录的 PR121 重跑保留其原技能身份和历史来源。
- 来源许可证和关系随安装副本一起交付。
- 回退方式是反转实现提交；抽取 submodule 保持不变。
