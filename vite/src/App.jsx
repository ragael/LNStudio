import { useEffect, useState } from 'react'
import { liveQuery } from 'dexie'
import SettingsModal from './components/SettingsModal'
import Dashboard from './pages/Dashboard'
import CreationForm from './pages/CreationForm'
import LNManager from './pages/LNManager'
import ConfigManager, { DEFAULT_APP_THEME } from './lib/configManager'
import { ensureDbDefaults } from './lib/appDb'
import StorageManager from './lib/storageManager'

const App = () => {
  const [currentView, setCurrentView] = useState('dashboard')
  const [selectedLN, setSelectedLN] = useState(null)
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [dbReady, setDbReady] = useState(false)
  const [storageError, setStorageError] = useState(null)
  const [lns, setLNs] = useState([])
  const [appTheme, setAppTheme] = useState(DEFAULT_APP_THEME)

  useEffect(() => {
    let isMounted = true

    ensureDbDefaults()
      .then(() => {
        if (isMounted) setDbReady(true)
      })
      .catch((error) => {
        console.error('Erro ao inicializar IndexedDB:', error)
        if (isMounted) {
          setStorageError(error)
          setDbReady(true)
        }
      })

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault()
      setDeferredPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('sw.js')
          .catch((error) => console.log('SW falhou:', error))
      })
    }

    return () => {
      isMounted = false
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  useEffect(() => {
    if (!dbReady || storageError) return undefined

    const subscription = liveQuery(() => StorageManager.listLNs()).subscribe({
      next: (nextLNs) => setLNs(nextLNs),
      error: (error) => {
        console.error('Erro ao observar banco local:', error)
        setStorageError(error)
      },
    })

    return () => subscription.unsubscribe()
  }, [dbReady, storageError])

  useEffect(() => {
    if (!dbReady || storageError) return undefined

    const subscription = liveQuery(() => ConfigManager.getAppTheme()).subscribe({
      next: (theme) => setAppTheme(theme || DEFAULT_APP_THEME),
      error: (error) => {
        console.error('Erro ao observar tema do app:', error)
      },
    })

    return () => subscription.unsubscribe()
  }, [dbReady, storageError])

  useEffect(() => {
    document.documentElement.dataset.appTheme = appTheme
  }, [appTheme])

  const loading = !storageError && !dbReady
  const activeLN = selectedLN
    ? lns.find((ln) => ln.id === selectedLN.id) || selectedLN
    : null

  const handleInstallApp = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleAppThemeChange = (theme) => {
    setAppTheme(theme)
    void ConfigManager.setAppTheme(theme)
  }

  const handleLNChange = (updatedLN) => {
    setLNs((currentLNs) => {
      const nextLNs = [
        updatedLN,
        ...currentLNs.filter((currentLN) => currentLN.id !== updatedLN.id),
      ]

      nextLNs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      return nextLNs
    })
    setSelectedLN(updatedLN)
  }

  const handleLNDelete = (lnId) => {
    setLNs((currentLNs) =>
      currentLNs.filter((currentLN) => currentLN.id !== lnId),
    )
    setSelectedLN(null)
    setCurrentView('dashboard')
  }

  return (
    <>
      {currentView === 'dashboard' && (
        <Dashboard
          lns={lns}
          loading={loading}
          onCreateNew={() => setCurrentView('create')}
          onOpenConfig={() => setShowConfigModal(true)}
          onSelectLN={(ln) => {
            setSelectedLN(ln)
            setCurrentView('manager')
          }}
          storageError={storageError}
        />
      )}

      {currentView === 'create' && (
        <CreationForm
          onBack={() => setCurrentView('dashboard')}
          onComplete={(ln) => {
            setLNs((currentLNs) => [
              ln,
              ...currentLNs.filter((currentLN) => currentLN.id !== ln.id),
            ])
            setSelectedLN(ln)
            setCurrentView('manager')
          }}
        />
      )}

      {currentView === 'manager' && activeLN && (
        <LNManager
          ln={activeLN}
          onBack={() => {
            setSelectedLN(null)
            setCurrentView('dashboard')
          }}
          onLNChange={handleLNChange}
          onLNDelete={handleLNDelete}
        />
      )}

      {showConfigModal && (
        <SettingsModal
          appTheme={appTheme}
          canInstallApp={Boolean(deferredPrompt)}
          onClose={() => setShowConfigModal(false)}
          onAppThemeChange={handleAppThemeChange}
          onInstall={handleInstallApp}
        />
      )}
    </>
  )
}

export default App
