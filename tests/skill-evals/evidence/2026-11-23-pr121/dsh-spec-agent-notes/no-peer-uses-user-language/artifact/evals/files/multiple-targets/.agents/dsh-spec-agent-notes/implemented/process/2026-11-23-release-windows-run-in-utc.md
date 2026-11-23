# Agent Note: Release windows run in UTC

Status: implemented

## Problem

Release windows affect distributed operators and automation that need one unambiguous interpretation of start and end times. A local-time basis can make a schedule ambiguous when it crosses time zones or daylight-saving changes.

## Decision

Release windows run in UTC. UTC is the authoritative time basis for release-window boundaries, and every release-window reference states its time basis explicitly.

## Alternatives considered

No alternative or rejection rationale was supplied with this decision, so this record does not infer one.

## Consequences

Teams and systems share one stable basis for scheduling and interpreting release windows. Participants must convert UTC to local time when coordinating local working hours, and operational communications must retain UTC as the authoritative value.
