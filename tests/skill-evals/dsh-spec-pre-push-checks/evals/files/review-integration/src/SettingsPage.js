import { buttonMarkup } from './Button.js'

export function settingsPageMarkup({ saving = false } = {}) {
  return `
    <section class="panel settings-panel" aria-labelledby="settings-title">
      <h2 id="settings-title">Settings</h2>
      <p>Keep your account details and notification preferences current.</p>
      <div class="actions">
        ${buttonMarkup({ label: 'Cancel', tone: 'secondary' })}
        ${buttonMarkup({ label: 'Delete account', disabled: saving, tone: 'danger' })}
      </div>
    </section>
  `
}
