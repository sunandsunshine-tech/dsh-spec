# Add retry telemetry

## Motivation

Add retry telemetry for the request client.

## Changes

**Interface changes**

Add telemetry events.

**Behavior changes**

Emit one event after every request.

## Testing

**Test design**

The telemetry tests cover a successful request.

**Test entries**

`npm test` passed.

## Human and Agent Roles

| Stage | Level | Role |
|:--|:--|:--|
| implementation | copilot | The AI implemented telemetry. |
