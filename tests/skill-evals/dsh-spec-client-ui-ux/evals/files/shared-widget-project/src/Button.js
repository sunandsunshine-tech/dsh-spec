function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function buttonMarkup({ label, tone = 'secondary', disabled = false }) {
  const safeTone = ['primary', 'secondary', 'danger'].includes(tone) ? tone : 'secondary'
  return [
    '<button',
    ` class="button ${safeTone}"`,
    ` type="button"`,
    disabled ? ' disabled' : '',
    '>',
    escapeHtml(label),
    '</button>',
  ].join('')
}
