/**
 * ???? settings preferences/share channel defaults ??? language-change event contract.
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import {
  DEFAULT_SETTINGS_PREFERENCES,
  getStoredSettingsPreferences,
  saveSettingsPreferences,
} from "../widgets/admin-settings/lib/preferences.ts"
import {
  DEFAULT_SHARE_CHANNEL_DRAFTS,
  DEFAULT_SHARE_CHANNELS,
} from "../widgets/admin-settings/lib/share-channel-defaults.ts"

const SETTINGS_KEY = "admin_settings_preferences"

const originalWindow = globalThis.window
const originalDocument = globalThis.document
const originalCustomEvent = globalThis.CustomEvent

function installBrowserMocks() {
  const storage = new Map<string, string>()
  const dispatchedEvents: Array<{ type: string; detail?: unknown }> = []
  const classNames = new Set<string>()

  class MockCustomEvent {
    type: string
    detail?: unknown

    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type
      this.detail = init?.detail
    }
  }

  const documentElement = {
    lang: "",
    classList: {
      toggle(name: string, force?: boolean) {
        if (force) {
          classNames.add(name)
        } else {
          classNames.delete(name)
        }
      },
      contains(name: string) {
        return classNames.has(name)
      },
    },
  }

  const localStorage = {
    getItem(key: string) {
      return storage.get(key) ?? null
    },
    setItem(key: string, value: string) {
      storage.set(key, value)
    },
  }

  Object.defineProperty(globalThis, "CustomEvent", {
    configurable: true,
    value: MockCustomEvent,
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement },
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage,
      dispatchEvent(event: { type: string; detail?: unknown }) {
        dispatchedEvents.push({ type: event.type, detail: event.detail })
      },
    },
  })

  return { classNames, dispatchedEvents, documentElement, storage }
}

afterEach(() => {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: originalWindow,
  })
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: originalDocument,
  })
  Object.defineProperty(globalThis, "CustomEvent", {
    configurable: true,
    value: originalCustomEvent,
  })
})

test("settings preference defaults stay Thai with normal motion", () => {
  assert.deepEqual(DEFAULT_SETTINGS_PREFERENCES, {
    language: "th",
    reducedMotion: false,
  })
})

test("stored settings preference falls back to Thai for invalid language", () => {
  const { storage } = installBrowserMocks()
  storage.set(SETTINGS_KEY, JSON.stringify({ language: "jp", reducedMotion: true }))

  assert.deepEqual(getStoredSettingsPreferences(), {
    language: "th",
    reducedMotion: true,
  })
})

test("saveSettingsPreferences preserves storage key language class and event contract", () => {
  const { classNames, dispatchedEvents, documentElement, storage } = installBrowserMocks()

  saveSettingsPreferences({ language: "en", reducedMotion: true })

  assert.equal(storage.get(SETTINGS_KEY), JSON.stringify({ language: "en", reducedMotion: true }))
  assert.equal(documentElement.lang, "en")
  assert.equal(classNames.has("reduce-motion"), true)
  assert.deepEqual(dispatchedEvents, [
    {
      type: "smart-emergency:admin-language-change",
      detail: { language: "en" },
    },
  ])
})

test("share channel defaults keep all center channels disabled and empty", () => {
  assert.deepEqual(DEFAULT_SHARE_CHANNELS, {
    line: { enabled: false, maskedValue: null, source: "none" },
    sms: { enabled: false, maskedValue: null, source: "none" },
    whatsapp: { enabled: false, maskedValue: null, source: "none" },
  })
  assert.deepEqual(DEFAULT_SHARE_CHANNEL_DRAFTS, {
    line: { enabled: false, recipientValue: "" },
    sms: { enabled: false, recipientValue: "" },
    whatsapp: { enabled: false, recipientValue: "" },
  })
})
