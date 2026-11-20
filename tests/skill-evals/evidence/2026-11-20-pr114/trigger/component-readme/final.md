# Button Component

This example assumes a React/TypeScript component package. Update the import path to match your project.

## Import

```tsx
import { Button } from "@your-scope/ui";
import "@your-scope/ui/styles.css";
```

## Basic usage

```tsx
export function SaveButton() {
  return (
    <Button variant="primary" size="md" onClick={() => console.log("Saved")}>
      Save changes
    </Button>
  );
}
```

## Configuration

| Prop | Default | Description |
|---|---|---|
| `variant` | `"primary"` | Visual style: `primary`, `secondary`, or `danger` |
| `size` | `"md"` | Button size: `sm`, `md`, or `lg` |
| `disabled` | `false` | Prevents interaction |
| `loading` | `false` | Shows a loading indicator |
| `type` | `"button"` | Native button type: `button`, `submit`, or `reset` |
| `onClick` | — | Called when the button is activated |
| `className` | — | Additional CSS classes |

Always set `type="button"` for non-submit buttons inside forms.

```tsx
<Button
  type="submit"
  variant="danger"
  size="lg"
  loading={isSubmitting}
  disabled={isSubmitting}
>
  Delete account
</Button>
```