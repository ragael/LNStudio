import { appDb, ensureDbDefaults } from './appDb'

const buildBaseLN = (ln) => ({
  chapters: [],
  continuityDB: null,
  coverImage: null,
  elements: [],
  genres: [],
  lastReadChapter: null,
  notesList: [],
  title: '',
  ...ln,
})

const StorageManager = {
  async listLNs() {
    await ensureDbDefaults()
    return appDb.lightNovels.orderBy('createdAt').reverse().toArray()
  },

  async saveLN(ln) {
    await ensureDbDefaults()

    const timestamp = new Date().toISOString()
    const normalizedLN = buildBaseLN({
      ...ln,
      createdAt: ln.createdAt || timestamp,
      updatedAt: timestamp,
    })

    await appDb.lightNovels.put(normalizedLN)
    return normalizedLN
  },

  async createLN(ln) {
    const timestamp = new Date().toISOString()
    const newLN = buildBaseLN({
      ...ln,
      id: globalThis.crypto?.randomUUID?.() || Date.now().toString(),
      createdAt: timestamp,
      updatedAt: timestamp,
    })

    return StorageManager.saveLN(newLN)
  },

  async getLN(id) {
    await ensureDbDefaults()
    return (await appDb.lightNovels.get(id)) || null
  },

  async updateLN(id, updates) {
    const ln = await StorageManager.getLN(id)
    if (!ln) return null

    return StorageManager.saveLN({
      ...ln,
      ...updates,
    })
  },

  async deleteLN(id) {
    await ensureDbDefaults()

    await appDb.transaction('rw', appDb.lightNovels, appDb.readingProgress, async () => {
      await appDb.lightNovels.delete(id)
      await appDb.readingProgress.where('lnId').equals(id).delete()
    })
  },

  async addChapter(lnId, chapterData) {
    const ln = await StorageManager.getLN(lnId)
    if (!ln) return null

    const chapter = {
      number: ln.chapters.length + 1,
      content: chapterData.content,
      metadata: chapterData.metadata || {
        ai_provider: 'Unknown',
        model: 'Unknown',
        plan: 'Unknown',
        generated_at: new Date().toISOString(),
      },
      addedAt: new Date().toISOString(),
    }

    return StorageManager.saveLN({
      ...ln,
      chapters: [...ln.chapters, chapter],
      continuityDB: chapterData.continuity,
    })
  },

  async addChapters(lnId, payload) {
    const ln = await StorageManager.getLN(lnId)
    if (!ln) return null

    const baseChapterNumber = ln.chapters.length + 1
    const chaptersToAdd = payload.chapters.map((chapter, index) => ({
      number:
        typeof chapter.number === 'number'
          ? chapter.number
          : baseChapterNumber + index,
      content: chapter.content,
      metadata: chapter.metadata ||
        payload.metadata || {
          ai_provider: 'Unknown',
          model: 'Unknown',
          plan: 'Unknown',
          generated_at: new Date().toISOString(),
        },
      addedAt: new Date().toISOString(),
    }))

    return StorageManager.saveLN({
      ...ln,
      chapters: [...ln.chapters, ...chaptersToAdd],
      continuityDB: payload.continuity,
    })
  },

  async exportLN(ln) {
    const dataStr = JSON.stringify(ln, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    const exportFileDefaultName = `${
      ln.title ? ln.title.replace(/\s+/g, '_') : 'light_novel'
    }_backup.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  },

  async importLN(jsonData) {
    try {
      const parsedLN = JSON.parse(jsonData)
      const timestamp = new Date().toISOString()

      return StorageManager.saveLN(
        buildBaseLN({
          ...parsedLN,
          id: globalThis.crypto?.randomUUID?.() || Date.now().toString(),
          createdAt: timestamp,
          updatedAt: timestamp,
        }),
      )
    } catch (error) {
      console.error('Import error:', error)
      return null
    }
  },

  async exportFullDatabase() {
    await ensureDbDefaults()

    const [lightNovels, appConfig, readingProgress] = await Promise.all([
      appDb.lightNovels.toArray(),
      appDb.appConfig.toArray(),
      appDb.readingProgress.toArray(),
    ])

    const payload = {
      app: 'LN Studio',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        lightNovels,
        appConfig,
        readingProgress,
      },
    }

    const dataStr = JSON.stringify(payload, null, 2)
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`
    const fileName = `lnstudio_backup_${new Date().toISOString().slice(0, 10)}.json`
    const linkElement = document.createElement('a')

    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', fileName)
    linkElement.click()
  },

  async importFullDatabase(jsonData) {
    try {
      const parsed = JSON.parse(jsonData)
      const backupData = parsed?.data || parsed
      const lightNovels = Array.isArray(backupData?.lightNovels)
        ? backupData.lightNovels
        : null
      const appConfig = Array.isArray(backupData?.appConfig)
        ? backupData.appConfig
        : null
      const readingProgress = Array.isArray(backupData?.readingProgress)
        ? backupData.readingProgress
        : null

      if (!lightNovels || !appConfig || !readingProgress) {
        throw new Error('Estrutura de backup invalida.')
      }

      await appDb.transaction(
        'rw',
        appDb.lightNovels,
        appDb.appConfig,
        appDb.readingProgress,
        async () => {
          await Promise.all([
            appDb.lightNovels.clear(),
            appDb.appConfig.clear(),
            appDb.readingProgress.clear(),
          ])

          if (lightNovels.length > 0) {
            await appDb.lightNovels.bulkPut(lightNovels)
          }

          if (appConfig.length > 0) {
            await appDb.appConfig.bulkPut(appConfig)
          }

          if (readingProgress.length > 0) {
            await appDb.readingProgress.bulkPut(readingProgress)
          }
        },
      )

      await ensureDbDefaults()
      return true
    } catch (error) {
      console.error('Full import error:', error)
      return false
    }
  },
}

export default StorageManager
