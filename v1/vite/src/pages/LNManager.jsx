import { startTransition, useEffect, useRef, useState } from 'react'
import Icons from '../components/Icons'
import ConfigManager from '../lib/configManager'
import JSONValidator from '../lib/jsonValidator'
import PromptGenerator from '../lib/promptGenerator'
import StorageManager from '../lib/storageManager'
import GeminiService from '../services/geminiService'
import Reader from './Reader'

const MACRO_TOTAL_GENERATIONS = 5
const MACRO_RENDER_DELAY_MS = 250
const MACRO_STEP_DELAY_MS = 60000
const GEMINI_PROVIDER_NAME = 'Google Gemini'
const GEMINI_ACCESS_PLAN = 'BYOK'

const LNManager = ({ ln, onBack, onLNChange, onLNDelete }) => {
  const [view, setView] = useState('main')
  const [selectedChapter, setSelectedChapter] = useState(null)
  const [writerTab, setWriterTab] = useState('prompt')
  const [coverPromptText, setCoverPromptText] = useState('')
  const [promptText, setPromptText] = useState('')
  const [responseText, setResponseText] = useState('')
  const [validationResult, setValidationResult] = useState(null)
  const [showCoverPreview, setShowCoverPreview] = useState(false)
  const [macroStatus, setMacroStatus] = useState(null)
  const [selectedGeminiModel, setSelectedGeminiModel] = useState(
    GeminiService.GEMINI_DEFAULT_MODEL,
  )
  const fileInputRef = useRef(null)
  const lnRef = useRef(ln)
  const promptTextRef = useRef(promptText)
  const isMountedRef = useRef(true)

  useEffect(() => {
    lnRef.current = ln
  }, [ln])

  useEffect(() => {
    promptTextRef.current = promptText
  }, [promptText])

  useEffect(() => {
    isMountedRef.current = true

    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    void ConfigManager.getGeminiModel()
      .then((storedModel) => {
        if (isMounted) {
          setSelectedGeminiModel(storedModel)
        }
      })
      .catch((error) => {
        console.error('Erro ao carregar modelo Gemini:', error)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const sleep = (ms) =>
    new Promise((resolve) => {
      window.setTimeout(resolve, ms)
    })

  const updateMacroStatus = (nextStatus) => {
    startTransition(() => {
      setMacroStatus((currentStatus) => {
        const baseStatus = currentStatus || {
          attempts: 0,
          currentStep: 0,
          failures: 0,
          isRunning: false,
          lastError: '',
          lastModel: GeminiService.GEMINI_DEFAULT_MODEL,
          message: '',
          successes: 0,
          totalSteps: MACRO_TOTAL_GENERATIONS,
          visible: true,
        }

        return {
          ...baseStatus,
          ...(typeof nextStatus === 'function'
            ? nextStatus(baseStatus)
            : nextStatus),
          visible: true,
        }
      })
    })
  }

  const finalizeMacroStatus = (nextStatus) => {
    updateMacroStatus({
      ...nextStatus,
      isRunning: false,
    })
  }

  const dismissMacroStatus = () => {
    if (macroStatus?.isRunning) return

    startTransition(() => {
      setMacroStatus(null)
    })
  }

  const buildPromptForLN = (currentLN) => {
    if (currentLN.chapters.length === 0) {
      return PromptGenerator.generateInitialPrompt(currentLN)
    }

    return PromptGenerator.generateContinuationPrompt(
      currentLN,
      currentLN.chapters.length + 1,
    )
  }

  const getWriterPromptText = ({ forceRefresh = false } = {}) => {
    const currentPrompt = promptTextRef.current?.trim()

    if (!forceRefresh && currentPrompt) {
      return currentPrompt
    }

    const nextPromptText = buildPromptForLN(lnRef.current)
    startTransition(() => {
      setPromptText(nextPromptText)
    })

    return nextPromptText
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('Copiado para a area de transferencia!')
  }

  const handleDelete = async () => {
    if (
      confirm(
        'Tem certeza que deseja deletar esta Light Novel? Ela sera removida permanentemente do banco local.',
      )
    ) {
      await StorageManager.deleteLN(ln.id)
      onLNDelete(ln.id)
    }
  }

  const openWriter = (tab = 'prompt') => {
    getWriterPromptText({ forceRefresh: true })
    setWriterTab(tab)
    setView('writer')
  }

  const openCoverPrompt = () => {
    setCoverPromptText(PromptGenerator.generateCoverPrompt(ln))
    setView('coverPrompt')
  }

  const handleValidate = (nextResponseText = responseText) => {
    const normalizedResponse = nextResponseText || ''
    const extracted = JSONValidator.extractJSON(normalizedResponse)
    let result = JSONValidator.validate(extracted)

    if (!result.valid) {
      result = {
        ...result,
        correctionPrompt: JSONValidator.generateCorrectionPrompt(
          normalizedResponse,
          result.error,
        ),
      }
    }

    startTransition(() => {
      if (typeof nextResponseText === 'string' && nextResponseText !== responseText) {
        setResponseText(nextResponseText)
      }
      setValidationResult(result)
    })

    return result
  }

  const handleAddChapterFinal = async (
    nextValidationResult = validationResult,
    { metadataOverride = null, preserveView = false, silent = false } = {},
  ) => {
    if (!nextValidationResult?.valid || !nextValidationResult.data) {
      return {
        saved: false,
      }
    }

    let currentLN = lnRef.current

    if (
      nextValidationResult.data.title &&
      (!currentLN.title || currentLN.title.trim() === '')
    ) {
      const titledLN = await StorageManager.updateLN(currentLN.id, {
        title: nextValidationResult.data.title,
      })

      if (titledLN) {
        lnRef.current = titledLN
        onLNChange(titledLN)
        currentLN = titledLN
      }
    }

    const normalizedMetadata = metadataOverride
      ? {
          ...nextValidationResult.data.metadata,
          ...metadataOverride,
          generated_at:
            nextValidationResult.data.metadata?.generated_at ||
            new Date().toISOString(),
        }
      : nextValidationResult.data.metadata

    const normalizedChapters = nextValidationResult.data.chapters.map((chapter) => ({
      ...chapter,
      metadata: normalizedMetadata,
    }))

    const updatedLN = await StorageManager.addChapters(currentLN.id, {
      chapters: normalizedChapters,
      metadata: normalizedMetadata,
      continuity: nextValidationResult.data.continuity,
    })
    if (updatedLN) {
      lnRef.current = updatedLN
      onLNChange(updatedLN)
    }

    startTransition(() => {
      setResponseText('')
      setValidationResult(null)
      if (!preserveView) {
        setView('main')
      }
    })

    if (!silent) {
      alert('Capitulo adicionado com sucesso!')
    }

    return {
      ln: updatedLN,
      saved: Boolean(updatedLN),
    }
  }

  const runGenerationMacro = async () => {
    if (macroStatus?.isRunning) return

    let attempts = 0
    let successes = 0
    let failures = 0
    const activeModel = await ConfigManager.getGeminiModel()

    setSelectedGeminiModel(activeModel)

    startTransition(() => {
      setValidationResult(null)
      setResponseText('')
    })

    updateMacroStatus({
      attempts,
      currentStep: 0,
      failures,
      isRunning: true,
      lastError: '',
      lastModel: activeModel,
      message: 'Iniciando macro de geracao...',
      successes,
      totalSteps: MACRO_TOTAL_GENERATIONS,
    })

    for (let step = 1; step <= MACRO_TOTAL_GENERATIONS; step += 1) {
      try {
        const prompt = getWriterPromptText({ forceRefresh: step > 1 })
        attempts += 1

        updateMacroStatus({
          attempts,
          currentStep: step,
          failures,
          isRunning: true,
          lastModel: activeModel,
          message: `Tentativa ${step}/${MACRO_TOTAL_GENERATIONS}: gerando capitulo...`,
          successes,
          totalSteps: MACRO_TOTAL_GENERATIONS,
        })

        const generatedResponse = await GeminiService.generateChapter(prompt, {
          model: activeModel,
        })

        startTransition(() => {
          setResponseText(generatedResponse)
          setValidationResult(null)
        })

        await sleep(MACRO_RENDER_DELAY_MS)

        const nextValidationResult = handleValidate(generatedResponse)

        if (!nextValidationResult.valid) {
          failures += 1

          updateMacroStatus({
            attempts,
            currentStep: step,
            failures,
            isRunning: true,
            message: `Falha na validacao do capitulo ${step}/${MACRO_TOTAL_GENERATIONS}.`,
            successes,
            totalSteps: MACRO_TOTAL_GENERATIONS,
          })

          await sleep(MACRO_STEP_DELAY_MS)
          continue
        }

        const saveResult = await handleAddChapterFinal(nextValidationResult, {
          metadataOverride: {
            ai_provider: GEMINI_PROVIDER_NAME,
            model: activeModel,
            plan: GEMINI_ACCESS_PLAN,
          },
          preserveView: true,
          silent: true,
        })

        if (!saveResult.saved) {
          throw new Error('Nao foi possivel salvar o capitulo gerado.')
        }

        successes += 1

        updateMacroStatus({
          attempts,
          currentStep: step,
          failures,
          isRunning: true,
          lastError: '',
          lastModel: activeModel,
          message: `Tentativa ${step}/${MACRO_TOTAL_GENERATIONS}: capitulo salvo com sucesso.`,
          successes,
          totalSteps: MACRO_TOTAL_GENERATIONS,
        })
      } catch (error) {
        failures += 1

        updateMacroStatus({
          attempts,
          currentStep: step,
          failures,
          isRunning: true,
          lastError: error.message,
          lastModel: error.model || activeModel,
          message: `Tentativa ${step}/${MACRO_TOTAL_GENERATIONS} falhou: ${error.message}`,
          successes,
          totalSteps: MACRO_TOTAL_GENERATIONS,
        })
      }

      if (step < MACRO_TOTAL_GENERATIONS) {
        updateMacroStatus({
          attempts,
          currentStep: step,
          failures,
          isRunning: true,
          message: `Aguardando 60s antes da proxima tentativa (${step + 1}/${MACRO_TOTAL_GENERATIONS}).`,
          successes,
          totalSteps: MACRO_TOTAL_GENERATIONS,
        })
        await sleep(MACRO_STEP_DELAY_MS)
      }
    }

    if (!isMountedRef.current) return

    finalizeMacroStatus({
      attempts,
      currentStep: MACRO_TOTAL_GENERATIONS,
      failures,
      message: `Macro concluida. ${successes} sucesso(s), ${failures} falha(s), ${attempts} tentativa(s). Feche este painel quando terminar de revisar.`,
      successes,
      totalSteps: MACRO_TOTAL_GENERATIONS,
    })
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const maxWidth = 300
        const maxHeight = 400
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width
            width = maxWidth
          }
        } else if (height > maxHeight) {
          width *= maxHeight / height
          height = maxHeight
        }

        canvas.width = width
        canvas.height = height

        const context = canvas.getContext('2d')
        context.drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        const updatedLN = await StorageManager.updateLN(ln.id, {
          coverImage: dataUrl,
        })
        if (updatedLN) {
          onLNChange(updatedLN)
        }
        alert('Imagem da capa guardada com sucesso!')
      }

      img.src = loadEvent.target.result
    }

    reader.readAsDataURL(file)
  }

  const handleRemoveCover = async () => {
    if (confirm('Tem certeza que deseja remover a imagem de capa?')) {
      const updatedLN = await StorageManager.updateLN(ln.id, {
        coverImage: null,
      })
      if (updatedLN) {
        onLNChange(updatedLN)
      }
    }
  }

  const macroStatusOverlay = macroStatus ? (
    <div className="fixed bottom-3 left-3 right-3 sm:top-4 sm:right-4 sm:left-auto sm:bottom-auto z-[80] w-auto sm:w-[min(92vw,24rem)] glass-effect rounded-2xl border border-cyan-400/20 px-3 py-2.5 sm:p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs sm:text-sm font-semibold text-cyan-200">
            {macroStatus.isRunning ? 'Macro Gerar +5 em execucao' : 'Macro Gerar +5'}
          </div>
          <div className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">
            Capitulo {Math.min(macroStatus.currentStep, macroStatus.totalSteps)}/
            {macroStatus.totalSteps}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {macroStatus.isRunning && (
            <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-cyan-300 animate-pulse" />
          )}
          <button
            type="button"
            onClick={dismissMacroStatus}
            disabled={macroStatus.isRunning}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-white/5 text-base sm:text-lg leading-none text-gray-300 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Fechar status da macro"
          >
            ×
          </button>
        </div>
      </div>

      <p className="text-xs sm:text-sm text-gray-200 mt-2 sm:mt-3 line-clamp-2 sm:line-clamp-none">
        {macroStatus.message}
      </p>

      <div className="sm:hidden mt-2 text-[11px] text-gray-400">
        {macroStatus.successes} sucesso(s), {macroStatus.failures} falha(s),{' '}
        {macroStatus.attempts} tentativa(s)
      </div>

      <div className="hidden sm:block mt-3 space-y-2 text-xs">
        <div className="rounded-xl bg-black/25 border border-white/8 px-3 py-2 text-gray-300">
          Modelo: <span className="text-white">{macroStatus.lastModel}</span>
        </div>
        {macroStatus.lastError && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-rose-100">
            Ultimo erro: {macroStatus.lastError}
          </div>
        )}
      </div>

      <div className="hidden sm:grid grid-cols-3 gap-2 mt-4 text-center text-xs">
        <div className="rounded-xl bg-black/30 border border-white/8 px-2 py-3">
          <div className="text-gray-400">Tentativas</div>
          <div className="text-white font-semibold mt-1">{macroStatus.attempts}</div>
        </div>
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-2 py-3">
          <div className="text-emerald-200">Sucessos</div>
          <div className="text-white font-semibold mt-1">{macroStatus.successes}</div>
        </div>
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-2 py-3">
          <div className="text-rose-200">Falhas</div>
          <div className="text-white font-semibold mt-1">{macroStatus.failures}</div>
        </div>
      </div>
    </div>
  ) : null

  if (view === 'writer') {
    return (
      <>
        <div className="min-h-screen p-8">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={() => {
                setView('main')
                setValidationResult(null)
                setResponseText('')
              }}
              className="glass-effect px-4 py-2 rounded-lg mb-6 flex items-center gap-2"
            >
              <Icons.ArrowLeft />
              Voltar
            </button>

            <div className="glass-effect p-6 md:p-8 rounded-lg">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                <button
                  onClick={() => setWriterTab('prompt')}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                    writerTab === 'prompt'
                      ? 'theme-primary-btn'
                      : 'bg-black/30 text-gray-300 hover:bg-black/50'
                  }`}
                >
                  Gerar Prompt
                </button>
                <button
                  onClick={() => setWriterTab('chapter')}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
                    writerTab === 'chapter'
                      ? 'theme-primary-btn'
                      : 'bg-black/30 text-gray-300 hover:bg-black/50'
                  }`}
                >
                  Adicionar Capitulo
                </button>
              </div>

              {writerTab === 'prompt' && (
                <div className="fade-in">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[var(--theme-accent-from)]">
                        Prompt - Capitulo {ln.chapters.length + 1}
                      </h2>
                      <p className="text-sm text-gray-400 mt-1">
                        Edite livremente antes de copiar.
                      </p>
                    </div>
                  </div>

                  <textarea
                    value={promptText}
                    onChange={(event) => setPromptText(event.target.value)}
                    className="w-full h-[60vh] theme-input rounded-lg p-4 font-mono text-sm resize-y"
                  />

                  <div className="flex flex-wrap gap-3 mt-4">
                    <button
                      onClick={() => copyToClipboard(promptText)}
                      className="theme-primary-btn px-4 py-2 rounded-lg flex items-center gap-2"
                    >
                      <Icons.Copy />
                      Copiar Prompt
                    </button>
                    <button
                      onClick={() => {
                        void runGenerationMacro()
                      }}
                      disabled={macroStatus?.isRunning}
                      className="glass-effect px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Icons.Plus />
                      {macroStatus?.isRunning ? 'Macro em andamento' : 'Gerar +5'}
                    </button>
                  </div>
                </div>
              )}

              {writerTab === 'chapter' && (
                <div className="fade-in">
                  <h2 className="text-2xl font-bold text-[var(--theme-accent-from)] mb-4">
                    Adicionar Capitulo {ln.chapters.length + 1}
                  </h2>

                  {!validationResult ? (
                    <>
                      <textarea
                        value={responseText}
                        onChange={(event) => setResponseText(event.target.value)}
                        className="w-full h-96 theme-input rounded-lg p-4 mb-4 font-mono text-sm"
                        placeholder="Cole a resposta JSON completa da IA aqui..."
                      />
                      <div className="flex flex-wrap gap-3 mt-4">
                        <button
                          onClick={handleValidate}
                          disabled={!responseText.trim()}
                          className="theme-primary-btn px-6 py-3 rounded-lg disabled:opacity-50"
                        >
                          Validar JSON
                        </button>
                        <button
                          onClick={() => {
                            setView('main')
                            setResponseText('')
                            setValidationResult(null)
                          }}
                          className="glass-effect px-6 py-3 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : validationResult.valid ? (
                    <div className="space-y-6">
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
                        <span className="text-green-400 font-semibold text-lg">
                          JSON valido!
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleAddChapterFinal}
                          className="theme-primary-btn px-8 py-3 rounded-lg font-semibold"
                        >
                          Salvar Capitulo
                        </button>
                        <button
                          onClick={() => {
                            setValidationResult(null)
                            setResponseText('')
                          }}
                          className="glass-effect px-6 py-3 rounded-lg"
                        >
                          Descartar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
                        <span className="text-red-400 font-semibold text-lg">
                          Formato invalido: {validationResult.error}
                        </span>
                      </div>
                      <div className="glass-effect p-6 rounded-lg">
                        <div className="flex items-center justify-between mb-4 gap-3">
                          <h3 className="text-lg font-semibold text-[var(--theme-accent-from)]">
                            Prompt de Correcao
                          </h3>
                          <button
                            onClick={() =>
                              copyToClipboard(
                                validationResult.correctionPrompt || '',
                              )
                            }
                            className="theme-primary-btn px-4 py-2 rounded-lg text-sm"
                          >
                            Copiar Prompt
                          </button>
                        </div>
                        <div className="theme-input rounded-lg p-4 max-h-96 overflow-y-auto">
                          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                            {validationResult.correctionPrompt}
                          </pre>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => setValidationResult(null)}
                          className="theme-primary-btn px-6 py-3 rounded-lg"
                        >
                          Tentar Novamente
                        </button>
                        <button
                          onClick={() => {
                            setView('main')
                            setValidationResult(null)
                            setResponseText('')
                          }}
                          className="glass-effect px-6 py-3 rounded-lg"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {macroStatusOverlay}
      </>
    )
  }

  if (view === 'coverPrompt') {
    return (
      <>
        <div className="min-h-screen p-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => setView('main')}
              className="glass-effect px-4 py-2 rounded-lg mb-6 flex items-center gap-2"
            >
              <Icons.ArrowLeft />
              Voltar
            </button>
            <div className="glass-effect p-8 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h2 className="text-2xl font-bold text-[var(--theme-accent-from)]">
                  Prompt - Imagem de Capa
                </h2>
              </div>

              <textarea
                value={coverPromptText}
                onChange={(event) => setCoverPromptText(event.target.value)}
                className="w-full h-[60vh] theme-input rounded-lg p-4 font-mono text-sm resize-y"
              />

              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={() => copyToClipboard(coverPromptText)}
                  className="theme-primary-btn px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Icons.Copy />
                  Copiar Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
        {macroStatusOverlay}
      </>
    )
  }

  if (view === 'read') {
    return (
      <>
        <Reader
          ln={ln}
          onBack={() => setView('main')}
          initialChapter={selectedChapter}
        />
        {macroStatusOverlay}
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className="glass-effect px-4 py-2 rounded-lg mb-6 flex items-center gap-2"
          >
            <Icons.ArrowLeft />
            Dashboard
          </button>

          <div className="glass-effect p-6 md:p-8 rounded-lg mb-6">
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="w-full md:w-56 flex-shrink-0 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => ln.coverImage && setShowCoverPreview(true)}
                  className={`w-full aspect-[3/4] bg-black/40 border border-gray-700 rounded-lg overflow-hidden relative shadow-lg ${
                    ln.coverImage ? 'cursor-zoom-in hover-glow' : ''
                  }`}
                >
                  {ln.coverImage ? (
                    <img
                      src={ln.coverImage}
                      className="w-full h-full object-cover"
                      alt="Capa"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-2 p-4 text-center">
                      <Icons.Image />
                      <span className="text-sm">Sem Capa</span>
                    </div>
                  )}
                </button>

                <div className="flex gap-2 w-full">
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="theme-soft-btn flex-1 py-2 rounded text-xs transition-colors"
                  >
                    {ln.coverImage ? 'Alterar' : 'Add Imagem'}
                  </button>
                  {ln.coverImage && (
                    <button
                      onClick={handleRemoveCover}
                      className="flex-1 bg-red-600/30 hover:bg-red-600/80 border border-red-500/30 py-2 rounded text-xs transition-colors"
                    >
                      Excluir
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  className="hidden"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                />
              </div>

              <div className="flex-1">
                <div className="mb-4">
                  <h1 className="text-3xl font-bold theme-gradient-text">
                    {ln.title}
                  </h1>
                </div>

                {ln.continuityDB?.summary && (
                  <div className="mb-4 bg-black/30 p-4 rounded-lg border border-gray-700/50">
                    <h3 className="text-sm text-[var(--theme-accent-from)] font-semibold mb-1 flex items-center gap-2">
                      <Icons.BookOpen /> Sumario
                    </h3>
                    <p className="text-sm text-gray-300 italic">
                      "{ln.continuityDB.summary}"
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
                    <div className="text-sm text-gray-400 mb-2">
                      Generos
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ln.genres?.map((genre, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-purple-500/20 text-purple-200 px-2 py-1 rounded-full"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-pink-500/10 p-4 rounded-lg border border-pink-500/20">
                    <div className="text-sm text-gray-400 mb-2">
                      Elementos
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ln.elements?.map((element, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-pink-500/20 text-pink-200 px-2 py-1 rounded-full"
                        >
                          {element}
                        </span>
                      ))}
                    </div>
                  </div>

                  {ln.notesList && ln.notesList.length > 0 && (
                    <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 sm:col-span-2">
                      <div className="text-sm text-gray-400 mb-2">
                        Notas Adicionais
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ln.notesList.map((note, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-blue-500/20 text-blue-200 px-2 py-1 rounded-full"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-gray-700/50">
              <div className="bg-green-500/10 p-4 rounded-lg border border-green-500/20">
                <div className="text-3xl font-bold text-green-300">
                  {ln.chapters.length}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Capitulos Escritos
                </div>
              </div>
              <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/20">
                <div className="text-3xl font-bold text-amber-300">
                  {ln.lastReadChapter || '-'}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  Ultimo Capitulo Lido
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6 mb-6">
            <button
              onClick={() => openWriter('prompt')}
              className="glass-effect p-4 md:p-6 rounded-lg hover-glow transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icons.Copy />
                <h3 className="text-lg md:text-xl font-semibold">
                  Escrever Capitulo
                </h3>
              </div>
              <p className="text-gray-400 text-xs md:text-sm">
                Prompt e adicao do capitulo em abas
              </p>
            </button>

            <button
              onClick={openCoverPrompt}
              className="glass-effect p-4 md:p-6 rounded-lg hover-glow transition-all text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icons.Image />
                <h3 className="text-lg md:text-xl font-semibold">
                  Prompt de Capa
                </h3>
              </div>
              <p className="text-gray-400 text-xs md:text-sm">
                Gerar imagem com proporcao 3:4
              </p>
            </button>

            <button
              onClick={() => {
                void runGenerationMacro()
              }}
              disabled={macroStatus?.isRunning}
              className="glass-effect p-4 md:p-6 rounded-lg hover-glow transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icons.Plus />
                <h3 className="text-lg md:text-xl font-semibold">
                  Gerar +5
                </h3>
              </div>
              <p className="text-gray-400 text-xs md:text-sm">
                Executa prompt, Gemini, validacao e salvamento em lote
              </p>
            </button>

            <button
              onClick={() => {
                setSelectedChapter(null)
                setView('read')
              }}
              disabled={ln.chapters.length === 0}
              className="glass-effect p-4 md:p-6 rounded-lg hover-glow transition-all text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icons.BookOpen />
                <h3 className="text-lg md:text-xl font-semibold">
                  Modo Leitura
                </h3>
              </div>
              <p className="text-gray-400 text-xs md:text-sm">
                {ln.chapters.length === 0
                  ? 'Adicione capitulos primeiro'
                  : 'Ler seus capitulos'}
              </p>
            </button>

            <button
              onClick={handleDelete}
              className="glass-effect p-4 md:p-6 rounded-lg hover:bg-red-500/10 transition-all text-left text-red-400"
            >
              <div className="flex items-center gap-3 mb-2">
                <Icons.Trash />
                <h3 className="text-lg md:text-xl font-semibold">Excluir</h3>
              </div>
              <p className="text-red-300/70 text-xs md:text-sm">
                Remove esta Light Novel do banco local
              </p>
            </button>
          </div>

          {ln.chapters.length > 0 && (
            <div className="glass-effect p-8 rounded-lg">
              <h2 className="text-2xl font-bold text-[var(--theme-accent-from)] mb-6">
                Capitulos Escritos
              </h2>
              <div className="space-y-3">
                {ln.chapters.map((chapter, idx) => (
                  <div
                    key={idx}
                    className="bg-black/30 p-4 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-all cursor-pointer"
                    onClick={() => {
                      setSelectedChapter(chapter)
                      setView('read')
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            Capitulo {chapter.number}
                          </h3>
                          {ln.lastReadChapter === chapter.number && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                              Ultima leitura
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mb-2">
                          Gerado por:{' '}
                          <span className="text-[var(--theme-accent-from)] font-medium">
                            {chapter.metadata?.ai_provider} (
                            {chapter.metadata?.model})
                          </span>
                        </div>
                      </div>
                      <Icons.BookOpen />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCoverPreview && ln.coverImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setShowCoverPreview(false)}
        >
          <button
            onClick={(event) => {
              event.stopPropagation()
              setShowCoverPreview(false)
            }}
            className="absolute top-4 right-4 glass-effect w-11 h-11 rounded-full text-2xl leading-none"
          >
            ×
          </button>
          <img
            src={ln.coverImage}
            alt="Capa em tela cheia"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

      {macroStatusOverlay}
    </>
  )
}

export default LNManager
