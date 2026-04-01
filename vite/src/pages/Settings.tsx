import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, DatabaseBackup, Upload, Check } from 'lucide-react';
import { exportDB, importInto } from 'dexie-export-import';
import { db } from '../db/db';

// ── Constants ─────────────────────────────────────────────────────────────────

const THEMES = [
  {
    id: 'eclipse',
    name: 'Eclipse',
    desc: 'Marinha escura + violeta',
    bg: '#0b0c10',
    surface: '#16171c',
    accent: '#8b5cf6',
    text: '#f0f0f5',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    desc: 'Preto absoluto + dourado',
    bg: '#090909',
    surface: '#12100c',
    accent: '#c9a227',
    text: '#f0e6c0',
  },
  {
    id: 'floresta',
    name: 'Floresta',
    desc: 'Verde profundo + lima',
    bg: '#070d09',
    surface: '#0c1610',
    accent: '#38a157',
    text: '#c8e8d0',
  },
  {
    id: 'crepusculo',
    name: 'Crepúsculo',
    desc: 'Marrom quente + âmbar',
    bg: '#100b06',
    surface: '#18120a',
    accent: '#e07840',
    text: '#f0dcc0',
  },
  {
    id: 'pergaminho',
    name: 'Pergaminho',
    desc: 'Sépia claro + mogno',
    bg: '#f5ede0',
    surface: '#ece0cc',
    accent: '#7c4a1e',
    text: '#2c1f0e',
  },
];

const FONTS = [
  { id: 'merriweather', label: 'Merriweather', css: "'Merriweather', Georgia, serif", sample: 'Aa' },
  { id: 'georgia', label: 'Georgia', css: "Georgia, 'Times New Roman', serif", sample: 'Aa' },
  { id: 'crimson', label: 'Crimson Text', css: "'Crimson Text', Georgia, serif", sample: 'Aa' },
  { id: 'inter', label: 'Inter', css: "'Inter', system-ui, sans-serif", sample: 'Aa' },
  { id: 'lato', label: 'Lato', css: "'Lato', system-ui, sans-serif", sample: 'Aa' },
];

const FONT_SIZES = [
  { id: 'sm', label: 'Pequena', css: '1rem' },
  { id: 'md', label: 'Média', css: '1.15rem' },
  { id: 'lg', label: 'Grande', css: '1.3rem' },
  { id: 'xl', label: 'Extra Grande', css: '1.5rem' },
];

const SPACINGS = [
  { id: 'compact', label: 'Compacto', css: '1.6' },
  { id: 'comfortable', label: 'Confortável', css: '1.9' },
  { id: 'spacious', label: 'Espaçoso', css: '2.3' },
];

// ── Helper ────────────────────────────────────────────────────────────────────

export function applyTheme(themeId: string) {
  document.documentElement.setAttribute('data-theme', themeId);
}

