import { useState, useRef, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ContinuityNotes } from '../db/db';
import { ChevronLeft, Wand2, BookOpen, ImagePlus, Trash2, Copy } from 'lucide-react';

function ContinuityDisplay({ notes }: { notes: ContinuityNotes | string }) {
  if (typeof notes === 'string') {
    return <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{notes}</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.8rem' }}>
      {notes.summary && <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{notes.summary}</p>}
      {notes.characters_present?.length > 0 && (
        <div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>👥 Personagens presentes</p>
          {notes.characters_present.map((c, i) => <p key={i} style={{ color: 'var(--text-secondary)', paddingLeft: '0.75rem' }}>• {c}</p>)}
        </div>
      )}
      {notes.world_state && (
        <div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>🌍 Estado do mundo</p>
          <p style={{ color: 'var(--text-secondary)', paddingLeft: '0.75rem' }}>{notes.world_state}</p>
        </div>
      )}
      {notes.open_threads?.length > 0 && (
        <div>
          <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>🔗 Fios abertos</p>
          {notes.open_threads.map((t, i) => <p key={i} style={{ color: 'var(--text-secondary)', paddingLeft: '0.75rem' }}>• {t}</p>)}
        </div>
      )}
      {notes.next_chapter_hint && (
        <div style={{ background: 'rgba(139,92,246,0.08)', padding: '0.6rem 0.8rem', borderRadius: '6px', borderLeft: '3px solid var(--accent-color)' }}>
          <p style={{ fontWeight: 600, color: 'var(--accent-hover)', marginBottom: '0.2rem' }}>💡 Próximo capítulo</p>
          <p style={{ color: 'var(--text-secondary)' }}>{notes.next_chapter_hint}</p>
        </div>
      )}
    </div>
  );
}

