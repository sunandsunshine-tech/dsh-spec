# Spacing and grouping

Distance explains which text, controls and actions belong together. Use the project's spacing and alignment owners for values; this reference defines the relationships to verify, not a numeric scale.

## Identify the group

Group by one object, action, repeated unit or meaning, not by DOM siblings, background or component boundary. State the intended relationship before judging a gap, and check each nesting level independently.

For example, a title and supporting text can introduce one object; related actions can form one operation group; repeated cards can form one repeated group. A label and control can form one option, options can form a field, and fields can form one logical unit or section. Groups may contain the same kind of component without sharing the same relationship.

Repeated compositions share the project's gap, padding and alignment treatment. Label length, card area or a component boundary does not by itself justify unrelated spacing.

## Preserve the hierarchy

Without an explicit divider or project rule for a deliberate exception, comparable neighboring groups need visibly greater separation between groups than within them. A reversal is a grouping defect, not a cosmetic preference.

Wrapping text, metadata, subgroups or independent actions can increase the enclosing separation needed to preserve grouping. Dividers and distinct surfaces can reinforce a boundary, but a heading must remain closer to its own content than to the preceding group.

## Judge the rendered gap

Inspect actual whitespace at normal size using the rendered boxes. Include each side's padding, borders, line box, glyph whitespace and painted control edge as applicable. Do not infer grouping from CSS margins, box-area ratios or one spacing token.

When comparing two visible gaps, name both pairs of endpoints and the axis. Equal visible gaps can require unequal margins because their endpoint geometry differs. Keep the choice between glyph edges and painted control edges stable through the review.
