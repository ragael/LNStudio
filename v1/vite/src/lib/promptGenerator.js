const PromptGenerator = {
  generateInitialPrompt: (config) => {
    const notesSection =
      config.notesList && config.notesList.length > 0
        ? `NOTAS ADICIONAIS:\n${config.notesList.map((note) => `- ${note}`).join('\n')}`
        : ''

    const titleInstruction =
      !config.title || config.title.trim() === ''
        ? 'IMPORTANTE: Como nenhum titulo foi fornecido, OBRIGATORIAMENTE crie um titulo criativo e apropriado para esta light novel baseado nos generos e elementos escolhidos.'
        : `Titulo da obra: "${config.title}"`

    return `Voce e um autor de light novels e vai criar uma historia serializada original para mim. Tem total liberdade criativa.

${titleInstruction}

DIRETRIZES DE ESTILO:
- Generos: ${config.genres.join(', ')}
- Narrativa: Primeira pessoa
- Capitulos: Longos (3000-5000 palavras)

DIRETRIZES DE ESTILO E CRIATIVIDADE:
- Temperatura de Criatividade: 0.8.
- Tropos e Cliches: Abrace os elementos classicos de Light Novels, animes e mangas. Use os cliches, mas execute-os de forma interessante.
- Sensorial e Hype: Descreva magia, combates e cenarios com impacto visual e emocional.
- Dialogos Vivos: De personalidades e vozes distintas aos personagens.

ELEMENTOS QUE DEVO INCLUIR:
${config.elements.map((element) => `- ${element}`).join('\n')}

${notesSection}

SUA MISSAO:
1. Crie tudo: mundo, personagens, premissa, sistema de poder e enredo principal.
2. ${!config.title ? 'Crie um titulo criativo para a obra' : 'Use o titulo fornecido'}.
3. Escreva o Capitulo 1 completo.
4. Mantenha consistencia absoluta e prepare o terreno para os proximos capitulos.

FORMATO DE RESPOSTA OBRIGATORIO - JSON

A sua resposta DEVE ser APENAS um JSON valido neste formato EXATO:

{
  "title": "${!config.title ? 'CRIE UM TITULO CRIATIVO AQUI' : config.title}",
  "metadata": {
    "ai_provider": "SEU_NOME",
    "model": "SEU_MODELO",
    "plan": "TIPO_DE_ACESSO",
    "generated_at": "${new Date().toISOString()}"
  },
  "chapter": {
    "number": 1,
    "content": "ESCREVA TODO O CAPITULO 1 AQUI. Use \\n para quebras de linha."
  },
  "continuity": {
    "summary": "Resumo de 2-3 frases do que aconteceu no Capitulo 1",
    "protagonist": {
      "name": "Nome do protagonista",
      "age": "Idade",
      "level_power": "Nivel/Rank/Poder atual",
      "abilities": ["Lista", "de", "habilidades"],
      "current_goal": "Objetivo atual do protagonista"
    },
    "secondary_characters": [
      {
        "name": "Nome do personagem secundario",
        "relationship": "Relacao com protagonista",
        "traits": "Tracos principais"
      }
    ],
    "worldbuilding": {
      "current_location": "Local atual",
      "world_rules": "Regras importantes estabelecidas",
      "organizations": ["Lista", "de", "organizacoes"]
    },
    "power_system": {
      "mechanics": "Como o sistema funciona",
      "progression": "Como os personagens evoluem"
    },
    "plot_threads": {
      "main": "Descricao da linha narrativa principal",
      "secondary": ["Sub-trama 1", "Sub-trama 2"]
    },
    "next_chapter_suggestions": [
      "Sugestao 1",
      "Sugestao 2",
      "Sugestao 3"
    ]
  }
}

REGRAS CRITICAS:
1. Retorne APENAS o JSON.
2. Use aspas duplas.
3. Para quebras de linha no conteudo, use \\n.
4. Preencha todos os campos.
5. O campo "content" deve conter TODO o capitulo narrativo.
6. Certifique-se de que o JSON e valido.

COMECE AGORA - Responda APENAS com o JSON:`
  },

  generateContinuationPrompt: (ln, chapterNumber) => {
    const notesSection =
      ln.notesList && ln.notesList.length > 0
        ? `\nNOTAS ADICIONAIS DA OBRA:\n${ln.notesList.map((note) => `- ${note}`).join('\n')}`
        : ''

    return `CONTINUIDADE DA HISTORIA - A PARTIR DO CAPITULO ${chapterNumber}

CONTEXTO DA OBRA:
- Titulo: ${ln.title || 'Sem titulo definido'}
- Generos: ${ln.genres.join(', ')}
- Elementos: ${ln.elements.join(', ')}${notesSection}

DIRETRIZES DE ESTILO E CRIATIVIDADE:
- Temperatura de Criatividade: 0.8.
- Tropos e Cliches: Use os elementos classicos de light novels, mas com execucao interessante.
- Sensorial e Hype: Descreva magia, combates e cenarios com impacto.
- Dialogos Vivos: De vozes distintas aos personagens.

REGISTRO DE CONTINUIDADE ATUAL:
${typeof ln.continuityDB === 'string' ? ln.continuityDB : JSON.stringify(ln.continuityDB, null, 2)}

INSTRUCOES IMPORTANTES:
1. Continue a historia mantendo TOTAL consistencia com os capitulos anteriores.
2. Gere quantos capitulos completos e consecutivos conseguir sem perder o contexto e a consistencia.
3. Se voce perceber que vai perder o contexto ou a consistencia no proximo capitulo, pare antes dele e nao comece esse capitulo.
4. Cada capitulo deve ter 3000-5000 palavras, em primeira pessoa.
5. Avance a narrativa de forma significativa.
6. Mantenha os generos e elementos escolhidos: ${ln.genres.join(', ')}.
7. Use as informacoes do registro de continuidade.

FORMATO DE RESPOSTA OBRIGATORIO - JSON

A sua resposta DEVE ser APENAS um JSON valido neste formato EXATO:

{
  "metadata": {
    "ai_provider": "SEU_NOME",
    "model": "SEU_MODELO",
    "plan": "TIPO_DE_ACESSO",
    "generated_at": "${new Date().toISOString()}"
  },
  "chapters": [
    {
      "number": ${chapterNumber},
      "content": "CAPITULO ${chapterNumber} COMPLETO AQUI. Use \\n para quebras de linha."
    },
    {
      "number": ${chapterNumber + 1},
      "content": "CAPITULO ${chapterNumber + 1} COMPLETO AQUI, SOMENTE SE VOCE CONSEGUIR MANTER O CONTEXTO."
    }
  ],
  "continuity": {
    "summary": "Resumo do estado da historia apos o ULTIMO capitulo gerado neste lote",
    "protagonist": {
      "name": "Nome consistente",
      "age": "Idade",
      "level_power": "Atualize com a progressao mais recente",
      "abilities": ["Atualize", "habilidades", "atuais"],
      "current_goal": "Objetivo atual apos o ultimo capitulo gerado"
    },
    "secondary_characters": [
      {
        "name": "Atualize ou adicione personagens",
        "relationship": "Atualize relacoes",
        "traits": "Mantenha consistente"
      }
    ],
    "worldbuilding": {
      "current_location": "Local atual apos o ultimo capitulo gerado",
      "world_rules": "Adicione novas regras descobertas",
      "organizations": ["Atualize", "a", "lista"]
    },
    "power_system": {
      "mechanics": "Adicione novos detalhes se descobertos",
      "progression": "Atualize com a progressao mais recente"
    },
    "plot_threads": {
      "main": "Atualize a trama principal",
      "secondary": ["Atualize", "sub-tramas"]
    },
    "next_chapter_suggestions": [
      "Sugestao para o proximo capitulo apos o lote",
      "Outra sugestao",
      "Mais uma sugestao"
    ]
  }
}

REGRAS CRITICAS:
1. Retorne APENAS o JSON.
2. O array "chapters" deve conter apenas capitulos completos, consecutivos e seguros em contexto.
3. Se voce so conseguir manter um capitulo com qualidade, retorne apenas um item em "chapters".
4. Nao comecar um capitulo que voce nao consiga concluir mantendo o contexto.
5. Atualize o campo "continuity" para refletir o estado APOS o ultimo capitulo gerado.
6. Use aspas duplas.
7. Para quebras de linha no conteudo, use \\n.

COMECE AGORA - Responda APENAS com o JSON:`
  },

  generateCoverPrompt: (ln) => {
    const protagonistInfo = ln.continuityDB?.protagonist
      ? `Character focus: ${ln.continuityDB.protagonist.name}, ${ln.continuityDB.protagonist.age} years old. ${ln.continuityDB.protagonist.traits || ''}.`
      : ''
    const summary = ln.continuityDB?.summary
      ? `Context: ${ln.continuityDB.summary}`
      : ''

    return `Act as an expert prompt engineer for image generation models such as Midjourney, DALL-E, and Stable Diffusion.
I need a cover illustration for my Light Novel.

WORK DATA:
- Title: ${ln.title}
- Genres: ${ln.genres.join(', ')}
- Elements: ${ln.elements.join(', ')}

PROMPT REQUIREMENTS:
1. Generate the prompt in ENGLISH.
2. The artistic style must reflect modern Japanese light novel covers.
3. Include atmosphere, setting details, and the main character based on:
   ${protagonistInfo}
   ${summary}
4. MANDATORY: the final image must visibly include the Light Novel title "${ln.title}" as part of the cover design, integrated in a readable and stylish way.
5. MANDATORY: the final image must use portrait proportions, approximately 300x400, with aspect ratio 3:4. Include the ratio command at the end of the generated prompt when relevant (example: "--ar 3:4").

Return ONLY the generated English prompt, with no extra commentary.`
  },
}

export default PromptGenerator
