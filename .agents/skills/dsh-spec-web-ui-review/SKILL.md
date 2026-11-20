---
name: dsh-spec-web-ui-review
description: "Review project-local browser UI changes with rendered evidence: affected states, consumers, responsive constraints, and disclosed gaps. Use before implementing or reviewing layout, interaction, accessibility-sensitive, theme, or responsive changes. Not for visual-direction generation, a general design-system audit, or replacing project UI policy. 用于审查浏览器 UI 变更的受影响状态、组件消费者、响应式约束与未验证范围；不用于视觉方向生成、通用设计系统审计或替代项目 UI 策略。"
license: "MIT; upstream and repository notices in THIRD_PARTY_NOTICES"
compatibility: "Requires a way to run and inspect the affected browser-rendered UI, or an explicit handoff when that capability is unavailable. Recording evidence additionally requires the project's selected capture mechanism."
---

# Web UI change review

Review the project's actual browser UI, not an isolated component or an imagined rendering. This skill owns the affected-scope analysis, rendered-result checks, evidence requirement and honest report. The adopting project owns its visual system, component APIs, supported browsers, approval policy, capture mechanism, and exact acceptance values.

## Defaults

A default is the value or strategy this skill declares at its use site. It applies when the current request and existing project instructions leave that choice open. A user turn or explicit parameter supplies a one-off value. Existing project instructions supply a persistent override and are read without being modified or copied. Missing project instructions are valid, so do not ask the user to choose a default or create or modify an instruction file merely to select one.

## Establish scope and authority

Read the project's standing instructions and the design, component, localization, accessibility, and testing documents they name. Read the changed UI source and enough surrounding layout to understand the assembled surface.

Before judging quality, establish:

- the user-visible behavior the change is meant to produce;
- every directly changed element and its nearest layout peers;
- the states the change can affect, including loading, empty, error, disabled, selected, expanded, focused, and overlapping states;
- the supported themes, widths, input modes, locales, and text lengths that can exercise the changed behavior;
- every component consumer that can inherit a shared-component or global-style change;
- the project's own command for running the UI and the evidence its review policy requires.

When the project declares no visual acceptance rule, inspect the rendered result against the requested behavior, the documented system, and the nearest truthful comparison. Record that the visual policy was absent.

## Scale inspection to impact

Use the smallest inspection that can establish the changed behavior.

| Change | Required inspection |
|---|---|
| Local copy, icon, color, or spacing | Inspect the actual affected page, its neighbors, and the states touched by the change. Run the owning tests. |
| Layout, shared component, or global style | Trace affected consumers and inspect distinct assembled layouts and states that can inherit the change. |
| Requested comprehensive review | Cover the agreed regions and relevant states. Report inspected results, defects, and uninspected scope separately. |

Do not require a fixed screenshot count, every width-by-theme combination, or a full audit record for an ordinary local change. A shared change still needs consumer evidence even when one rendered example looks correct.

## Minimum rendered checks

Open the running application and inspect the change in context.

- **Color, opacity, or theme:** inspect affected foreground, background, and state pairs in the themes the project supports.
- **Layout, spacing, typography, or sizing:** inspect a constrained container and long or wrapping content; check both sides of an affected breakpoint, alignment, clipping, and access to actions.
- **Interaction:** exercise the changed path and every affected focus, disabled, loading, error, expanded, selection, and overlapping state.
- **Shared components or global styles:** inspect representative consumers in their assembled layouts rather than one isolated story.
- **Responsive behavior:** inspect the project's supported narrow viewport and the adjacent layout transition. Preserve focus, primary actions, readable content, and reachable controls.
- **Text and localization:** use realistic long, translated, and user-provided content. Treat wrapping, truncation, missing error text, and inaccessible content as behavior defects.
- **Feedback and loading:** use a feedback surface that survives the operation it reports; retain affected content after a failed operation; keep one loading treatment per page or region.
- **Overlays and menus:** verify dismissal, viewport fit, clipping, keyboard access, focus behavior, and coverage by neighboring surfaces where those mechanisms exist.
- **Component geometry:** inspect role, size, radius, inset, borders, and nested contours as one relationship; keep fills, strokes, and overlays stable across affected states.
- **Icons and platform chrome:** reuse existing meaningful artwork before drawing a new glyph. Where the project supports platform-specific window or input behavior, inspect it in the affected host surface.

Source inspection and passing tests establish neither the rendered result nor visual acceptance. Reuse valid evidence when the build, viewport, data, theme, and state remain equivalent.

## Trace every affected consumer

For a shared component, token, global style, hook, or copied pattern, search for current consumers and trace the rendered path each one supplies. Include conditional variants, composition wrappers, feature flags, and generated outputs that the project uses.

One consumer does not establish the coverage of a shared change. Conversely, do not demand every historical fixture when the change cannot affect it. State the affected consumer set, the consumers inspected, and any consumer that remains unverified.

## Record browser evidence by default

A user-visible browser UI behavior change produces recorded browser evidence by default. Record one demonstration from a single isolated run of the changed build. Do not combine frames or state roots from separate runs.

The project may declare screenshots, video, a labeled component fixture, or another equivalent evidence form. A screenshot pair records two settled states, not a transition. A labeled component fixture records only what it renders and is controlled evidence, not an assembled-application pass when the change reaches application layout or consumers.

When the required rendered scene or recording capability is unavailable, report the missing scene or capability, why it is unavailable, what evidence was completed, and how the remaining verification can resume. Do not claim visual completion from source inspection, unit tests, or a fixture that does not cover the change. Capture, encoding, encoding validation and publication mechanics belong to the selected evidence mechanism; this skill asks for the evidence it must produce.

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
