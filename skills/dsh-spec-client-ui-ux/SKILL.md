---
name: dsh-spec-client-ui-ux
description: "Review project-local browser UI changes with rendered evidence: affected states, consumers, responsive constraints, and disclosed gaps. Use before implementing or reviewing layout, interaction, accessibility-sensitive, theme, or responsive changes. Not for review-excluded source-only refactors, visual-direction generation, a general design-system audit, or replacing project UI policy. 用于在实现或评审项目内浏览器渲染 UI 的布局、交互、无障碍状态、主题或响应式变更前后，检查受影响状态、组件消费方、响应式约束并披露缺口；不用于排除渲染评审的仅源码重构、视觉方向生成、通用设计系统审计或替代项目 UI 策略。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
compatibility: "Requires a way to run and inspect the affected browser-rendered UI, or an explicit handoff when that capability is unavailable. Recording evidence additionally requires the project's selected capture mechanism."
---

# Web UI change review

Review the project's actual browser UI, not an isolated component or an imagined rendering. This skill owns the affected-scope analysis, rendered-result checks, evidence requirement and honest report. The adopting project owns its visual system, component APIs, supported browsers, approval policy, capture mechanism, and exact acceptance values.

## Defaults

Apply this skill's use-site default only when neither the request nor existing project instructions choose one. Treat existing instructions as authoritative read-only input; do not ask for, create, modify, or copy instructions merely to select a default.

## Establish scope and authority

Read the project's standing instructions and the design, component, localization, accessibility, and testing documents they name. Read the changed UI source and enough surrounding layout to understand the assembled surface.

Before judging quality, establish:

- the user-visible behavior the change is meant to produce;
- every directly changed element and its nearest layout peers;
- the states the change can affect, including loading, empty, error, disabled, selected, expanded, focused, and overlapping states;
- the supported themes, widths, input modes, locales, and text lengths that can exercise the changed behavior;
- the potential consumers of a shared-component or global-style change;
- the project's own command for running the UI and the evidence its review policy requires.

When the project declares no visual acceptance rule, inspect the rendered result against the requested behavior, the documented system, and the nearest truthful comparison. Record that the visual policy was absent. When claimed acceptance requires a review or sign-off policy and the project declares none, report that approval gap; do not invent an approver or approval rule.

## Scale inspection to impact

Use the smallest inspection that can establish the changed behavior.

| Change | Required inspection |
|---|---|
| Local copy, icon, color, or spacing | Inspect the actual affected page, its neighbors, and the states touched by the change. Use the project-selected test evidence without repeating another workflow's checks. |
| Layout, shared component, or global style | Trace affected consumers and inspect distinct assembled layouts and states that can inherit the change. |
| Requested comprehensive review | Cover the agreed regions and relevant states. Report inspected results, defects, and uninspected scope separately. |

Do not require a fixed screenshot count, every width-by-theme combination, or a full audit record for an ordinary local change. A shared change still needs consumer evidence even when one rendered example looks correct.

## Minimum rendered checks

Inspect the running application or equally valid assembled rendered evidence in context.

