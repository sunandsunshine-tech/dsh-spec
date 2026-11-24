# Agent Note: Release windows run in UTC

Status: implemented

## Problem

Release windows need one shared clock reference. If a window is interpreted in each participant's local timezone, the same announcement identifies different instants, and daylight-saving changes can make its boundaries ambiguous.

## Decision

Release windows are defined, scheduled, and communicated in UTC. The canonical start and end of a release window are UTC instants; local-time renderings are supplemental and do not replace those values.

## Alternatives considered

**Use each participant's local time.** This loses because one release window would have several unlabelled representations and daylight-saving transitions could move its apparent boundary.

**Use a regional timezone other than UTC.** This loses because it still requires a global offset conversion and its offset can change seasonally.

## Consequences

Release schedules now share one unambiguous reference point. Participants convert the canonical window to their local time when needed, and release documentation and tooling must mark UTC explicitly so a bare clock time cannot be mistaken for local time. UTC also means a window may fall outside a participant's normal business hours; the scheduling decision remains anchored to the UTC instants rather than local working hours.
