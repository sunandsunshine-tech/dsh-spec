# Export retries after process restart

Status: draft, not retained

## Discussion

Exports should resume after a process restart without duplicating completed records. The draft
proposes persisting a checkpoint before each batch and treating the latest committed checkpoint as
the resume point.

This file exists only on an unmerged branch. It has not been reviewed or retained in the target
branch's proposal inventory.
