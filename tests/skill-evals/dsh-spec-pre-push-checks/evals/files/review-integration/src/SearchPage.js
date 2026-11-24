import { buttonMarkup } from './Button.js'

export function searchPageMarkup() {
  return `
    <section class="panel search-panel" aria-labelledby="search-title">
      <h2 id="search-title">Search</h2>
      <label class="field">
        <span>Query</span>
        <input name="query" type="search" autocomplete="off">
      </label>
      <div class="actions">
        ${buttonMarkup({ label: 'Search', tone: 'primary' })}
      </div>
    </section>
  `
}
