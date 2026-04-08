import { useEffect, useRef, useState } from 'react'
import Icons from '../components/Icons'
import ConfigManager, {
  DEFAULT_APP_THEME,
  DEFAULT_READER_SETTINGS,
} from '../lib/configManager'
import StorageManager from '../lib/storageManager'

const Reader = ({ ln, onBack, initialChapter = null }) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(() => {
    if (initialChapter) {
      const index = ln.chapters.findIndex(
        (chapter) => chapter.number === initialChapter.number,
      )
      return index !== -1 ? index : 0
    }

    if (ln.lastReadChapter) {
      const index = ln.chapters.findIndex(
        (chapter) => chapter.number === ln.lastReadChapter,
      )
      if (index !== -1) return index
    }

    return 0
  })
  const [settings, setSettings] = useState(DEFAULT_READER_SETTINGS)
  const [appTheme, setAppTheme] = useState(DEFAULT_APP_THEME)
  const [showUI, setShowUI] = useState(true)
  const contentRef = useRef(null)
  const scrollSaveTimeoutRef = useRef(null)

  const currentChapter = ln.chapters[currentChapterIndex]

  useEffect(() => {
    let isMounted = true

    Promise.all([
      ConfigManager.getReaderSettings(),
      ConfigManager.getAppTheme(),
    ])
      .then(([storedSettings, storedAppTheme]) => {
        if (isMounted) setSettings(storedSettings)
        if (isMounted) setAppTheme(storedAppTheme)
      })
      .catch((error) => {
        console.error('Erro ao carregar configuracoes do leitor:', error)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setShowUI(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!currentChapter) return

    void StorageManager.updateLN(ln.id, {
      lastReadChapter: currentChapter.number,
    })
  }, [currentChapter, ln.id])

  useEffect(() => {
    let isMounted = true

    if (!currentChapter || !contentRef.current) return undefined

    const loadScrollPosition = async () => {
      const savedScroll = await ConfigManager.getScrollPosition(
        ln.id,
        currentChapter.number,
      )

      setTimeout(() => {
        if (!isMounted || !contentRef.current) return

        if (savedScroll > 0) {
          const maxScroll =
            contentRef.current.scrollHeight - contentRef.current.clientHeight
          contentRef.current.scrollTop = maxScroll * (savedScroll / 100)
          return
        }

        contentRef.current.scrollTop = 0
      }, 100)
    }

    void loadScrollPosition()

    return () => {
      isMounted = false
    }
  }, [currentChapter, ln.id])

  useEffect(() => {
    return () => {
      if (scrollSaveTimeoutRef.current) {
        clearTimeout(scrollSaveTimeoutRef.current)
      }
    }
  }, [])

  const handleScroll = () => {
    if (!currentChapter || !contentRef.current) return

    const maxScroll =
      contentRef.current.scrollHeight - contentRef.current.clientHeight
    const scrollPercentage =
      maxScroll > 0 ? (contentRef.current.scrollTop / maxScroll) * 100 : 0

    if (scrollSaveTimeoutRef.current) {
      clearTimeout(scrollSaveTimeoutRef.current)
    }

    scrollSaveTimeoutRef.current = setTimeout(() => {
      void ConfigManager.setScrollPosition(
        ln.id,
        currentChapter.number,
        scrollPercentage,
      )
    }, 150)
  }

  const themes = {
    default: {
      bg: 'bg-gray-900',
      text: 'text-gray-100',
    },
    aurora: {
      bg: 'bg-slate-950',
      text: 'text-cyan-50',
    },
    futuristic: {
      bg: 'bg-[#020814]',
      text: 'text-cyan-50',
    },
  }

  const fonts = {
    serif: 'font-serif',
    sans: 'font-sans',
    mono: 'font-mono',
  }

  const activeTheme = themes[appTheme] || themes.default
  const activeFont = fonts[settings.fontFamily] || fonts.serif

  return (
    <div
      className={`fixed inset-0 z-50 ${activeTheme.bg} transition-colors overflow-hidden flex flex-col`}
    >
      <div
        className={`absolute top-0 left-0 right-0 z-20 glass-effect border-b border-gray-700/50 transition-transform duration-300 ${showUI ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <Icons.ArrowLeft />
            <span className="hidden sm:inline">Voltar</span>
          </button>
          <div className="text-center flex-1 px-4">
            <div className="text-xs sm:text-sm text-gray-400 line-clamp-1">
              {ln.title}
            </div>
            <div className="font-semibold text-sm sm:text-base">
              Capitulo {currentChapter.number}
            </div>
          </div>
          <div className="w-8 sm:w-20"></div>
        </div>
      </div>

      <div
        ref={contentRef}
        onClick={() => setShowUI(!showUI)}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto w-full h-full cursor-pointer"
      >
        <div className="max-w-3xl mx-auto px-6 pt-24 pb-32">
          <div
            className={`${activeTheme.text} ${activeFont} whitespace-pre-wrap`}
            style={{
              fontSize: `${settings.fontSize}px`,
              lineHeight: settings.lineHeight,
            }}
          >
            {currentChapter.content}
          </div>
        </div>
      </div>

      <div
        className={`absolute bottom-0 left-0 right-0 z-20 glass-effect border-t border-gray-700/50 transition-transform duration-300 ${showUI ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between">
          <button
            onClick={(event) => {
              event.stopPropagation()
              setCurrentChapterIndex(Math.max(0, currentChapterIndex - 1))
            }}
            disabled={currentChapterIndex === 0}
            className="px-4 sm:px-6 py-2 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors text-sm sm:text-base flex items-center gap-1"
          >
            <span className="sm:hidden">&larr;</span>
            <span className="hidden sm:inline">&larr; Anterior</span>
          </button>
          <div className="text-xs sm:text-sm text-gray-400 font-medium">
            {currentChapterIndex + 1} de {ln.chapters.length}
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation()
              setCurrentChapterIndex(
                Math.min(ln.chapters.length - 1, currentChapterIndex + 1),
              )
            }}
            disabled={currentChapterIndex === ln.chapters.length - 1}
            className="px-4 sm:px-6 py-2 rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors text-sm sm:text-base flex items-center gap-1"
          >
            <span className="hidden sm:inline">Proximo &rarr;</span>
            <span className="sm:hidden">&rarr;</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Reader
