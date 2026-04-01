import { useState, useRef } from 'react';
import { X, Plus, Search, Shuffle } from 'lucide-react';
import { db } from '../db/db';

const GENRES = [
  'Ação','Aventura','Comédia','Drama','Fantasia','Fantasia Urbana',
  'Ficção Científica','Horror','Mistério','Romance','Slice of Life',
  'Sobrenatural','Suspense','Thriller','Tragédia','Isekai','Reencarnação',
  'Reversão Temporal','Sistema / Game Elements','Harem','Ecchi','Apocalipse',
  'Shounen','Shoujo','Seinen','Josei','Mecha','Esportes','Música',
  'Escola / Academia','Político','Militar','Psicológico','Filosófico',
  'Histórico','Pós-Apocalíptico','Cyberpunk','Steampunk','Cultivation / Xianxia',
  'Wuxia','Progression Fantasy',
];

const ELEMENTS = [
  'Protagonista Overpowered','Protagonista Fraco que Cresce','Reencarnado como Vilão',
  'Reencarnado como Personagem Extra','Sistema de Níveis e Status','Dungeons',
  'Monstros e Criaturas','Magia Elemental','Magia de Combate','Cultivação de Energia',
  'Espadas e Lâminas','Arqueria e Projéteis','Poderes de Ilusão e Sonho','Viagem no Tempo',
  'Mundos Paralelos','Portal para Outro Mundo','Torre de Desafios',
  'Guilda de Aventureiros','Clãs e Facções Rivais','Política de Nobreza',
  'Família Real e Realeza','Escravidão e Redenção','Heróis Invocados',
  'Demônios e Lordes das Trevas','Anjos e Divindades','Dragões','Elfos',
  'Orcs e Raças Monstruosas','Bestas Divinas e Spirit Beasts','Familiar e Animal Companheiro',
  'Armaduras e Equipamentos Raros','Itens Lendários e Relíquias','Culinária Mágica',
  'Medicina e Ervas Mágicas','Alquimia','Arte da Forja e Craftsman','Artes Marciais Secretas',
  'Torneios de Combate','Guerras e Batalhas em Massa','Traição e Conspiração',
  'Vingança Fria','Arco de Redenção','Sacrifício Heroico','Amnésia e Memórias Perdidas',
  'Identidade Secreta e Disfarce','Amor Proibido','Triângulo Amoroso',
  'Personagem Yandere','Personagem Tsundere','Personagem Kuudere','Harem Improvável',
  'Vilão Complexo e Simpático','Anti-Herói','Relação Mestre e Discípulo',
  'Segredos de Família Sombrios','Profecia Antiga','Artefatos Perdidos',
  'Mapa e Lore de Mundo Denso','Economia e Política Mercantil','POV Múltiplos',
  'Narrador Não-Confiável','Flashbacks Frequentes','Foreshadowing Pesado',
  'Final Aberto e Ambíguo','Reviravoltas Inesperadas','POV do Vilão',
  'Progressão de Power System','Sistema de Ranks e Classes','Bestiário Elaborado',
  'Livros e Tomos de Magia','Batalhas de Inteligência e Estratégia',
  'Viagem Intergaláctica','Inteligência Artificial Consciente','Poderes de Necromancia',
  'Laços de Alma e Contratos','Profissões e Vocações Únicas','Mundos Dentro de Jogos',
];

const pickRandom = <T,>(pool: T[], count: number, exclude: T[]): T[] => {
  const available = pool.filter(item => !exclude.includes(item));
  const shuffled = [...available].sort(() => Math.random() - 0.5);
  return [...exclude, ...shuffled.slice(0, count)];
};

interface Props { onClose: () => void; }

