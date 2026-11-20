# Button

The `Button` component provides a consistent button for actions and form submissions. Use it with different variants, sizes, icons, and loading states instead of creating one-off button markup.

> The examples use `@your-org/ui` as a placeholder package name. Replace it with the package that exports the component. Prop names below represent a typical Button API; confirm them against the component’s TypeScript definitions.

## Installation

```bash
npm install @your-org/ui
```

Import the component styles once in your application entry point:

```tsx
import "@your-org/ui/styles.css";
```

## Import

```tsx
import { Button } from "@your-org/ui";
```

## Basic usage

```tsx
export function SaveButton() {
  return (
    <Button variant="primary" onClick={() => console.log("Saved")}>
      Save changes
    </Button>
  );
}
```

## Configuration

Configure the component through props. Avoid modifying the component source for individual use cases.

```tsx
import { Button } from "@your-org/ui";
import { PlusIcon } from "@your-org/icons";

export function CreateProjectButton({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <Button
      type="button"
      variant="primary"
      size="large"
      leftIcon={<PlusIcon />}
      loading={creating}
      disabled={creating}
      onClick={onCreate}
    >
      Create project
    </Button>
  );
}
```

### Common props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `ReactNode` | — | Visible button label |
| `variant` | `"primary" \| "secondary" \| "ghost" \| "danger"` | `"primary"` | Visual emphasis and intent |
| `size` | `"small" \| "medium" \| "large"` | `"medium"` | Button dimensions and spacing |
| `type` | `"button" \| "submit" \| "reset"` | `"button"` | Native HTML button behavior |
| `disabled` | `boolean` | `false` | Prevents interaction |
| `loading` | `boolean` | `false` | Displays progress and prevents repeated actions |
| `leftIcon` | `ReactNode` | — | Icon before the label |
| `rightIcon` | `ReactNode` | — | Icon after the label |
| `fullWidth` | `boolean` | `false` | Expands the button to its container’s width |
| `className` | `string` | — | Additional class for layout or context-specific styling |
| `onClick` | `(event) => void` | — | Runs when the button is activated |

### Variants

Use variants to communicate action priority:

```tsx
<Button variant="primary">Publish</Button>
<Button variant="secondary">Save draft</Button>
<Button variant="ghost">Cancel</Button>
<Button variant="danger">Delete</Button>
```

Reserve `primary` for the main action in a section and `danger` for destructive actions.

### Icons

```tsx
<Button leftIcon={<PlusIcon />}>Add member</Button>
<Button rightIcon={<ArrowRightIcon />}>Continue</Button>
```

Use an icon-only button only when its accessible name is unambiguous:

```tsx
<Button aria-label="Close dialog" variant="ghost">
  <CloseIcon aria-hidden="true" />
</Button>
```

### Form submission

Inside a form, use `type="submit"`. Outside a form, set `type="button"` to prevent unintended submissions.

```tsx
<form onSubmit={handleSubmit}>
  <Button type="submit" loading={submitting}>
    Save
  </Button>

  <Button type="button" variant="ghost" onClick={handleCancel}>
    Cancel
  </Button>
</form>
```

### Loading state

Set `loading` while an asynchronous action is running. Disable the action during that period to prevent duplicate submissions.

```tsx
<Button loading={isSaving} disabled={isSaving} onClick={handleSave}>
  {isSaving ? "Saving…" : "Save"}
</Button>
```

### Custom styling

Use `className` for one-off layout adjustments, or target the component through your application’s existing styling system:

```tsx
<Button className="checkout-actions__submit" fullWidth>
  Continue to payment
</Button>
```

Prefer library-level design tokens or variant styles for colors, spacing, and state styling so the button remains consistent across the application.

## Accessibility

- Give every button a clear visible label or an `aria-label`.
- Mark decorative icons as `aria-hidden="true"`.
- Choose `type="button"` for actions that do not submit a form.
- Show the `loading` state while retaining a meaningful accessible label.
- Do not replace form submission with a click handler when native submit behavior is sufficient.

## TypeScript

Import the prop type when wrapping or extending the component:

```tsx
import { Button, type ButtonProps } from "@your-org/ui";

type ConfirmButtonProps = Pick<ButtonProps, "variant" | "onClick"> & {
  confirming: boolean;
};

export function ConfirmButton({
  confirming,
  ...props
}: ConfirmButtonProps) {
  return (
    <Button {...props} loading={confirming} disabled={confirming}>
      Confirm
    </Button>
  );
}
```