export function getReaderStyles(): { fontFamily: string; fontSize: string; lineHeight: string } {
  const fontId = localStorage.getItem('reader_font') || 'merriweather';
  const sizeId = localStorage.getItem('reader_size') || 'md';
  const spacingId = localStorage.getItem('reader_spacing') || 'comfortable';
  return {
    fontFamily: FONTS.find(f => f.id === fontId)?.css || FONTS[0].css,
    fontSize: FONT_SIZES.find(f => f.id === sizeId)?.css || '1.15rem',
    lineHeight: SPACINGS.find(f => f.id === spacingId)?.css || '1.9',
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'eclipse');
  const [font, setFont] = useState(localStorage.getItem('reader_font') || 'merriweather');
  const [size, setSize] = useState(localStorage.getItem('reader_size') || 'md');
  const [spacing, setSpacing] = useState(localStorage.getItem('reader_spacing') || 'comfortable');
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('reader_font', font); }, [font]);
  useEffect(() => { localStorage.setItem('reader_size', size); }, [size]);
  useEffect(() => { localStorage.setItem('reader_spacing', spacing); }, [spacing]);

  const handleExport = async () => {
    try {
      const blob = await exportDB(db);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `LightNovelStudio_Backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Erro ao exportar o backup.'); }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (confirm('ATENÇÃO: Importar este backup vai mesclar os dados e sobrescrever conflitos. Confirmar?')) {
        try {
          await importInto(db, file, { overwriteValues: true, clearTablesBeforeImport: false });
          
          // Post-process deletions
          const deleted = await db.deletedNovels.toArray();
          for (const d of deleted) {
            await db.novels.delete(d.id);
            await db.chapters.where('novelId').equals(d.id).delete();
            await db.worldSetups.where('novelId').equals(d.id).delete();
          }

          setImportSuccess(true);
          setTimeout(() => { setImportSuccess(false); window.location.reload(); }, 1500);
        } catch { alert('Erro ao importar. Verifique se o arquivo é válido.'); }
      }
    }
    e.target.value = '';
  };

  // Live preview styles
  const previewFont = FONTS.find(f => f.id === font)?.css || FONTS[0].css;
  const previewSize = FONT_SIZES.find(f => f.id === size)?.css || '1.15rem';
  const previewSpacing = SPACINGS.find(f => f.id === spacing)?.css || '1.9';

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-color)',
    borderRadius: '16px',
    padding: '1.75rem',
    marginBottom: '1.5rem',
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <ChevronLeft size={18} /> Estante
      </Link>

      <h1 style={{ fontSize: '2rem', marginBottom: '0.375rem' }}>⚙️ Configurações</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>Personalize a interface e o leitor</p>

      {/* ── Temas ── */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.375rem' }}>🎨 Tema da Interface</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Escolha a paleta de cores do aplicativo</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem' }}>
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                borderRadius: '12px',
                border: theme === t.id ? `2px solid var(--accent-color)` : '2px solid transparent',
                overflow: 'hidden',
                cursor: 'pointer',
                textAlign: 'left',
                background: 'transparent',
                padding: 0,
                boxShadow: theme === t.id ? '0 0 0 3px rgba(139,92,246,0.2)' : 'none',
                transform: 'none',
              }}
            >
              {/* Mini preview */}
              <div style={{ background: t.bg, padding: '0.75rem', position: 'relative' }}>
                <div style={{ background: t.surface, borderRadius: '6px', padding: '0.5rem', marginBottom: '0.4rem' }}>
                  <div style={{ width: '60%', height: '6px', background: t.text, borderRadius: '3px', opacity: 0.9, marginBottom: '0.3rem' }} />
                  <div style={{ width: '40%', height: '5px', background: t.text, borderRadius: '3px', opacity: 0.4 }} />
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  <div style={{ width: '28px', height: '12px', background: t.accent, borderRadius: '4px', opacity: 0.9 }} />
                  <div style={{ width: '20px', height: '12px', background: t.text, borderRadius: '4px', opacity: 0.15 }} />
                </div>
                {theme === t.id && (
                  <div style={{ position: 'absolute', top: '0.4rem', right: '0.4rem', background: 'var(--accent-color)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={11} color="#fff" />
                  </div>
                )}
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.5rem 0.6rem', borderTop: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── Leitura ── */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.375rem' }}>📖 Configurações de Leitura</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>Ajuste a tipografia e o espaçamento do leitor de capítulos</p>

        {/* Live preview */}
        <div style={{
          background: 'var(--bg-color)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          fontFamily: previewFont,
          fontSize: previewSize,
          lineHeight: previewSpacing,
          color: 'var(--text-primary)',
          transition: 'all 0.2s',
        }}>
          <p>A lua cheia pousou sobre o horizonte enquanto Kira avançava pelas ruas silenciosas da cidade perdida. Cada passo ecoava entre as pedras antigas, carregando o peso de séculos de segredos adormecidos.</p>
        </div>

        {/* Font Family */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="section-label">Fonte</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {FONTS.map(f => (
              <button key={f.id} onClick={() => setFont(f.id)}
                className={`option-btn ${font === f.id ? 'active' : ''}`}
                style={{ fontFamily: f.css }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p className="section-label">Tamanho</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {FONT_SIZES.map(s => (
              <button key={s.id} onClick={() => setSize(s.id)}
                className={`option-btn ${size === s.id ? 'active' : ''}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Spacing */}
        <div>
          <p className="section-label">Espaçamento entre linhas</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {SPACINGS.map(sp => (
              <button key={sp.id} onClick={() => setSpacing(sp.id)}
                className={`option-btn ${spacing === sp.id ? 'active' : ''}`}>
                {sp.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dados ── */}
      <section style={sectionStyle}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.375rem' }}>💾 Gerenciamento de Dados</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
          Todos os seus dados ficam guardados localmente no navegador. Faça backups periodicamente para evitar perda de dados ao limpar o cache.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={handleExport} style={{
            background: 'var(--accent-color)', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '10px',
            fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem',
          }}>
            <DatabaseBackup size={18} /> Exportar Backup
          </button>

          <label style={{
            background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', padding: '0.75rem 1.5rem',
            borderRadius: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem',
            cursor: 'pointer', border: '1px solid var(--border-color)', fontSize: '0.9rem',
          }}>
            {importSuccess ? <><Check size={18} color="var(--success-color)" /> Importado!</> : <><Upload size={18} /> Importar Backup</>}
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
        </div>

        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(56,161,87,0.06)', border: '1px solid rgba(56,161,87,0.15)', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--success-color)' }}>
            💡 A importação agora mescla obras novas com as locais usando IDs únicos. Obras deletadas em outros dispositivos também serão sincronizadas!
          </p>
        </div>
      </section>
    </div>
  );
}
