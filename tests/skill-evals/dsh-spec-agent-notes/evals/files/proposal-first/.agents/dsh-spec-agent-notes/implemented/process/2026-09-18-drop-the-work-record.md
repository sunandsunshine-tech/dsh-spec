# Agent Note: Drop the work record

Status: implemented

## Problem

A separate work record duplicates the proposal's acceptance criteria and Git's implementation history. Every update also has to keep another status source current.

## Decision

No work record is maintained. A proposal states the design and remaining acceptance criteria, Git records what shipped, and the execution tracker records status and evidence.

## Alternatives considered

**Keep an append-only work log.** It lost because it becomes a second history that drifts from Git and the accepted scope.

## Consequences

Resuming work requires reading the proposal's acceptance criteria, the execution evidence and the recent commits. That is the price of having one owner for each fact.

## Reintroduction

Reintroduce a work record only after two or more resumed sessions derive the wrong next step, or a handoff loses work. Those commits are the evidence; preference alone is insufficient.

## Verification of absence

No active file or automation creates, reads or updates a work-record artifact. Policy references preserve this removal decision and its reintroduction condition; none is a status consumer.