export default function NewNovelModal({ onClose }: Props) {
  const [title, setTitle] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [genreSearch, setGenreSearch] = useState('');
  const [elementSearch, setElementSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const noteInputRef = useRef<HTMLInputElement>(null);

  const toggleChip = (list: string[], setList: (v: string[]) => void, value: string) => {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  };

  const addNote = () => {
    const trimmed = noteInput.trim();
    if (trimmed && !notes.includes(trimmed)) {
      setNotes([...notes, trimmed]);
      setNoteInput('');
      noteInputRef.current?.focus();
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    const titleValue = title.trim() || `[Título a ser gerado pela IA — ${selectedGenres.slice(0,2).join(', ') || 'Novel'}]`;
    const genreLabel = selectedGenres.join(', ') || 'A definir';

    const synopsis = [
      selectedGenres.length > 0 ? `Gêneros: ${selectedGenres.join(', ')}.` : '',
      selectedElements.length > 0 ? `Elementos-chave: ${selectedElements.join(', ')}.` : '',
      notes.length > 0 ? `Notas do Autor:\n${notes.map(n => `- ${n}`).join('\n')}` : '',
    ].filter(Boolean).join('\n\n') || 'Sinopse não definida.';

    const promptBase = `Você é um escritor extraordinário de Light Novels japonesas. Sua missão é escrever o próximo capítulo desta obra com qualidade literária excepcional.`;

    const novelId = crypto.randomUUID();

    await db.novels.add({
      id: novelId,
      title: titleValue,
      synopsis,
      genre: genreLabel,
      genres: selectedGenres,
      elements: selectedElements,
      additionalNotes: notes,
      covers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await db.worldSetups.add({
      id: crypto.randomUUID(),
      novelId,
      promptBase,
      charactersInfo: '',
      worldRules: '',
    });

    setLoading(false);
    onClose();
  };

  const filteredGenres = GENRES.filter(g => g.toLowerCase().includes(genreSearch.toLowerCase()));
  const filteredElements = ELEMENTS.filter(e => e.toLowerCase().includes(elementSearch.toLowerCase()));
  const canCreate = selectedGenres.length > 0 || selectedElements.length > 0 || title.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Nova Light Novel</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Configure o universo da sua história</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-secondary)' }}><X size={24} /></button>
        </div>

        <div className="modal-body">
          {/* Title */}
          <div>
            <p className="section-label">Título</p>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Opcional — se não informado, será gerado pela IA" autoFocus />
          </div>

          {/* Genres */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <p className="section-label" style={{ margin: 0 }}>
                Gêneros
                {selectedGenres.length > 0 && <span style={{ color: 'var(--accent-color)', marginLeft: '0.5rem', textTransform: 'none', letterSpacing: 0 }}>{selectedGenres.length} selecionados</span>}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedGenres.length > 0 && (
                  <button onClick={() => setSelectedGenres([])} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    Limpar
                  </button>
                )}
                <button onClick={() => setSelectedGenres(pickRandom(GENRES, 3, []))}
                  style={{ fontSize: '0.75rem', color: 'var(--accent-color)', padding: '0.25rem 0.6rem', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Shuffle size={13} /> 3 aleatórios
                </button>
              </div>
            </div>
            <div className="chip-search">
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input type="text" value={genreSearch} onChange={e => setGenreSearch(e.target.value)}
                  placeholder="Filtrar gêneros..." style={{ paddingLeft: '2.25rem' }} />
              </div>
            </div>
            <div className="chips-area">
              {filteredGenres.map(g => (
                <button key={g} className={`chip ${selectedGenres.includes(g) ? 'selected' : ''}`}
                  onClick={() => toggleChip(selectedGenres, setSelectedGenres, g)}>{g}</button>
              ))}
            </div>
          </div>

          {/* Elements */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <p className="section-label" style={{ margin: 0 }}>
                Elementos
                {selectedElements.length > 0 && <span style={{ color: 'var(--accent-color)', marginLeft: '0.5rem', textTransform: 'none', letterSpacing: 0 }}>{selectedElements.length} selecionados</span>}
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedElements.length > 0 && (
                  <button onClick={() => setSelectedElements([])} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '0.25rem 0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                    Limpar
                  </button>
                )}
                <button onClick={() => setSelectedElements(pickRandom(ELEMENTS, 6, []))}
                  style={{ fontSize: '0.75rem', color: 'var(--accent-color)', padding: '0.25rem 0.6rem', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Shuffle size={13} /> 6 aleatórios
                </button>
              </div>
            </div>
            <div className="chip-search">
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', pointerEvents: 'none' }} />
                <input type="text" value={elementSearch} onChange={e => setElementSearch(e.target.value)}
                  placeholder="Filtrar elementos..." style={{ paddingLeft: '2.25rem' }} />
              </div>
            </div>
            <div className="chips-area">
              {filteredElements.map(el => (
                <button key={el} className={`chip ${selectedElements.includes(el) ? 'selected' : ''}`}
                  onClick={() => toggleChip(selectedElements, setSelectedElements, el)}>{el}</button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <p className="section-label">Notas Adicionais para a IA</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              Detalhes que a IA deve sempre considerar. Pressione Enter para adicionar.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input ref={noteInputRef} type="text" value={noteInput}
                onChange={e => setNoteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNote(); } }}
                placeholder="Ex: A protagonista nunca perde a compostura em público..." />
              <button onClick={addNote} disabled={!noteInput.trim()} style={{
                background: 'var(--accent-color)', color: 'white', borderRadius: '8px',
                padding: '0 1rem', flexShrink: 0, opacity: noteInput.trim() ? 1 : 0.4
              }}>
                <Plus size={20} />
              </button>
            </div>
            {notes.length > 0 && (
              <div className="tag-list">
                {notes.map(note => (
                  <div key={note} className="tag-item">
                    <span>{note}</span>
                    <button onClick={() => setNotes(notes.filter(n => n !== note))}>×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={loading || !canCreate}
            style={{ opacity: canCreate ? 1 : 0.5 }}>
            {loading ? 'Criando...' : 'Criar Novel'}
          </button>
        </div>
      </div>
    </div>
  );
}
