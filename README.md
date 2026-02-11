# 📚 Light Novel Manager

Um gerenciador profissional de Light Novels geradas por IA, com suporte para múltiplos modelos (Claude, GPT, Gemini, etc).

![Theme](https://img.shields.io/badge/theme-dark-purple)
![Storage](https://img.shields.io/badge/storage-localStorage-blue)
![Framework](https://img.shields.io/badge/framework-React-61dafb)

## ✨ Funcionalidades

### 📱 PWA (Progressive Web App)
- ✅ **Instalar como app nativo** - Ícone na tela inicial
- ✅ **Funciona offline** - Continua funcionando sem internet
- ✅ **Carregamento rápido** - Cache inteligente
- ✅ **Atualizações automáticas** - Notifica quando há nova versão
- ✅ **Experiência nativa** - Abre em tela cheia

### 🎨 Geração de Capas com IA
- ✅ **IA 100% gratuita** - Usando Puter.js (Flux, DALL-E, Stable Diffusion)
- ✅ **Sem API key necessária** - Funciona direto
- ✅ **Automática** - Baseada nos dados da sua LN
- ✅ **Customizável** - Regenere quantas vezes quiser
- ✅ **Download** - Baixe a capa em alta resolução
- ✅ **Preview** - Veja antes de salvar

### 📖 Gerenciamento Completo
- ✅ Criar múltiplas Light Novels com configurações personalizadas
- ✅ Formulário em 3 etapas para customização total
- ✅ Dashboard com visão geral de todas as suas histórias
- ✅ Exportar/Importar backups em JSON

### 🤖 Suporte Multi-IA
- ✅ Funciona com **qualquer IA** (Claude, ChatGPT, Gemini, LLaMA, etc)
- ✅ **Formato JSON padronizado** - sem ambiguidades
- ✅ **Validação automática** - detecta erros instantaneamente
- ✅ **Prompt de correção** - gera automaticamente se formato estiver errado
- ✅ **Rastreamento completo** - sabe qual IA/modelo/plano gerou cada capítulo

### 📝 Sistema de Capítulos
- ✅ Geração automática de prompts contextualizados
- ✅ Banco de dados de continuidade mantido automaticamente
- ✅ Metadados completos (IA provider, modelo, plano, data de geração)
- ✅ Copiar prompt com um clique
- ✅ Preview antes de salvar

### 📱 Leitor Avançado
- ✅ Modo leitura com controles customizáveis
- ✅ Ajuste de fonte (tamanho, tipo, espaçamento)
- ✅ Temas (Dark, Sépia, Preto Puro)
- ✅ Navegação entre capítulos
- ✅ Interface limpa e sem distrações

### 💾 Dados Persistentes
- ✅ Tudo salvo em **IndexedDB** (não localStorage!)
- ✅ **Capas em Base64** - permanentes e offline
- ✅ **Até 500MB+ de dados** (vs 5MB do localStorage)
- ✅ Dados sobrevivem ao fechar o navegador
- ✅ Backup/Restore via JSON
- ✅ Sem necessidade de servidor
- ✅ **Migração automática** do localStorage (se existir)

---

## 🚀 Como Usar

### 1️⃣ Criar Nova Light Novel

1. Clique em **"Nova Light Novel"**
2. Preencha o formulário em 3 etapas:
   - **Etapa 1:** Título, gêneros, tom
   - **Etapa 2:** Elementos da história, foco principal
   - **Etapa 3:** Intensidades (ação/SoL), romance, notas adicionais
3. Clique em **"Criar Light Novel"**

### 2️⃣ Gerar Primeiro Capítulo

1. Na tela da LN, clique em **"Gerar Prompt"**
2. Copie o prompt gerado
3. Cole na sua IA favorita (Claude, GPT, Gemini, etc)
4. A IA responderá em formato JSON

### 3️⃣ Adicionar o Capítulo

1. Clique em **"Adicionar Capítulo"**
2. Cole a resposta completa da IA
3. Clique em **"Validar JSON"**
4. ✅ Se válido → Preview e salvar
5. ❌ Se inválido → Copie o prompt de correção e tente novamente

### 4️⃣ Continuar a História

1. Clique em **"Gerar Prompt"** novamente
2. O prompt agora incluirá todo o contexto anterior
3. Cole na IA → Receba capítulo 2
4. Adicione ao app
5. Repita o processo!

### 5️⃣ Ler seus Capítulos

1. Clique em **"Modo Leitura"**
2. Ajuste fonte, tamanho, tema conforme preferir
3. Navegue entre capítulos com os botões
4. Aproveite sua história! 📖

### 6️⃣ Gerar Capa (Opcional)

1. Na tela da LN, clique em **"Gerar Capa"**
2. Clique em **"Gerar Capa"** novamente
3. Aguarde alguns segundos
4. ✨ Capa gerada automaticamente!
5. **Opções:**
   - 🔄 Gerar outra (se não gostou)
   - 💾 Baixar capa
   - ✅ Salvar como capa oficial

### 7️⃣ Instalar como App (PWA)

**No Desktop (Chrome/Edge):**
1. Aparecerá botão **"Instalar App"** no dashboard
2. Clique nele
3. Confirme a instalação
4. Pronto! App instalado

**No Mobile (iPhone/Android):**
1. Abra no navegador (Safari/Chrome)
2. Toque no menu (três pontinhos ou ícone compartilhar)
3. Selecione **"Adicionar à tela inicial"**
4. Confirme
5. Ícone aparece na tela inicial! 🎉

---

## 📋 Formato JSON Obrigatório

A IA deve responder neste formato:

```json
{
  "metadata": {
    "ai_provider": "Claude",
    "model": "claude-sonnet-4",
    "plan": "Pro",
    "generated_at": "2026-02-09T12:00:00.000Z"
  },
  "chapter": {
    "number": 1,
    "content": "Todo o conteúdo narrativo do capítulo aqui..."
  },
  "continuity": {
    "summary": "Resumo de 2-3 frases",
    "protagonist": {
      "name": "Nome",
      "age": "17",
      "level_power": "Nível 5",
      "abilities": ["Habilidade 1", "Habilidade 2"],
      "current_goal": "Objetivo atual"
    },
    "secondary_characters": [
      {
        "name": "Personagem",
        "relationship": "Amigo",
        "traits": "Leal e corajoso"
      }
    ],
    "worldbuilding": {
      "current_location": "Cidade Capital",
      "world_rules": "Magia baseada em elementos",
      "organizations": ["Guilda de Aventureiros", "Academia de Magia"]
    },
    "power_system": {
      "mechanics": "Sistema de níveis e classes",
      "progression": "XP por missões e combates"
    },
    "plot_threads": {
      "main": "Busca por poder para proteger a cidade",
      "secondary": ["Romance em desenvolvimento", "Mistério da origem"]
    },
    "next_chapter_suggestions": [
      "Primeira missão de guilda",
      "Encontro com rival",
      "Descoberta de nova habilidade"
    ]
  }
}
```

---

## 🎨 Personalização de LN

Cada Light Novel pode ser customizada com:

### Gêneros
Isekai, Slice of Life, Ficção Científica, Aventura, Fantasia, Romance, Mistério, Ação, Comédia, Drama, Horror, Cyberpunk

### Elementos
- Sistema de poderes/magia com progressão gradual
- Tecnologia high-tech e/ou industrialização
- Gestão de negócios, economia, guildas
- Crafting e criação de itens
- Política e intrigas
- Dungeon crawling
- Viagem entre mundos
- Construção de império
- Sistema de classes/jobs

### Controles de Intensidade
- **Ação:** 0-10
- **Slice of Life:** 0-10
- **Romance:** Sem romance / Secundário / Importante / Central / Harem

### Tom
- Leve com toques dramáticos
- Predominantemente leve e cômico
- Equilibrado entre leve e dramático
- Dramático com momentos leves
- Sério e sombrio

---

## 💡 Dicas e Melhores Práticas

### ✅ Para Melhores Resultados

1. **Seja específico** nas configurações iniciais
2. **Revise o JSON** antes de salvar (use o preview)
3. **Faça backups** regularmente (exportar JSON)
4. **Use a mesma IA/modelo** para consistência de estilo
5. **Leia os capítulos anteriores** antes de gerar novos

### ⚠️ Solução de Problemas

**JSON Inválido?**
- Use o prompt de correção automático
- Verifique vírgulas, aspas e chaves
- Cole em um validador JSON online se necessário

**IA não seguiu o formato?**
- Copie o prompt de correção
- Cole na IA junto com a resposta anterior
- A IA reformatará automaticamente

**Perdeu dados?**
- Dados estão em localStorage (por navegador/dispositivo)
- Use Export/Import para fazer backups
- Não limpe cache do navegador sem backup

---

## 🛠️ Tecnologias

- **Frontend:** React 18 (via CDN)
- **Estilização:** Tailwind CSS (via CDN)
- **Storage:** localStorage API
- **Formato:** JSON
- **Tema:** Dark Mode

---

## 📱 Acesso Mobile

O app é totalmente responsivo! Você pode:

1. **Abrir no celular** → Funciona perfeitamente
2. **"Adicionar à Tela Inicial"** → Vira um app nativo
3. **Usar offline** → Dados salvos localmente

---

## 🔒 Privacidade

- ✅ **100% local** - nenhum dado sai do seu navegador
- ✅ **Sem servidor** - não enviamos nada para ninguém
- ✅ **Sem login** - não coletamos informações pessoais
- ✅ **Open source** - código totalmente transparente

---

## 📦 Backup e Restauração

### Exportar
1. Dashboard → Botão de download no card da LN
2. Salva arquivo `.json` com tudo

### Importar
1. Dashboard → Botão "Importar"
2. Cole o JSON do backup
3. Pronto!

---

## 🎯 Roadmap (Possíveis Melhorias Futuras)

- [ ] Sincronização em nuvem (Google Drive, Dropbox)
- [ ] Compartilhamento de LNs (gerar link público)
- [ ] Análise de consistência (detectar contradições)
- [ ] Geração de imagens (capas, ilustrações)
- [ ] Estatísticas (palavras totais, tempo de leitura)
- [ ] Modo colaborativo (múltiplos autores)
- [ ] Export para EPUB/PDF

---

## 🤝 Contribuindo

Sugestões e melhorias são bem-vindas! Abra uma issue ou pull request.

---

## 📄 Licença

MIT License - Use livremente!

---

## 🌟 Feito com

- ☕ Muita imaginação
- 🤖 Ajuda de IA (Claude, claro!)
- 💜 Amor por Light Novels

---

**Divirta-se criando suas histórias épicas!** 🚀📖✨
