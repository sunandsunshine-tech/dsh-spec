import assert from 'node:assert/strict'
import { test } from 'node:test'

import { searchPageMarkup } from '../src/SearchPage.js'
import { settingsPageMarkup } from '../src/SettingsPage.js'

test('both assembled consumers use the shared button', () => {
  assert.match(searchPageMarkup(), /class="button primary"/)
  const settings = settingsPageMarkup({ saving: true })
  assert.match(settings, /class="button secondary"/)
  assert.match(settings, /class="button danger" type="button" disabled/)
})