export default function NovelDetail() {
  const { id } = useParams();
  const novelId = id as string;
  const navigate = useNavigate();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const handleDelete = async () => {
    await db.deletedNovels.add({ id: novelId, deletedAt: new Date().toISOString() });
    await db.novels.delete(novelId);
    await db.chapters.where('novelId').equals(novelId).delete();
    await db.worldSetups.where('novelId').equals(novelId).delete();
    navigate('/');
  };

  const novel = useLiveQuery(() => db.novels.get(novelId), [novelId]);
  const chapters = useLiveQuery(() => db.chapters.where('novelId').equals(novelId).sortBy('chapterNumber'), [novelId]);
  const ch1 = chapters?.[0];

  const handleCoverUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !novel) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string;
      const current = novel.covers || [];
      await db.novels.update(novelId, { covers: [...current, base64], updatedAt: new Date().toISOString() });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removeCover = async (idx: number) => {
    if (!novel) return;
    const updated = novel.covers.filter((_, i) => i !== idx);
    await db.novels.update(novelId, { covers: updated });
  };

  const copyCoverPrompt = () => {
    if (ch1?.coverPrompt) navigator.clipboard.writeText(ch1.coverPrompt);
  };

  if (!novel || !chapters) {
    return <div className="container" style={{ paddingTop: '2rem' }}>Carregando...</div>;
  }

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      
      {fullscreenImage && (
        <div 
          onClick={() => setFullscreenImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out'
          }}
        >
          <img 
            src={fullscreenImage} alt="Capa" 
            style={{ maxWidth: '95vw', maxHeight: '95vh', objectFit: 'contain' }} 
          />
        </div>
      )}

      {/* ── Back Navigation ── */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <ChevronLeft size={18} /> Estante
      </Link>

      {/* ── Hero ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '2rem', lineHeight: 1.3, marginBottom: '0.5rem' }}>{novel.title}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{chapters.length} capítulo{chapters.length !== 1 ? 's' : ''} gerado{chapters.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to={`/novel/${novel.id}/factory`} style={{ background: 'var(--accent-color)', color: '#fff', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
            <Wand2 size={16} /> Fábrica
          </Link>
          {chapters.length > 0 && (
            <Link to={`/novel/${novel.id}/read`} style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem', border: '1px solid var(--border-color)' }}>
              <BookOpen size={16} /> Ler
            </Link>
          )}
        </div>
      </div>

      {/* ── Covers ── */}
      <section style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'center' }}>
        {novel.covers && novel.covers.length > 0 ? (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {novel.covers.map((cover, idx) => (
              <div key={idx} style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <img 
                  src={cover} alt={`Capa ${idx + 1}`} 
                  onClick={() => setFullscreenImage(cover)}
                  style={{ width: '200px', height: '280px', objectFit: 'cover', display: 'block', cursor: 'zoom-in' }} 
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-color)', borderRadius: '10px', padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', width: '100%', maxWidth: '300px' }}>
            <ImagePlus size={36} style={{ opacity: 0.3, marginBottom: '0.75rem', margin: '0 auto' }} />
            <p style={{ fontSize: '0.875rem' }}>Nenhuma capa enviada.</p>
          </div>
        )}
      </section>


      {/* ── Novel Info ── */}
      <section style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>📋 Detalhes da Obra</h2>

        {novel.genres?.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <p className="section-label">Gêneros</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {novel.genres.map(g => (
                <span key={g} style={{ padding: '0.25rem 0.7rem', background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '100px', fontSize: '0.8rem', color: 'var(--accent-hover)' }}>{g}</span>
              ))}
            </div>
          </div>
        )}

        {novel.elements?.length > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <p className="section-label">Elementos ({novel.elements.length})</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto' }}>
              {novel.elements.map(el => (
                <span key={el} style={{ padding: '0.2rem 0.6rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '100px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{el}</span>
              ))}
            </div>
          </div>
        )}

        {novel.additionalNotes?.length > 0 && (
          <div>
            <p className="section-label">Notas do Autor ({novel.additionalNotes.length})</p>
            <div className="tag-list">
              {novel.additionalNotes.map(note => (
                <div key={note} className="tag-item"><span>{note}</span></div>
              ))}
            </div>
          </div>
        )}

        {!novel.genres?.length && !novel.elements?.length && !novel.additionalNotes?.length && (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nenhum detalhe configurado. Acesse a Fábrica e edite o contexto.</p>
        )}
      </section>

      {/* ── Chapters List ── */}
      <section>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📖 Capítulos ({chapters.length})</h2>

        {chapters.length === 0 ? (
          <div style={{ background: 'var(--bg-surface)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ marginBottom: '0.75rem' }}>Nenhum capítulo ainda.</p>
            <Link to={`/novel/${novel.id}/factory`} style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Gerar o primeiro capítulo →</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {chapters.map((ch) => (
              <div key={ch.id} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1.25rem', transition: 'border-color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(139,92,246,0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>Capítulo {ch.chapterNumber}</p>
                    <h3 style={{ fontSize: '1.05rem', marginBottom: '0.3rem' }}>{ch.title}</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <span>✍️ {ch.aiAuthor || 'Autor desconhecido'}</span>
                      <span>📅 {ch.aiCreatedDate || ch.createdAt?.slice(0, 10)}</span>
                    </p>
                  </div>
                  <Link to={`/novel/${novel.id}/read?chapter=${ch.chapterNumber - 1}`}
                    style={{ color: 'var(--accent-color)', fontSize: '0.875rem', fontWeight: 600, flexShrink: 0 }}>
                    Ler →
                  </Link>
                </div>

                {ch.continuityNotes && typeof ch.continuityNotes === 'object' && (ch.continuityNotes as ContinuityNotes).summary && (
                  <details style={{ marginTop: '0.75rem' }}>
                    <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', userSelect: 'none' }}>Ver notas de continuidade</summary>
                    <div style={{ marginTop: '0.75rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--border-color)' }}>
                      <ContinuityDisplay notes={ch.continuityNotes} />
                    </div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Cover Prompt from Chapter 1 ── */}
      {ch1?.coverPrompt && (
        <section style={{ marginTop: '2.5rem', background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)', borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--accent-hover)' }}>🎨 Prompt de Capa (do Capítulo 1)</h2>
            <button onClick={copyCoverPrompt} style={{ background: 'var(--accent-color)', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
              <Copy size={14} /> Copiar Prompt
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, fontStyle: 'italic', background: 'var(--bg-surface)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            "{ch1.coverPrompt}"
          </p>
        </section>
      )}

      {/* ── Danger Zone ── */}
      <section style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px' }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--danger-color)', marginBottom: '1.5rem' }}>⚠️ Zona de Perigo</h2>
        
        <div style={{ marginBottom: '2.5rem', paddingBottom: '2.5rem', borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
          <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Gerenciar Capa</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Enviar uma nova capa ou excluir as existentes.</p>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => coverInputRef.current?.click()}
              style={{ background: 'var(--bg-color)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}>
              <ImagePlus size={16} /> Enviar Nova Capa
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCoverUpload} />
            
            {novel.covers && novel.covers.length > 0 && (
              <button 
                onClick={() => {
                  if(confirm('Apagar a capa mais recente?')) removeCover(0);
                }}
                style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--danger-color)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.875rem' }}
              >
                <Trash2 size={16} /> Excluir Capa
              </button>
            )}
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Excluir Definitivamente a Obra</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Excluir esta Light Novel remove permanentemente todos os capítulos, configurações de mundo e imagens de capa. Esta ação não pode ser desfeita.
          </p>
          {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ background: 'rgba(239,68,68,0.12)', color: 'var(--danger-color)', border: '1px solid rgba(239,68,68,0.3)', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🗑️ Excluir Light Novel
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--danger-color)' }}>Tem certeza? Todos os dados serão perdidos permanentemente.</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleDelete}
                style={{ background: 'var(--danger-color)', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem' }}>
                Sim, excluir definitivamente
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-primary)', padding: '0.65rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', border: '1px solid var(--border-color)' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
