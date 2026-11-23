The responsive change has two user-visible risks:

1. **Draft and focus loss at the breakpoint.** [FormPage.js](/workspace/evals/files/responsive-draft-project/src/FormPage.js:12) replaces the entire layout with `root.innerHTML = ...`. Crossing between wide and narrow layouts destroys the input node, clearing an in-progress draft and losing focus, caret position, selection, and any active IME composition.

2. **Mobile focus zoom on coarse-pointer devices.** [styles.css](/workspace/evals/files/responsive-draft-project/src/styles.css:16) sets the input to `0.875rem`, which resolves to 14px from the 16px root. With no minimum-size rule or project override, focusing it on iOS Safari can zoom the viewport and disrupt the form.

The smallest corrections are:

```js
export function updateLayout(root, narrow) {
  root.querySelector('.layout')?.classList.toggle('narrow', narrow)
}
```

Reuse the existing DOM and change only the layout class. Do not manually save and restore `value`; that would still lose focus, caret/selection, and IME state.

```css
.field input {
  font-size: max(16px, 0.875rem);
}
```

This establishes the required minimum without introducing another typography system. If the design system supplies a 16px-or-larger input token, use that token instead.

The project has no runnable entrypoint, package manifest, tests, or capture mechanism, so I could not produce rendered browser evidence or exercise the 390px transition directly. The findings above are source-confirmed, and the project declares no visual acceptance policy.