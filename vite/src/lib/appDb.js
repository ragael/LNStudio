import Dexie from 'dexie'

export const DEFAULT_APP_THEME = 'default'

export const DEFAULT_READER_SETTINGS = {
  fontSize: 18,
  lineHeight: 1.8,
  fontFamily: 'serif',
  theme: 'dark',
}

const APP_THEME_KEY = 'appTheme'
const READER_SETTINGS_KEY = 'readerSettings'

export const appDb = new Dexie('LightNovelStudioDB')

appDb.version(1).stores({
  lightNovels: 'id, createdAt, updatedAt, title, lastReadChapter',
  appConfig: 'key',
  readingProgress: '[lnId+chapterNumber], lnId, chapterNumber, updatedAt',
})

let defaultsPromise = null

export const ensureDbDefaults = async () => {
  if (!defaultsPromise) {
    defaultsPromise = (async () => {
      const appTheme = await appDb.appConfig.get(APP_THEME_KEY)
      const readerSettings = await appDb.appConfig.get(READER_SETTINGS_KEY)

      if (!appTheme) {
        await appDb.appConfig.put({
          key: APP_THEME_KEY,
          value: DEFAULT_APP_THEME,
          updatedAt: new Date().toISOString(),
        })
      }

      if (!readerSettings) {
        await appDb.appConfig.put({
          key: READER_SETTINGS_KEY,
          value: DEFAULT_READER_SETTINGS,
          updatedAt: new Date().toISOString(),
        })
      }
    })()
  }

  try {
    return await defaultsPromise
  } finally {
    defaultsPromise = null
  }
}

export const getAppThemeKey = () => APP_THEME_KEY
export const getReaderSettingsKey = () => READER_SETTINGS_KEY