- **Color, opacity, or theme:** inspect affected foreground, background, and state pairs in the themes the project supports.
- **Layout, spacing, typography, or sizing:** inspect a constrained container and long or wrapping content; check both sides of an affected breakpoint, alignment, clipping, scrolling, and access to actions. Name the aligned objects and axes, both gap endpoints including padding, borders and line boxes, and the project's spacing owner.
- **Interaction:** exercise the changed path and every affected focus, disabled, loading, error, expanded, selection, pressed, and overlapping state. Use the project's existing components, containers, and interactions when they can carry the behavior.
- **Shared components or global styles:** trace affected consumers and inspect representative consumers in their assembled layouts rather than one isolated story.
- **Responsive and pointer behavior:** inspect the project's supported narrow viewport and the adjacent layout transition. Preserve in-progress drafts, focus, primary actions, readable content, touch reach, and keyboard access. Prefer reflow before truncation, icon collapse, or moving actions; do not hide conflicts with global clipping, reduced type sizes, or shrunken targets. Hover-only actions must remain available on devices that cannot hover; hovering must not leave touch-only residue. Adapt to observed pointer and input capabilities rather than a guessed device class.
- **Text and localization:** use realistic long, translated, and user-provided content. User-visible copy stays owned by the project's locale and prose mechanism. Treat wrapping, truncation, missing error text, and inaccessible content as behavior defects. Content removed by truncation must remain available through a project-owned secondary view or menu, and important content that has no such view must remain fully visible.
- **Icons and touch help:** reuse the project's existing artwork, tokens, treatments, and components before adding another system. Distinguish click target, painted base, icon slot, and painted glyph, and compare related controls at their intended size with shared foreground color and effective opacity, plus the states the change affects. An ordinary reuse or placement change needs no fixed size or DPR matrix, but it must not change the declared stroke/fill contract; filled contours retain that geometry. When artwork, strokes, or rendering changes, inspect the project's declared rendering contract at the target CSS size and the supported device-pixel ratios, and check every affected consumer. An icon-only action needs an understandable affordance, visible help or tooltip, and an accessible name; help that depends on hover must also remain reachable by touch or disappear when it carries no needed information.
- **Feedback and loading:** use a feedback surface that survives the operation it reports; retain affected content after a failed operation; keep one loading treatment per page or region.
- **Overlays, menus, and scrolling:** verify dismissal, viewport fit, clipping, scroll ownership, keyboard access, focus behavior, and coverage by neighboring surfaces where those mechanisms exist. Scrollbars stay inside their containers and are not clipped by rounded edges.
- **Component geometry:** inspect role, size, radius, inset, borders, and nested contours as one relationship; keep fills, strokes, and overlays stable across affected states.
- **Focus and input adaptation:** when width or pointer capability changes, preserve focus on controls that remain usable. If a focused control disappears, move focus to a suitable remaining control without opening a software keyboard unless that is intended for the user's next task. Preserve the project's declared mobile text-input sizing and zoom behavior; when it declares none, keep coarse-pointer text inputs at least 16 CSS pixels so focusing them does not trigger automatic zoom.
- **Platform chrome:** where the project supports platform-specific window or input behavior, inspect it in the affected host surface, including the combined frame clearance and page inset.
- **State authenticity:** verify that a claimed focus, hover, pressed, selected, expanded, loading, disabled, or touch state came from the real interaction or state mechanism. A forced class, data attribute, debug overlay, or copied style that only imitates the state is not evidence of that state.

Use the project's required test evidence; when it has not run, select it through the project's check workflow (when available, use the `dsh-spec-pre-push-checks` skill). Source inspection and passing tests establish neither the rendered result nor visual acceptance. Reuse valid evidence when the build, viewport, data, theme, and state remain equivalent.

## Trace every affected consumer

For a shared component, token, global style, hook, or copied pattern, search for current consumers and trace the rendered path each one supplies. Include conditional variants, composition wrappers, feature flags, and generated outputs that the project uses.

One consumer does not establish the coverage of a shared change. Conversely, do not demand every historical fixture when the change cannot affect it. State the affected consumer set, the consumers inspected, and any consumer that remains unverified.

## Record browser evidence by default

A user-visible browser UI behavior change produces truthful recorded evidence by default. The evidence must represent one coherent run of the changed build and must not combine frames or state roots from separate runs. The selected evidence mechanism owns capture, isolation, frame retention and encoding mechanics.

The project may declare screenshots, video, a labeled component fixture, or another equivalent evidence form. A screenshot pair records two settled states, not a transition. A labeled component fixture records only what it renders and is controlled evidence, not an assembled-application pass when the change reaches application layout or consumers.

When the required rendered scene or recording capability is unavailable, report the missing scene or capability, why it is unavailable, what evidence was completed, and a concrete resumable action naming the environment, scene, or artifact to supply next. Do not claim visual completion from source inspection, unit tests, or a fixture that does not cover the change.

## Preserve the comparison

When the review needs before-and-after evidence, preserve the actual starting implementation, including uncommitted work. Capture comparable viewports, data, theme, and state. Never recreate a missing starting image and present it as an original.

Inspect the encoded or final evidence, not only the source frames. Confirm that it shows the intended transition, the settled state, and no sensitive content. Evidence produced from another commit or another application state proves only that state.

## Report the result

Report:

- the inspected user-visible behavior;
- the surfaces, consumers, states, themes, widths, and input modes inspected;
- defects with the evidence that demonstrates them;
- the rendered evidence produced or reused;
- the scenes, consumers, or states not inspected and why;
- the project checks run and their results.

Do not call a partial review complete, a fixture an application pass, or a green test suite visual acceptance.

## Boundaries

This skill does not choose the product's visual identity, generate alternative art directions, maintain a style or palette catalog, replace a general web-guidelines audit, implement a media encoder or publisher, or make unrelated UI changes. Within an authorized implementation task, apply the same inspection and evidence requirements after editing.
