export function FormPage({ narrow }) {
  return `
    <main class="${narrow ? 'layout narrow' : 'layout'}">
      <label class="field">
        <span>Project name</span>
        <input name="project-name" value="">
      </label>
    </main>
  `
}

export function updateLayout(root, narrow) {
  root.innerHTML = FormPage({ narrow })
}
