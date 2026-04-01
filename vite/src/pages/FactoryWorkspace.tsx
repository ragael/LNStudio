import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ContinuityNotes, type Chapter } from '../db/db';
import { ChevronLeft, Copy, Check, Clipboard, RotateCcw } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatContinuityForPrompt(notes: ContinuityNotes | string): string {
  if (typeof notes === 'string') return notes;
  return [
    `📋 RESUMO:\n${notes.summary}`,
    notes.characters_present?.length ? `\n👥 PERSONAGENS:\n${notes.characters_present.map(c => `• ${c}`).join('\n')}` : '',
    notes.world_state ? `\n🌍 ESTADO DO MUNDO:\n${notes.world_state}` : '',
    notes.open_threads?.length ? `\n🔗 FIOS ABERTOS:\n${notes.open_threads.map(t => `• ${t}`).join('\n')}` : '',
    notes.next_chapter_hint ? `\n💡 PRÓXIMO CAPÍTULO (sugestão):\n${notes.next_chapter_hint}` : '',
  ].filter(Boolean).join('\n');
}

function buildPrompt(
  novelTitle: string,
  synopsis: string, chars: string, rules: string,
  chapters: Chapter[],
): string {
  const chapterNumber = chapters.length + 1;
  const isFirst = chapterNumber === 1;
  const isTempTitle = novelTitle.includes('[Título a ser gerado pela IA');

  const titleInstruction = isTempTitle 
    ? `\n⚠️ TÍTULO DA OBRA: O título atual é provisório. Você DEVE criar um título definitivo e épico para esta Light Novel e retorná-lo como "novel_title" no primeiro objeto do array.` 
    : '';

  const continuitySection = isFirst
    ? `🆕 CAPÍTULO 1 — início absoluto. Não há histórico anterior. Comece com uma abertura poderosa e envolvente que prenda o leitor imediatamente.${titleInstruction}`
    : (() => {
        const last = chapters[chapters.length - 1];
        return `Continuando após o Capítulo ${last.chapterNumber} — "${last.title}"\n\n${formatContinuityForPrompt(last.continuityNotes)}`;
      })();

  const titleForCover = isTempTitle ? '<Inserir o Título da Obra>' : novelTitle;
  const coverInstruction = isFirst
    ? `\n⚠️ CAPÍTULO 1 — o PRIMEIRO objeto do array deve obrigatoriamente conter o campo "cover_prompt": um prompt DETALHADO EM INGLÊS para geração de imagem de capa desta Light Novel (estilo anime illustration). Descreva: protagonista, cenário, estilo artístico, paleta de cores, atmosfera, e EXIJA explicitamente que o título da obra ("${titleForCover}") deve aparecer desenhado/escrito na capa.`
    : '';

  return `## ⚙️ SISTEMA — Light Novel Studio
Você é um escritor extraordinário de Light Novels japonesas. Sua missão é escrever o(s) próximo(s) capítulo(s) desta obra com qualidade literária excepcional.

### 📋 REGRAS DE ESCRITA:
- Cada capítulo deve ter entre **3.000 e 5.000 palavras** de narrativa pura
- Seja **criativo, surpreendente e emocionalmente cativante**, mas fiel ao universo desta obra
- Desenvolva diálogos ricos, aprofunde personagens, descreva ambientes com vivacidade
- Mantenha coerência absoluta com todos os fatos estabelecidos neste contexto

---

## 1. — SINOPSE, GÊNEROS E CONFIGURAÇÃO
${synopsis || '(Não definido — seja criativo e consistente!)'}

---

## 2. — LORE E REGRAS DO UNIVERSO
${rules || '(Não definido ainda — estabeleça regras coerentes ao escrever.)'}

---

## 3. — FICHAS DE PERSONAGENS E FACÇÕES
${chars || '(Não definido ainda — crie personagens memoráveis e consistentes.)'}

---

## 4. — CONTEXTO DE CONTINUIDADE
${continuitySection}

---

## 5. — QUANTIDADE DE CAPÍTULOS A GERAR${coverInstruction}

Gere o **máximo de capítulos sequenciais** que você conseguir dentro do seu limite de contexto/output, sem perder qualidade narrativa. Se puder escrever 2, 3, 4 ou mais capítulos seguidos mantendo coerência e riqueza narrativa — escreva todos. Pare apenas quando sentir que continuar comprometeria a qualidade ou a consistência da obra. A numeração começa no **Capítulo ${chapterNumber}**.

---

## 📦 RETORNE EXCLUSIVAMENTE UM ARRAY JSON VÁLIDO
(Sem texto antes ou depois. Sem blocos markdown. Puro JSON. Mesmo que gere 1 capítulo, retorne um array com 1 objeto.)

[
  {
    "chapter_title": "Título criativo para o Capítulo ${chapterNumber}",
    "chapter_text": "<p>Conteúdo HTML. Use apenas p, em, strong, br — SEM H1/H2/H3.</p>",
    "continuity_notes": {
      "summary": "Resumo detalhado (mínimo 200 palavras) de TUDO que aconteceu neste capítulo",
      "characters_present": ["Nome — estado atual, localização e motivação"],
      "world_state": "Estado do mundo e ambiente após este capítulo",
      "open_threads": ["Gancho não resolvido 1", "Gancho 2"],
      "next_chapter_hint": "Para onde a história deve ir no próximo capítulo"
    },
    "creation_date": "YYYY-MM-DD",
    "ai_author": "Seu nome e versão exata"${isFirst ? `,\n    "cover_prompt": "Prompt detalhado em inglês garantindo que o título apareça na capa"` : ''}${isTempTitle && isFirst ? `,\n    "novel_title": "O título épico definitivo gerado para a obra"` : ''}
  }
  // adicione mais objetos se gerou mais capítulos
]`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FactoryWorkspace() {
  const { id } = useParams();
  const novelId = id as string;

  const novel = useLiveQuery(() => db.novels.get(novelId), [novelId]);
  const worldSetup = useLiveQuery(() => db.worldSetups.where('novelId').equals(novelId).first(), [novelId]);
  const chapters = useLiveQuery<Chapter[]>(() => db.chapters.where('novelId').equals(novelId).sortBy('chapterNumber'), [novelId]);

  // Prompt state — editable directly by user
  const [promptText, setPromptText] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState(''); // for reset

  const [jsonInput, setJsonInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [lastCoverPrompt, setLastCoverPrompt] = useState('');
  const [coverCopied, setCoverCopied] = useState(false);

  // Build prompt from DB data whenever dependencies change
  useEffect(() => {
    if (!chapters || !worldSetup || !novel) return;
    const built = buildPrompt(
      novel.title,
      novel.synopsis || '',
      worldSetup.charactersInfo || '',
      worldSetup.worldRules || '',
      chapters,
    );
    setGeneratedPrompt(built);
    setPromptText(built);
  }, [chapters, worldSetup, novel]);

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonInput(text);
    } catch {
      alert('Não foi possível ler o clipboard. Verifique as permissões do navegador.');
    }
  };

  const copyCoverPrompt = () => {
    navigator.clipboard.writeText(lastCoverPrompt);
    setCoverCopied(true);
    setTimeout(() => setCoverCopied(false), 2000);
  };

  const parseAndSaveChapters = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // Strip possible markdown code fences
      const clean = jsonInput.trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        // Strip trailing JS-style comments (// ...) inside JSON strings — best-effort
        .replace(/\/\/[^\n"]*/g, '')
        .trim();

      const parsed = JSON.parse(clean);

      // Accept both a single object and an array
      const dataArray: Record<string, unknown>[] = Array.isArray(parsed) ? parsed : [parsed];
      if (dataArray.length === 0) throw new Error('O array retornado está vazio.');

      const required = ['chapter_title', 'chapter_text', 'continuity_notes', 'creation_date', 'ai_author'];
      let currentChapterNumber = (chapters?.length || 0) + 1;

      // Validate first
      for (let i = 0; i < dataArray.length; i++) {
        const data = dataArray[i];
        const missing = required.filter(k => !data[k]);
        if (missing.length) throw new Error(`Capítulo ${i + 1} do array: campos ausentes — ${missing.join(', ')}`);
        if (currentChapterNumber + i === 1 && !data.cover_prompt) {
          throw new Error('O Capítulo 1 da obra deve conter o campo "cover_prompt" (prompt de capa).');
        }
      }

      // Save all chapters
      for (const data of dataArray) {
        await db.chapters.add({
          id: crypto.randomUUID(),
          novelId,
          chapterNumber: currentChapterNumber,
          title: data.chapter_title as string,
          content: data.chapter_text as string,
          continuityNotes: data.continuity_notes as ContinuityNotes,
          aiAuthor: data.ai_author as string,
          aiCreatedDate: data.creation_date as string,
          coverPrompt: data.cover_prompt as string | undefined,
          createdAt: new Date().toISOString(),
        });
        currentChapterNumber++;
      }

      const updates: any = { updatedAt: new Date().toISOString() };
      const isFirstGenerated = (chapters?.length || 0) === 0;
      if (isFirstGenerated && dataArray[0].novel_title) {
        updates.title = dataArray[0].novel_title;
      }
      await db.novels.update(novelId, updates);

      const firstCover = dataArray[0].cover_prompt as string | undefined;
      if (firstCover) setLastCoverPrompt(firstCover);

      const count = dataArray.length;
      setSuccessMsg(`✅ ${count} capítulo${count > 1 ? 's' : ''} adicionado${count > 1 ? 's' : ''} com sucesso!`);
      setJsonInput('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: unknown) {
      setErrorMsg('Erro: ' + (e instanceof Error ? e.message : 'JSON inválido ou mal formatado'));
    }
  };

  if (!novel) return <div className="container" style={{ paddingTop: '2rem' }}>Carregando...</div>;

  return (
    <div className="container">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to={`/novel/${novel.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <ChevronLeft size={18} /> Detalhes
        </Link>
      </div>

      <div className="factory-header">
        <div>
          <h1 style={{ color: 'var(--accent-color)', fontSize: '1.75rem' }}>Fábrica de Capítulos</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {novel.title} — a partir do Capítulo {(chapters?.length || 0) + 1}
          </p>
        </div>
        <Link to={`/novel/${novel.id}/read`} style={{ color: 'var(--text-primary)', background: 'var(--bg-surface)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
          Abrir Leitor
        </Link>
      </div>

      <div className="grid-2col" style={{ marginBottom: '2rem' }}>

        {/* ── LEFT: Prompt Editor ── */}
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ background: 'var(--accent-color)', color: '#fff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', flexShrink: 0 }}>1</span>
              Prompt Mestre — Cap. {(chapters?.length || 0) + 1}+
            </h3>
          </div>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Edite diretamente se quiser ajustar antes de copiar. O prompt inclui o contexto de continuidade do último capítulo e instrui a IA a gerar o <strong>máximo de capítulos possível</strong>.
          </p>

          <textarea
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            rows={18}
            style={{ fontFamily: 'monospace', fontSize: '0.78rem', background: 'var(--bg-color)', resize: 'vertical', lineHeight: 1.55 }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPromptText(generatedPrompt)}
              style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}
            >
              <RotateCcw size={12} /> Regenerar prompt
            </button>

            <button onClick={copyPrompt} style={{
              background: copied ? 'var(--success-color)' : 'var(--accent-color)',
              color: copied ? '#000' : 'white',
              padding: '0.7rem 1.5rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: 700,
            }}>
              {copied ? <><Check size={18} /> Copiado!</> : <><Copy size={18} /> Copiar Prompt</>}
            </button>
          </div>
        </div>

        {/* ── RIGHT: Paste & Validate ── */}
        <div style={{ background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: 'var(--success-color)', color: '#000', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', flexShrink: 0 }}>2</span>
            Processar Retorno da IA
          </h3>

          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Cole o <strong>array JSON</strong> retornado pela IA. Pode conter 1 ou mais capítulos. Campos obrigatórios por capítulo: <code style={{ color: 'var(--accent-color)', fontSize: '0.75rem' }}>chapter_title, chapter_text, continuity_notes, creation_date, ai_author</code>
            {(chapters?.length || 0) === 0 && <><br /><strong style={{ color: 'var(--accent-color)' }}>Cap. 1: o primeiro objeto deve ter cover_prompt.</strong></>}
          </p>

          <textarea
            value={jsonInput}
            onChange={e => { setJsonInput(e.target.value); setErrorMsg(''); setSuccessMsg(''); }}
            placeholder={`[\n  {\n    "chapter_title": "...",\n    "chapter_text": "<p>...</p>",\n    "continuity_notes": { ... },\n    "creation_date": "2025-04-01",\n    "ai_author": "..."\n  }\n]`}
            rows={18}
            style={{
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              background: 'var(--bg-color)',
              resize: 'vertical',
              border: errorMsg ? '1px solid var(--danger-color)' : undefined,
            }}
          />

          <button onClick={pasteFromClipboard} style={{
            background: 'rgba(255,255,255,0.06)',
            color: 'var(--text-primary)',
            padding: '0.6rem',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'center',
            gap: '0.4rem',
            fontWeight: 500,
            border: '1px solid var(--border-color)',
            fontSize: '0.875rem',
          }}>
            <Clipboard size={16} /> Colar do Clipboard
          </button>

          {errorMsg && (
            <div style={{ background: '#2a1515', color: 'var(--danger-color)', padding: '0.8rem 1rem', borderRadius: '8px', fontSize: '0.8rem', border: '1px solid rgba(239,68,68,0.3)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div style={{ background: '#0d2b1a', color: 'var(--success-color)', padding: '0.8rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, border: '1px solid rgba(16,185,129,0.3)' }}>
              {successMsg}
            </div>
          )}

          <button
            onClick={parseAndSaveChapters}
            disabled={!jsonInput.trim()}
            style={{
              background: 'var(--success-color)',
              color: '#000',
              padding: '1rem',
              borderRadius: '8px',
              fontWeight: 700,
              opacity: jsonInput.trim() ? 1 : 0.4,
              cursor: jsonInput.trim() ? 'pointer' : 'not-allowed',
              marginTop: 'auto',
            }}
          >
            Validar e Adicionar à Novel
          </button>
        </div>

      </div>

      {/* ── Cover Prompt Banner ── */}
      {lastCoverPrompt && (
        <div style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: 'var(--accent-hover)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🎨 Prompt de Capa Gerado!
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Cole este prompt em uma IA de imagem (Midjourney, Stable Diffusion, Firefly...) e depois faça upload da capa na tela de Detalhes.
          </p>
          <textarea
            readOnly
            value={lastCoverPrompt}
            rows={4}
            style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: 'var(--bg-color)', resize: 'vertical', marginBottom: '0.75rem' }}
          />
          <button onClick={copyCoverPrompt} style={{
            background: coverCopied ? 'var(--success-color)' : 'var(--accent-color)',
            color: coverCopied ? '#000' : '#fff',
            padding: '0.6rem 1.2rem',
            borderRadius: '8px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            {coverCopied ? <><Check size={16} /> Copiado!</> : <><Copy size={16} /> Copiar Prompt de Capa</>}
          </button>
        </div>
      )}
    </div>
  );
}
