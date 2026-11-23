import { searchPageMarkup } from './SearchPage.js'
import { settingsPageMarkup } from './SettingsPage.js'

const params = new URLSearchParams(window.location.search)
document.documentElement.dataset.variant = params.get('variant') === 'before' ? 'before' : 'after'
const saving = params.get('saving') === '1'

document.querySelector('#app').innerHTML = `
  <header class="page-header">
    <p class="eyebrow">Account workspace</p>
    <h1>Control center</h1>
    <p>Both assembled surfaces use the shared action component.</p>
  </header>
  <main class="page-grid">
    ${searchPageMarkup()}
    ${settingsPageMarkup({ saving })}
  </main>
`

if (params.get('focus') === '1') {
  document.documentElement.dataset.focusDemo = '1'
}
