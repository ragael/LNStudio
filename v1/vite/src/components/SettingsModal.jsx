import { useEffect, useRef, useState } from 'react'
import Icons from './Icons'
import ConfigManager, {
  APP_THEME_OPTIONS,
  DEFAULT_READER_SETTINGS,
} from '../lib/configManager'
import StorageManager from '../lib/storageManager'
import {
  GEMINI_DEFAULT_MODEL,
  GEMINI_MODEL_OPTIONS,
} from '../services/geminiService'

const readerPreviewFonts = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: '"Segoe UI", Tahoma, sans-serif',
  mono: '"Fira Code", "Consolas", monospace',
}

const API_KEY_SUCCESS_MESSAGE = 'Chave salva localmente com sucesso!'

const maskSecretValue = (value) => '*'.repeat(Math.max(value.length, 18))

const SettingsModal = ({
  appTheme,
  canInstallApp,
  onAppThemeChange,
  onClose,
  onInstall,
}) => {
  const [activeTab, setActiveTab] = useState('appearance')
  const [readerSettings, setReaderSettings] = useState(DEFAULT_READER_SETTINGS)
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('')
  const [geminiModel, setGeminiModel] = useState(GEMINI_DEFAULT_MODEL)
  const [storedGeminiApiKey, setStoredGeminiApiKey] = useState('')
  const [isGeminiApiKeyMasked, setIsGeminiApiKeyMasked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyAction, setBusyAction] = useState(null)
  const [apiKeyAction, setApiKeyAction] = useState(null)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const fileInputRef = useRef(null)
  const feedbackTimeoutRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    Promise.all([
      ConfigManager.getReaderSettings(),
      ConfigManager.getGeminiApiKey(),
      ConfigManager.getGeminiModel(),
    ])
      .then(
        ([
          storedReaderSettings,
          storedGeminiApiKeyValue,
          storedGeminiModelValue,
        ]) => {
        if (!isMounted) return
        setReaderSettings(storedReaderSettings)
        setGeminiModel(storedGeminiModelValue)
        setStoredGeminiApiKey(storedGeminiApiKeyValue)
        setGeminiApiKeyInput(
          storedGeminiApiKeyValue ? maskSecretValue(storedGeminiApiKeyValue) : '',
        )
        setIsGeminiApiKeyMasked(Boolean(storedGeminiApiKeyValue))
        setLoading(false)
        },
      )
      .catch((error) => {
        console.error('Erro ao carregar configuracoes:', error)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(
    () => () => {
      if (feedbackTimeoutRef.current) {
        window.clearTimeout(feedbackTimeoutRef.current)
      }
    },
    [],
  )

  const updateAppTheme = (theme) => {
    onAppThemeChange(theme)
  }

  const updateReaderSettings = (updates) => {
    setReaderSettings((currentSettings) => {
      const nextSettings = {
        ...currentSettings,
        ...updates,
      }

      void ConfigManager.setReaderSettings(nextSettings)
      return nextSettings
    })
  }

  const showFeedbackMessage = (message) => {
    setFeedbackMessage(message)

    if (feedbackTimeoutRef.current) {
      window.clearTimeout(feedbackTimeoutRef.current)
    }

    feedbackTimeoutRef.current = window.setTimeout(() => {
      setFeedbackMessage('')
      feedbackTimeoutRef.current = null
    }, 3000)
  }

  const handleGeminiApiKeyFocus = () => {
    if (!isGeminiApiKeyMasked) return

    setGeminiApiKeyInput('')
    setIsGeminiApiKeyMasked(false)
  }

  const handleGeminiApiKeyChange = (event) => {
    setGeminiApiKeyInput(event.target.value)
  }

  const handleGeminiModelChange = async (event) => {
    const nextModel = await ConfigManager.setGeminiModel(event.target.value)

    setGeminiModel(nextModel)
    showFeedbackMessage('Modelo Gemini atualizado com sucesso!')
  }

  const handleSaveGeminiApiKey = async () => {
    const nextApiKey =
      isGeminiApiKeyMasked && storedGeminiApiKey
        ? storedGeminiApiKey
        : geminiApiKeyInput.trim()

    if (!nextApiKey) return

    setApiKeyAction('save')

    try {
      const savedApiKey = await ConfigManager.setGeminiApiKey(nextApiKey)
      setStoredGeminiApiKey(savedApiKey)
      setGeminiApiKeyInput(maskSecretValue(savedApiKey))
      setIsGeminiApiKeyMasked(true)
      showFeedbackMessage(API_KEY_SUCCESS_MESSAGE)
    } finally {
      setApiKeyAction(null)
    }
  }

  const handleRemoveGeminiApiKey = async () => {
    setApiKeyAction('remove')

    try {
      await ConfigManager.clearGeminiApiKey()
      setStoredGeminiApiKey('')
      setGeminiApiKeyInput('')
      setIsGeminiApiKeyMasked(false)
      setFeedbackMessage('')
    } finally {
      setApiKeyAction(null)
    }
  }

  const canSaveGeminiApiKey = Boolean(
    (isGeminiApiKeyMasked && storedGeminiApiKey) || geminiApiKeyInput.trim(),
  )
  const hasStoredGeminiApiKey = Boolean(storedGeminiApiKey)

  const handleExportDatabase = async () => {
    setBusyAction('export')
    try {
      await StorageManager.exportFullDatabase()
    } finally {
      setBusyAction(null)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportDatabase = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const confirmed = window.confirm(
      'Importar um backup completo vai substituir todo o banco local atual. Deseja continuar?',
    )

    if (!confirmed) {
      event.target.value = ''
      return
    }

    setBusyAction('import')

    try {
      const jsonData = await file.text()
      const success = await StorageManager.importFullDatabase(jsonData)

      if (success) {
        alert('Backup completo importado com sucesso.')
      } else {
        alert('Nao foi possivel importar o backup selecionado.')
      }
    } finally {
      event.target.value = ''
      setBusyAction(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="glass-effect p-4 sm:p-6 rounded-lg max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
            <Icons.Settings /> Configuracoes
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-3xl leading-none"
          >
            &times;
          </button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-400">
            Carregando configuracoes...
          </div>
        ) : (
          <div className="fade-in space-y-6">
            {feedbackMessage && (
              <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {feedbackMessage}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setActiveTab('appearance')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'appearance'
                    ? 'text-white'
                    : 'bg-black/30 text-gray-400 hover:bg-black/50'
                }`}
                style={
                  activeTab === 'appearance'
                    ? {
                        backgroundImage:
                          'linear-gradient(135deg, var(--theme-accent-from), var(--theme-accent-to))',
                      }
                    : undefined
                }
              >
                Aparencia
              </button>
              <button
                onClick={() => setActiveTab('reader')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'reader'
                    ? 'text-white'
                    : 'bg-black/30 text-gray-400 hover:bg-black/50'
                }`}
                style={
                  activeTab === 'reader'
                    ? {
                        backgroundImage:
                          'linear-gradient(135deg, var(--theme-accent-from), var(--theme-accent-to))',
                      }
                    : undefined
                }
              >
                Leitura
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'ai'
                    ? 'text-white'
                    : 'bg-black/30 text-gray-400 hover:bg-black/50'
                }`}
                style={
                  activeTab === 'ai'
                    ? {
                        backgroundImage:
                          'linear-gradient(135deg, var(--theme-accent-from), var(--theme-accent-to))',
                      }
                    : undefined
                }
              >
                Integracao IA
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  activeTab === 'database'
                    ? 'text-white'
                    : 'bg-black/30 text-gray-400 hover:bg-black/50'
                }`}
                style={
                  activeTab === 'database'
                    ? {
                        backgroundImage:
                          'linear-gradient(135deg, var(--theme-accent-from), var(--theme-accent-to))',
                      }
                    : undefined
                }
              >
                Banco local
              </button>
            </div>

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-blue-200 font-semibold mb-2">
                    Tema do aplicativo
                  </h3>
                  <p className="text-sm text-gray-300">
                    O tema muda o visual geral da interface. O modo futurista
                    adiciona atmosfera neon e grade holografica.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {APP_THEME_OPTIONS.map((themeOption) => (
                    <button
                      key={themeOption.value}
                      onClick={() => updateAppTheme(themeOption.value)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        appTheme === themeOption.value
                          ? 'border-white/60 ring-2 ring-white/20'
                          : 'border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div
                        className={`rounded-lg h-24 mb-3 theme-preview-${themeOption.value}`}
                      />
                      <div className="font-semibold text-white">
                        {themeOption.label}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {themeOption.value === 'default' &&
                          'Mantem o visual atual como padrao.'}
                        {themeOption.value === 'aurora' &&
                          'Mais atmosferico, com brilho frio e contraste suave.'}
                        {themeOption.value === 'futuristic' &&
                          'Neon, cyan, linhas de grade e clima sci-fi.'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reader' && (
              <div className="space-y-4">
                <div className="bg-black/30 p-4 rounded-lg border border-gray-700/50">
                  <p className="text-sm text-gray-400 mb-4">
                    Ajuste tamanho, espacamento e familia tipografica. As alteracoes sao salvas
                    automaticamente no banco local.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[var(--theme-accent-from)]">
                        Tamanho da Fonte: {readerSettings.fontSize}px
                      </label>
                      <input
                        type="range"
                        min="14"
                        max="28"
                        value={readerSettings.fontSize}
                        onChange={(event) =>
                          updateReaderSettings({
                            fontSize: parseInt(event.target.value, 10),
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-[var(--theme-accent-from)]">
                        Espacamento: {readerSettings.lineHeight}
                      </label>
                      <input
                        type="range"
                        min="1.4"
                        max="2.2"
                        step="0.1"
                        value={readerSettings.lineHeight}
                        onChange={(event) =>
                          updateReaderSettings({
                            lineHeight: parseFloat(event.target.value),
                          })
                        }
                        className="w-full"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold mb-2 text-[var(--theme-accent-from)]">
                        Tipo de Fonte
                      </label>
                      <select
                        value={readerSettings.fontFamily}
                        onChange={(event) =>
                          updateReaderSettings({
                            fontFamily: event.target.value,
                          })
                        }
                        className="w-full bg-black border border-gray-600 rounded-lg p-2 focus:border-[var(--theme-accent-from)] outline-none"
                      >
                        <option value="serif">Serif</option>
                        <option value="sans">Sans-Serif</option>
                        <option value="mono">Monospace</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="glass-effect rounded-xl border border-white/10 p-5">
                  <div className="text-sm font-semibold text-[var(--theme-accent-from)] mb-3">
                    Pre-visualizacao da leitura
                  </div>
                  <div
                    className="text-gray-200 whitespace-pre-wrap rounded-lg bg-black/30 border border-white/8 p-5"
                    style={{
                      fontSize: `${readerSettings.fontSize}px`,
                      lineHeight: readerSettings.lineHeight,
                      fontFamily:
                        readerPreviewFonts[readerSettings.fontFamily] ||
                        readerPreviewFonts.serif,
                    }}
                  >
                    {`A cidade orbital respirava em silencio acima das nuvens.

Kaori ajustou a gola do casaco e observou as luzes neon refletirem no vidro da plataforma. Cada passo adiante parecia prometer um novo capitulo, mais vasto e perigoso do que o anterior.

Se o destino realmente podia ser reescrito, ela comecaria por aquela noite.`}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
                <div className="glass-effect rounded-xl border border-white/10 p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="rounded-lg bg-white/8 p-2 text-white">
                      <Icons.Google />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">
                        Google AI Studio API Key
                      </h3>
                      <p className="text-sm text-gray-400">
                        Configure a chave BYOK para usar recursos de IA no seu
                        navegador.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-500/10 border border-blue-500/25 p-4">
                    <div className="text-sm font-semibold text-blue-200 mb-3">
                      Como obter sua chave da API
                    </div>
                    <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                      <li>
                        Acesse o{' '}
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[var(--theme-accent-from)] underline underline-offset-4 hover:text-white"
                        >
                          Google AI Studio
                        </a>{' '}
                        e faca login.
                      </li>
                      <li>
                        No menu lateral, clique em &quot;Get API key&quot;.
                      </li>
                      <li>
                        Clique no botao azul &quot;Create API key&quot;.
                      </li>
                      <li>
                        Copie a chave gerada e cole no campo abaixo.
                      </li>
                    </ol>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl border border-gray-700/50 p-5 space-y-4">
                  <div>
                    <label
                      htmlFor="gemini-model"
                      className="block text-sm font-semibold mb-2 text-[var(--theme-accent-from)]"
                    >
                      Modelo padrao
                    </label>
                    <select
                      id="gemini-model"
                      value={geminiModel}
                      onChange={handleGeminiModelChange}
                      className="w-full theme-input rounded-xl p-3"
                    >
                      {GEMINI_MODEL_OPTIONS.map((modelOption) => (
                        <option key={modelOption.value} value={modelOption.value}>
                          {modelOption.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-400 mt-2">
                      {
                        GEMINI_MODEL_OPTIONS.find(
                          (modelOption) => modelOption.value === geminiModel,
                        )?.description
                      }
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="gemini-api-key"
                      className="block text-sm font-semibold mb-2 text-[var(--theme-accent-from)]"
                    >
                      Google AI Studio API Key
                    </label>
                    <input
                      id="gemini-api-key"
                      type="password"
                      value={geminiApiKeyInput}
                      onFocus={handleGeminiApiKeyFocus}
                      onChange={handleGeminiApiKeyChange}
                      className="w-full theme-input rounded-xl p-3"
                      placeholder="Cole sua chave aqui"
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-400 mt-2">
                      {hasStoredGeminiApiKey && isGeminiApiKeyMasked
                        ? 'Uma chave ja esta cadastrada. Clique no campo para substituir por outra.'
                        : 'A chave sera armazenada localmente no banco do navegador sob a chave gemini_api_key.'}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleSaveGeminiApiKey}
                      disabled={!canSaveGeminiApiKey || apiKeyAction !== null}
                      className="theme-primary-btn px-5 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {apiKeyAction === 'save' ? 'Salvando...' : 'Salvar Chave'}
                    </button>
                    <button
                      onClick={handleRemoveGeminiApiKey}
                      disabled={!hasStoredGeminiApiKey || apiKeyAction !== null}
                      className="glass-effect px-5 py-3 rounded-xl font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Icons.Trash />
                      {apiKeyAction === 'remove'
                        ? 'Removendo...'
                        : 'Remover Chave'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'database' && (
              <div className="space-y-4">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-blue-200 font-semibold mb-2">
                    Banco local em IndexedDB
                  </h3>
                  <p className="text-sm text-gray-300">
                    As acoes abaixo trabalham com o banco completo do
                    aplicativo, incluindo novels, configuracoes e progresso de
                    leitura.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={onInstall}
                    disabled={!canInstallApp}
                    className="glass-effect rounded-xl p-4 text-left disabled:opacity-50 disabled:cursor-not-allowed hover-glow"
                  >
                    <div className="flex items-center gap-2 mb-2 text-white font-semibold">
                      <Icons.Download /> Instalar App
                    </div>
                    <p className="text-sm text-gray-400">
                      {canInstallApp
                        ? 'Instala a versao PWA diretamente deste navegador.'
                        : 'A instalacao nao esta disponivel neste navegador agora.'}
                    </p>
                  </button>

                  <button
                    onClick={handleExportDatabase}
                    disabled={busyAction !== null}
                    className="glass-effect rounded-xl p-4 text-left disabled:opacity-50 hover-glow"
                  >
                    <div className="flex items-center gap-2 mb-2 text-white font-semibold">
                      <Icons.Download /> Exportar Banco
                    </div>
                    <p className="text-sm text-gray-400">
                      Gera um backup JSON completo do banco local.
                    </p>
                  </button>

                  <button
                    onClick={handleImportClick}
                    disabled={busyAction !== null}
                    className="glass-effect rounded-xl p-4 text-left disabled:opacity-50 hover-glow"
                  >
                    <div className="flex items-center gap-2 mb-2 text-white font-semibold">
                      <Icons.Upload /> Importar Banco
                    </div>
                    <p className="text-sm text-gray-400">
                      Substitui o banco local atual por um backup completo.
                    </p>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={handleImportDatabase}
                />
              </div>
            )}

            <div className="flex justify-end mt-4">
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg text-white font-semibold"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, var(--theme-accent-from), var(--theme-accent-to))',
                }}
              >
                Concluido
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SettingsModal
