import {
  appDb,
  DEFAULT_APP_THEME,
  DEFAULT_READER_SETTINGS,
  ensureDbDefaults,
  getAppThemeKey,
  getGeminiApiKeyKey,
  getGeminiModelKey,
  getReaderSettingsKey,
} from './appDb'
import {
  GEMINI_ALTERNATIVE_MODEL,
  GEMINI_DEFAULT_MODEL,
} from '../services/geminiService'

export const APP_THEME_OPTIONS = [
  { value: 'default', label: 'Padrao atual' },
  { value: 'aurora', label: 'Aurora' },
  { value: 'futuristic', label: 'Futurista neon' },
]

const ConfigManager = {
  async getAppTheme() {
    await ensureDbDefaults()
    const record = await appDb.appConfig.get(getAppThemeKey())
    return record?.value || DEFAULT_APP_THEME
  },

  async setAppTheme(theme) {
    await ensureDbDefaults()
    await appDb.appConfig.put({
      key: getAppThemeKey(),
      value: theme,
      updatedAt: new Date().toISOString(),
    })

    return theme
  },

  async getReaderSettings() {
    await ensureDbDefaults()
    const record = await appDb.appConfig.get(getReaderSettingsKey())

    return {
      ...DEFAULT_READER_SETTINGS,
      ...(record?.value || {}),
    }
  },

  async setReaderSettings(settings) {
    await ensureDbDefaults()

    const nextSettings = {
      ...DEFAULT_READER_SETTINGS,
      ...settings,
    }

    await appDb.appConfig.put({
      key: getReaderSettingsKey(),
      value: nextSettings,
      updatedAt: new Date().toISOString(),
    })

    return nextSettings
  },

  async getGeminiApiKey() {
    await ensureDbDefaults()

    const storedRecord = await appDb.appConfig.get(getGeminiApiKeyKey())
    if (storedRecord?.value) {
      return storedRecord.value
    }

    const legacyLocalValue = globalThis.localStorage?.getItem(
      getGeminiApiKeyKey(),
    )

    if (!legacyLocalValue) {
      return ''
    }

    await appDb.appConfig.put({
      key: getGeminiApiKeyKey(),
      value: legacyLocalValue,
      updatedAt: new Date().toISOString(),
    })
    globalThis.localStorage?.removeItem(getGeminiApiKeyKey())

    return legacyLocalValue
  },

  async setGeminiApiKey(apiKey) {
    await ensureDbDefaults()

    const normalizedApiKey = apiKey.trim()

    await appDb.appConfig.put({
      key: getGeminiApiKeyKey(),
      value: normalizedApiKey,
      updatedAt: new Date().toISOString(),
    })
    globalThis.localStorage?.removeItem(getGeminiApiKeyKey())

    return normalizedApiKey
  },

  async clearGeminiApiKey() {
    await ensureDbDefaults()

    await appDb.appConfig.delete(getGeminiApiKeyKey())
    globalThis.localStorage?.removeItem(getGeminiApiKeyKey())
  },

  async getGeminiModel() {
    await ensureDbDefaults()

    const storedRecord = await appDb.appConfig.get(getGeminiModelKey())

    if (
      storedRecord?.value === GEMINI_DEFAULT_MODEL ||
      storedRecord?.value === GEMINI_ALTERNATIVE_MODEL
    ) {
      return storedRecord.value
    }

    return GEMINI_DEFAULT_MODEL
  },

  async setGeminiModel(model) {
    await ensureDbDefaults()

    const normalizedModel =
      model === GEMINI_ALTERNATIVE_MODEL
        ? GEMINI_ALTERNATIVE_MODEL
        : GEMINI_DEFAULT_MODEL

    await appDb.appConfig.put({
      key: getGeminiModelKey(),
      value: normalizedModel,
      updatedAt: new Date().toISOString(),
    })

    return normalizedModel
  },

  async getScrollPosition(lnId, chapterNumber) {
    const progress = await appDb.readingProgress.get([lnId, chapterNumber])
    return typeof progress?.percentage === 'number' ? progress.percentage : 0
  },

  async setScrollPosition(lnId, chapterNumber, percentage) {
    await appDb.readingProgress.put({
      lnId,
      chapterNumber,
      percentage,
      updatedAt: new Date().toISOString(),
    })
  },
}

export { DEFAULT_APP_THEME, DEFAULT_READER_SETTINGS }

export default ConfigManager
