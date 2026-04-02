import {
  appDb,
  DEFAULT_APP_THEME,
  DEFAULT_READER_SETTINGS,
  ensureDbDefaults,
  getAppThemeKey,
  getReaderSettingsKey,
} from './appDb'

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
