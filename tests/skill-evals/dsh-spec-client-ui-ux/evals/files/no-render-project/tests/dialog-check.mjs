import assert from 'node:assert/strict'
import { test } from 'node:test'

import { dialogMarkup } from '../src/Dialog.js'

test('open dialog names its initial focus target', () => {
  assert.match(dialogMarkup({ open: true }), /data-initial-focus="close-button"/)
})
