import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { ChevronLeft, ChevronRight, List, Wand2 } from 'lucide-react';
import { getReaderStyles } from './Settings';

export default function Reader() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const novelId = id as string;

  const novel = useLiveQuery(() => db.novels.get(novelId), [novelId]);
  const chapters = useLiveQuery(() => db.chapters.where('novelId').equals(novelId).sortBy('chapterNumber'), [novelId]);

  const initialChapter = Number(searchParams.get('chapter') || '0');
  const [currentIdx, setCurrentIdx] = useState(initialChapter);
  const [showIndex, setShowIndex] = useState(false);
  
  // UI auto-hide overlay states
  const [showUI, setShowUI] = useState(true);
  const hideTimeoutRef = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const triggerHideUI = () => {
    if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = window.setTimeout(() => setShowUI(false), 3500);
  };

  const handleScreenClick = (e: React.MouseEvent) => {
    // se clicou numa interface (botão, barra), não esconder
    if ((e.target as Element).closest('.reader-ui')) return;
    
    setShowUI(prev => {
      if (!prev) {
        triggerHideUI();
        return true;
      } else {
        if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
        return false;
      }
    });
  };

  useEffect(() => {
    setCurrentIdx(initialChapter);
  }, [initialChapter]);

  const safeIdx = chapters ? Math.min(Math.max(currentIdx, 0), chapters.length - 1) : 0;
  const chapter = chapters ? chapters[safeIdx] : null;
  const rs = getReaderStyles();

  // Scroll Persistance
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !chapter) return;

    let ticking = false;
    const handleScroll = () => {
      const maxScroll = container.scrollHeight - container.clientHeight;
      if (maxScroll > 0) {
        const pct = container.scrollTop / maxScroll;
        localStorage.setItem(`scroll_${chapter.id}`, pct.toString());
      }
    };

    const scrollListener = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };
    
    container.addEventListener('scroll', scrollListener);
    return () => container.removeEventListener('scroll', scrollListener);
  }, [chapter]); // we don't depend on rs here to avoid re-binding to same scroll height

  // Restore Scroll & trigger initial hide
  useEffect(() => {
    const container = contentRef.current;
    if (!container || !chapter) return;
    
    const saved = localStorage.getItem(`scroll_${chapter.id}`);
    if (saved) {
      setTimeout(() => {
         const maxScroll = container.scrollHeight - container.clientHeight;
         container.scrollTo({ top: parseFloat(saved) * maxScroll, behavior: 'instant' });
      }, 50); // slight delay to allow layout calculation
    } else {
      container.scrollTo({ top: 0, behavior: 'instant' });
    }

    setShowUI(true);
    triggerHideUI();
  }, [chapter, rs.fontSize, rs.lineHeight]);

  const navigate = (idx: number) => {
    setCurrentIdx(idx);
    setShowIndex(false);
  };

  if (!novel || !chapters) return <div className="reader-container">Carregando...</div>;

  if (chapters.length === 0) {
    return (
      <div className="reader-container" style={{ textAlign: 'center', paddingTop: '4rem', paddingBottom: '4rem' }}>
        <h2>Nenhum capítulo disponível.</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Vá até a Fábrica e gere a introdução!</p>
        <Link to={`/novel/${novel.id}/factory`} style={{ background: 'var(--accent-color)', color: 'white', padding: '1rem 2rem', borderRadius: '8px', fontWeight: 'bold' }}>
          Ir para a Fábrica
        </Link>
      </div>
    );
  }

  return (
    <div 
      ref={contentRef}
      onClick={handleScreenClick}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'var(--bg-color)',
        zIndex: 9999,
        overflowY: 'auto',
        overflowX: 'hidden'
      }}
    >
      {/* ── HEADER FIXO COLA NO TOPO ── */}
      <div 
        className="reader-ui"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: '60px',
          background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem',
          transform: showUI ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 10000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
      >
        <Link to={`/novel/${novel.id}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>
          <ChevronLeft size={20} /> <span className="hide-mobile">Detalhes</span>
        </Link>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '50%' }}>
          {novel.title} <span style={{ opacity: 0.5 }}>/</span> Cap. {chapter!.chapterNumber}
        </span>
        <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={() => setShowIndex(!showIndex)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            <List size={20} /> <span className="hide-mobile">Índice</span>
          </button>
        </div>
      </div>

      {/* ── CONTEÚDO DA LEITURA ── */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '100px 2rem 140px 2rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <h1 style={{ fontFamily: rs.fontFamily, textAlign: 'center', fontSize: `calc(${rs.fontSize} * 1.5)`, marginBottom: '2rem', color: 'var(--text-primary)' }}>
          {chapter!.title}
        </h1>
        <div 
          style={{ 
            fontFamily: rs.fontFamily, fontSize: rs.fontSize, lineHeight: rs.lineHeight, 
            color: 'var(--text-primary)', textAlign: 'justify', flex: 1 
          }}
          dangerouslySetInnerHTML={{ __html: chapter!.content }} 
        />
        
        <div style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.3 }}>
           ~~~ ◈ ~~~
        </div>
      </div>

      {/* ── RODAPÉ FIXO ── */}
      <div 
        className="reader-ui"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: '80px',
          background: 'var(--bg-surface)', borderTop: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '0 1.5rem',
          transform: showUI ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 10000,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)'
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '800px', justifyContent: 'space-between', margin: '0 auto' }}>
          {safeIdx > 0 ? (
            <button onClick={() => navigate(safeIdx - 1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', background: 'var(--bg-color)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: 600, flex: 1, justifyContent: 'center' }}>
              <ChevronLeft size={20} /> <span className="hide-mobile">Cap. Anterior</span>
            </button>
          ) : <div style={{ flex: 1 }} />}

          <button onClick={() => setShowIndex(!showIndex)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', background: 'var(--bg-color)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontWeight: 600, flex: 1, justifyContent: 'center' }}>
            <List size={20} /> <span className="hide-mobile">Índice</span>
          </button>

          {safeIdx < chapters.length - 1 ? (
            <button onClick={() => navigate(safeIdx + 1)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#000', background: 'var(--accent-color)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: 600, flex: 1, justifyContent: 'center' }}>
              <span className="hide-mobile">Próximo Cap.</span> <ChevronRight size={20} />
            </button>
          ) : (
            <Link to={`/novel/${novel.id}/factory`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#000', background: 'var(--success-color)', padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', fontWeight: 600, flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
              <Wand2 size={18} /> <span className="hide-mobile">Gerar Mais</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── MODAL ÍNDICE (OVERLAY) ── */}
      {showIndex && (
        <div 
          className="reader-ui"
          style={{ 
            position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', 
            background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px', 
            border: '1px solid var(--border-color)', width: '90%', maxWidth: '400px', 
            zIndex: 10001, boxShadow: '0 10px 40px rgba(0,0,0,0.6)' 
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--accent-color)' }}>Índice</h3>
            <button onClick={() => setShowIndex(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}>&times;</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
            {chapters.map((c, idx) => (
              <button key={c.id} onClick={() => navigate(idx)}
                style={{ textAlign: 'left', padding: '0.75rem 1rem', background: idx === safeIdx ? 'var(--accent-color)' : 'var(--bg-color)', color: idx === safeIdx ? '#000' : 'var(--text-primary)', borderRadius: '6px', border: '1px solid var(--border-color)', cursor: 'pointer', fontSize: '0.875rem', fontWeight: idx === safeIdx ? 700 : 400 }}>
                {c.chapterNumber}. {c.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
