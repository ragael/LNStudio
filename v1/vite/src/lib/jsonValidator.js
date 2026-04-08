const normalizeChapters = (data) => {
  if (Array.isArray(data.chapters)) return data.chapters
  if (data.chapter) return [data.chapter]
  return []
}

const JSONValidator = {
  validate: (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      const chapters = normalizeChapters(data)

      if (!data.metadata || chapters.length === 0 || !data.continuity) {
        return {
          valid: false,
          error:
            'Estrutura JSON incompleta. Sao obrigatorios: metadata, chapter/chapters e continuity.',
        }
      }

      if (
        !data.metadata.ai_provider ||
        !data.metadata.model ||
        !data.metadata.plan
      ) {
        return {
          valid: false,
          error:
            'Metadata incompleto. E obrigatorio informar: ai_provider, model e plan.',
        }
      }

      const invalidChapter = chapters.find(
        (chapter) =>
          typeof chapter?.number !== 'number' ||
          !chapter?.content ||
          typeof chapter.content !== 'string',
      )

      if (invalidChapter) {
        return {
          valid: false,
          error:
            'Cada capitulo precisa ter "number" numerico e "content" como string.',
        }
      }

      if (!data.continuity.summary || !data.continuity.protagonist) {
        return {
          valid: false,
          error:
            'Continuity incompleto. E obrigatorio ter summary e protagonist.',
        }
      }

      return {
        valid: true,
        data: {
          ...data,
          chapters,
        },
      }
    } catch (error) {
      return {
        valid: false,
        error: `JSON invalido: ${error.message}`,
        parseError: true,
      }
    }
  },

  extractJSON: (text) => {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) return jsonMatch[0]
    return text
  },

  generateCorrectionPrompt: (originalText, error) => {
    return `ERRO DE FORMATO DETECTADO
A resposta anterior nao esta no formato JSON correto.
ERRO: ${error}

FORMATO CORRETO OBRIGATORIO:
{
  "metadata": { "ai_provider": "...", "model": "...", "plan": "...", "generated_at": "..." },
  "chapters": [
    { "number": 1, "content": "..." }
  ],
  "continuity": {
    "summary": "...",
    "protagonist": { "name": "...", "age": "...", "level_power": "...", "abilities": [], "current_goal": "..." },
    "secondary_characters": [],
    "worldbuilding": { "current_location": "...", "world_rules": "...", "organizations": [] },
    "power_system": { "mechanics": "...", "progression": "..." },
    "plot_threads": { "main": "...", "secondary": [] },
    "next_chapter_suggestions": []
  }
}

Se houver apenas um capitulo, o array "chapters" pode conter apenas um item.

RESPOSTA ANTERIOR QUE PRECISA SER CONVERTIDA:
${originalText.substring(0, 1000)}...

Agora, reformate sua resposta anterior no formato JSON correto:`
  },
}

export default JSONValidator
