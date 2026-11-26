# Project review rules

This fixture changes page-local spacing in the Settings view.

- UI-1: An ordinary page-local visual change requires one current rendered evidence artifact for the changed state and supported viewport.
- UI-2: A component audit report and a design-system full-audit record are optional for a UI-1 change; their omission is not a review gap.
- UI-3: Evidence remains valid while its build, viewport, data, theme, and state match the change. Recheck only new interactions or evidence invalidated by a later change.
- UI-4: A project-declared test, recording, or approval remains required under its own trigger.
