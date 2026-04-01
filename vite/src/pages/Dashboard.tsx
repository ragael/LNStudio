import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookPlus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import NewNovelModal from '../components/NewNovelModal';

export default function Dashboard() {
  const novels = useLiveQuery(() => db.novels.orderBy('updatedAt').reverse().toArray());
  const [showModal, setShowModal] = useState(false);



  return (
    <div className="container">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>Minha Estante</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{novels?.length || 0} novel{novels?.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
          <BookPlus size={20} /> Nova Novel
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '2rem 1.5rem' }}>
        {novels?.map((novel) => (
          <Link key={novel.id} to={`/novel/${novel.id}`} style={{
            display: 'flex', flexDirection: 'column', gap: '0.75rem', textDecoration: 'none', color: 'inherit',
            transition: 'transform 0.2s', position: 'relative'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
          >
            <div style={{
              width: '100%', aspectRatio: '2 / 3', background: 'var(--bg-surface)', borderRadius: '10px',
              border: '1px solid var(--border-color)', overflow: 'hidden', display: 'flex',
              alignItems: 'center', justifyContent: 'center', position: 'relative', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {novel.covers && novel.covers.length > 0 ? (
                <img src={novel.covers[0]} alt={novel.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <BookPlus size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                  <p style={{ fontSize: '0.75rem' }}>Sem capa</p>
                </div>
              )}
            </div>
            
            <h3 style={{ fontSize: '0.95rem', margin: 0, lineHeight: 1.3, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {novel.title}
            </h3>
          </Link>
        ))}

        {novels?.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-secondary)' }}>
            <BookPlus size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Sua estante está vazia</p>
            <p style={{ fontSize: '0.875rem' }}>Clique em "Nova Novel" para começar sua primeira aventura.</p>
          </div>
        )}
      </div>

      {showModal && <NewNovelModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
