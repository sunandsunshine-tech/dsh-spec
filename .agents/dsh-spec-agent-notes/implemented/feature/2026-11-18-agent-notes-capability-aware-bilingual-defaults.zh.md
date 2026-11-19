# Agent Note: Agent Notes 在封印前选择自适应单元

Status: implemented

[English](2026-11-18-agent-notes-capability-aware-bilingual-defaults.md) | 中文

## 问题

Agent Notes 曾把翻译伴随文件视为可选，Translate Docs 也只允许项目常驻指令或用户显式请求授权新建配对。因此，已经启用翻译机制的项目若没有另一份声明，就无法完成新笔记。缺少能力与翻译失败还会产生相同结果，而封印还可能冻结未完成单元。

## 决策

笔记是一个单元中的源成员。单元还包含外部机制分配给它的全部 companion。同 stem 后缀与精确的 source-to-companion 路径映射都能声明成员关系，包括不同 stem 或类别目录下的嵌套路径。该机制决定成员关系，并拥有 companion 的名称、格式、记录与一致性检查；Agent Notes 拥有已声明单元的组成维护、移动、封印与冻结。Agent Notes 不假设翻译语法，也不假设使用哪一个翻译技能。

对于新笔记或首次封印单元，负责的模型按以下顺序解析翻译目标组：

1. 当前请求中的显式选择。
2. 现有持久项目指令。
3. 同一 owner 定义类别中完整 pair 的一致目标组。
4. 与源语言不同时，主 agent 的用户语言。
5. 不选择翻译目标。

可比文件、项目证据和用户语言由模型判断；脚本接收显式的 companion 与 readiness 事实。显式目标组可以包含多种语言。证据缺失、同类目标组冲突、机制不可用或用户语言未知时，不选择翻译目标，也不询问默认值。仅安装机制不会启用它，也不会使它可用。

目标迁移按成本处理。新增目标采用渐进式：新笔记使用当前目标组，被修改的笔记补齐缺少的目标，未修改的笔记不变。删除目标会清理全部符合条件的活跃与未封印单元；已封印单元不变。范围操作只检查或重录既有单元，不要求缺失目标。

被选中的 companion 工作属于该单元。翻译、术语或一致性失败会让单元保持未完成，报告源文件、目标语言、失败步骤与可继续的下一步，且绝不将其变成 English-only。

封印具有独立的 readiness 边界。`archive --prepare` 在不写 manifest 的前提下确定准确的 unit 成员、哈希与 owner 检查。工作流完成这些检查后，`archive --write --expect-plan <plan>` 只为未变化的已准备单元且仅在 readiness 成功后封印。将单元移动到 `archived/` 不是冻结；写入 manifest 才是。封印前，选中的翻译在笔记仍活跃时完成，随后移动单元、写入一致的归档元数据、重录既有 companion 并运行 readiness。封印后，其字节与成员永不改变。

Translate Docs 接受对文档范围负责的工作流作为第三种通用授权来源。显式目标组可以包含多个目标；只有推断默认目标时才要求无歧义。该规则既不点名 Agent Notes，也不导入其 unit 或 archive API。模型依据两份通用契约组合技能，因此任一技能都能独立安装并完成基础路径。

[独立技能通过工作流判断组合](../architecture/2026-11-19-independent-skills-compose-through-workflow-judgment.zh.md)拥有组合边界；本笔记拥有具体默认值与 unit 生命周期。[Agent Notes 锻造记录](../process/2026-10-27-forging-dsh-spec-agent-notes.zh.md)与 [Translate Docs 锻造记录](../process/2026-10-28-forging-dsh-spec-translate-docs.zh.md)继续拥有各自的机制。本笔记部分取代它们此前的 English-only 创建默认值、「仅用户或声明可授权」边界、唯一目标授权与仅在封印时检查完整性的模型。

## 验证

| 要求 | 证据 |
|---|---|
| 五步默认、多目标、渐进新增与强一致删除规则仍留在使用位置 | `node --test tests/skill-defaults.test.ts` |
| 单元成员关系、显式目标组与独立安装由确定性套件覆盖 | `node --test tests/agent-notes.test.ts tests/translation-docs.test.ts` |
| prepare/plan 过期、owner readiness 失败与成功守卫式封印通过真实归档 CLI 覆盖 | `node --test tests/agent-notes.test.ts` |
| 开发语料覆盖同类发现、用户语言回退、渐进新增、强一致删除、外部 companion 机制及两种独立安装配置 | `node --test tests/skill-scenarios.test.ts` 与一次干净上下文评估报告 |
| 两个改动技能仍通过规格检查 | `node skills/dsh-spec-skill-forge/scripts/verify-skill-spec.mjs <changed-skill-dir>` |
| 语料、安装副本、笔记与翻译记录保持一致 | `pnpm run check:corpus` |

## 曾考虑的替代方案

**采用固定的双语默认值。** 它能保证伴随文件存在，但缺少翻译机制的项目无法完成，English-only 项目也会被迫依赖一项它没有启用的能力。

**让 Translate Docs 成为 Agent Notes 的硬依赖。** 它能连接两条路径，但任一技能都会失去独立安装与完成路径。

**把一致性记录机制复制进 Agent Notes。** 它能让一个技能保持自包含，却会重复 Translate Docs 的记录格式与检查，并为同一配对制造两个所有者。

**让 CLI 推断同类目标或用户语言。** 它会让默认值看似确定，但可比文档与主 agent 的用户语言都是开放上下文，CLI 无法可靠恢复。模型解析它们，并传入显式目标。

**把已安装的翻译技能视为已启用。** 它不要求项目数据，却会改变每个安装该技能的项目中的全部新笔记，包括从未启用翻译的项目。

**为全部既有笔记新增目标。** 它得到强一致，但每个文档都应翻译，翻译成本真实存在。渐进新增让无关的历史工作保持不变。

**让目标删除也保持渐进。** 删除目标只需文件与记录清理，保留过期活跃目标会用无名迁移负担换取本不存在的节省。

**只保留 English-only 作为创建默认值。** 它保持零迁移和项目中立，但已启用的项目仍需另写声明，之后新笔记才能使用翻译机制。

**保持一个全局唯一目标。** 它无法表示显式多语言单元或同类的一致多目标组，也与客户端支持重复目标的事实冲突。

**仅靠模型在 `archive --write` 前自检。** 它让最终状态可见，却不能证明检查过的字节就是被封印的字节。哈希绑定的准备计划与通用 readiness 命令为不可逆步骤提供机械边界。

**翻译失败后回退到 English-only。** 它会产出一个文件，却掩盖已选单元尚未完成，还可能封印一个与其选定组成不一致的归档单元。

## 后果

- 没有可用翻译机制的项目继续生成不含翻译伴随文件的笔记，且无需修改 `AGENTS.md`。其他已声明伴随文件仍可使用。
- 已启用项目获得由请求、项目政策、同类完整 pair 或主 agent 用户语言选出的目标组。
- 多目标组被显式表达；脚本不猜测它们。
- 新增目标在创建或后续编辑时传播；删除目标清理活跃单元。已封印单元永不改变。
- 翻译失败成为一次显式交接，不再被表示为成功的 English-only 结果。
- 封印区分 prepare、owner readiness 与受守卫的 write；改变或失败的单元不能进入 manifest。
- 两个技能仍可独立安装，并通过模型判断而非共享私有 API 进行组合。
