import ConfigManager from '../lib/configManager'

const GEMINI_API_KEY_STORAGE_KEY = 'gemini_api_key'

export const GEMINI_API_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models'
export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash'
export const GEMINI_ALTERNATIVE_MODEL = 'gemini-2.5-pro'
export const GEMINI_OVERLOADED_RETRY_DELAY_MS = 2500

export const GEMINI_MODEL_OPTIONS = [
  {
    value: GEMINI_DEFAULT_MODEL,
    label: 'Gemini 2.5 Flash',
    description: 'Mais rapido e recomendado para lotes longos.',
  },
  {
    value: GEMINI_ALTERNATIVE_MODEL,
    label: 'Gemini 2.5 Pro',
    description: 'Mais profundo, com custo e latencia maiores.',
  },
]

const buildGenerateContentUrl = (model) =>
  `${GEMINI_API_BASE_URL}/${model}:generateContent`

const buildGenerateChapterPayload = (promptText) => ({
  contents: [
    {
      role: 'user',
      parts: [{ text: promptText }],
    },
  ],
  generationConfig: {
    temperature: 0.8,
    maxOutputTokens: 16384,
    responseMimeType: 'application/json',
  },
})

const stripMarkdownJsonFence = (text) =>
  text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

const createGeminiError = (message, metadata = {}) => {
  const error = new Error(message)

  Object.assign(error, metadata)
  return error
}

const maskApiKey = (apiKey) => {
  if (!apiKey) return ''
  if (apiKey.length <= 8) return '********'

  return `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}`
}

const logGeminiRequest = ({ payload, selectedModel, url, apiKey }) => {
  console.groupCollapsed(`[Gemini API] Request -> ${selectedModel}`)
  console.log('url:', url)
  console.log('apiKey:', maskApiKey(apiKey))
  console.log('model:', selectedModel)
  console.log('payload:', payload)
  console.groupEnd()
}

const logGeminiResponse = ({
  selectedModel,
  status,
  ok,
  rawResponseText,
  parsedResponse,
}) => {
  console.groupCollapsed(`[Gemini API] Response <- ${selectedModel} [${status}]`)
  console.log('ok:', ok)
  console.log('status:', status)
  console.log('raw:', rawResponseText)
  console.log('parsed:', parsedResponse)
  console.groupEnd()
}

const getApiKeyFromLocalStorage = () =>
  globalThis.localStorage?.getItem(GEMINI_API_KEY_STORAGE_KEY)?.trim() || ''

const getApiKeyFromConfigManager = async () => {
  try {
    const apiKey = (await ConfigManager.getGeminiApiKey())?.trim() || ''

    if (apiKey) {
      globalThis.localStorage?.setItem(GEMINI_API_KEY_STORAGE_KEY, apiKey)
    }

    return apiKey
  } catch (error) {
    console.error('Nao foi possivel recuperar a chave Gemini do ConfigManager:', error)
    return ''
  }
}

export const getGeminiApiKey = async () => {
  const localApiKey = getApiKeyFromLocalStorage()

  if (localApiKey) {
    return localApiKey
  }

  return getApiKeyFromConfigManager()
}

const extractApiErrorMessage = (errorPayload) =>
  errorPayload?.error?.message ||
  errorPayload?.message ||
  'Falha ao gerar conteudo com o Gemini.'

const extractApiErrorStatus = (errorPayload) =>
  errorPayload?.error?.status || errorPayload?.status || ''

const extractApiErrorCode = (errorPayload) =>
  errorPayload?.error?.code || errorPayload?.code || ''

export const isGeminiOverloadedError = (error) =>
  error?.status === 503 || error?.code === 'OVERLOADED'

export async function generateChapter(
  promptText,
  { model } = {},
) {
  const normalizedPrompt = promptText?.trim()

  if (!normalizedPrompt) {
    throw createGeminiError('O prompt do capitulo nao pode estar vazio.', {
      code: 'EMPTY_PROMPT',
    })
  }

  const apiKey = await getGeminiApiKey()

  if (!apiKey) {
    throw createGeminiError(
      'Nenhuma Gemini API Key foi encontrada. Configure a chave em Integracao IA antes de gerar capitulos.',
      {
        code: 'MISSING_API_KEY',
      },
    )
  }

  const selectedModel = model || (await ConfigManager.getGeminiModel())
  const requestUrl = buildGenerateContentUrl(selectedModel)
  const payload = buildGenerateChapterPayload(normalizedPrompt)

  logGeminiRequest({
    payload,
    selectedModel,
    url: requestUrl,
    apiKey,
  })

  const response = await fetch(requestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(payload),
  })

  let data = null
  let rawResponseText = ''

  try {
    rawResponseText = await response.text()
    data = rawResponseText ? JSON.parse(rawResponseText) : null
  } catch (error) {
    logGeminiResponse({
      selectedModel,
      status: response.status,
      ok: response.ok,
      rawResponseText,
      parsedResponse: data,
    })

    if (!response.ok && rawResponseText) {
      throw createGeminiError(
        `Erro Gemini ${response.status}: ${rawResponseText}`,
        {
          code: 'API_ERROR',
          status: response.status,
          details: rawResponseText,
          model: selectedModel,
        },
      )
    }
  }

  logGeminiResponse({
    selectedModel,
    status: response.status,
    ok: response.ok,
    rawResponseText,
    parsedResponse: data,
  })

  if (!response.ok) {
    if (response.status === 503) {
      throw createGeminiError(
        `Modelo Gemini sobrecarregado no momento (503). Aguarde cerca de ${GEMINI_OVERLOADED_RETRY_DELAY_MS}ms antes de tentar novamente na Macro.`,
        {
          code: 'OVERLOADED',
          status: 503,
          retryable: true,
          suggestedDelayMs: GEMINI_OVERLOADED_RETRY_DELAY_MS,
          model: selectedModel,
        },
      )
    }

    const apiStatus = extractApiErrorStatus(data)
    const apiCode = extractApiErrorCode(data)
    const apiMessage = extractApiErrorMessage(data)

    throw createGeminiError(
      `Erro Gemini ${response.status}${apiStatus ? ` ${apiStatus}` : ''}: ${apiMessage}`,
      {
        code: apiCode || 'API_ERROR',
        status: response.status,
        details: data,
        model: selectedModel,
        apiMessage,
      },
    )
  }

  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    throw createGeminiError(
      'A resposta do Gemini nao trouxe texto utilizavel em data.candidates[0].content.parts[0].text.',
      {
        code: 'EMPTY_RESPONSE',
        details: data,
        model: selectedModel,
      },
    )
  }

  return stripMarkdownJsonFence(rawText)
}

const GeminiService = {
  generateChapter,
  getGeminiApiKey,
  GEMINI_MODEL_OPTIONS,
  isGeminiOverloadedError,
  GEMINI_ALTERNATIVE_MODEL,
  GEMINI_DEFAULT_MODEL,
  GEMINI_OVERLOADED_RETRY_DELAY_MS,
}

export default GeminiService
