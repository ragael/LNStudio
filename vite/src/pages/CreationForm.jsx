import { useState } from 'react'
import Icons from '../components/Icons'
import StorageManager from '../lib/storageManager'

const genreOptions = [
  'Isekai',
  'Slice of Life',
  'Ficcao Cientifica',
  'Aventura',
  'Fantasia',
  'Romance',
  'Misterio',
  'Acao',
  'Comedia',
  'Drama',
  'Horror',
  'Cyberpunk',
  'Steampunk',
  'Post-Apocaliptico',
  'Supernatural',
  'Psicologico',
  'Thriller',
  'Seinen',
  'Shonen',
  'Shojo',
  'Historico',
  'Militar',
  'Esportes',
  'Musical',
  'Policial',
  'Espionagem',
  'Western',
  'Noir',
]

const elementOptions = [
  'Sistema de poderes/magia com progressao gradual',
  'Tecnologia high-tech e/ou industrializacao',
  'Gestao de negocios, economia, guildas',
  'Personagens cativantes com desenvolvimento profundo',
  'Worldbuilding rico e detalhado',
  'Sistemas de evolucao de poderes (niveis, classes)',
  'Crafting e criacao de itens',
  'Politica e intrigas de corte',
  'Dungeon crawling e exploracao',
  'Viagem entre mundos/dimensoes',
  'Construcao de imperio/civilizacao',
  'Sistema de classes e jobs',
  'Mechas e robos',
  'Criaturas misticas e monstros',
  'Artes marciais e combate corpo a corpo',
  'Alquimia e pocoes',
  'Navegacao e exploracao maritima',
  'Academia/escola de magia ou combate',
  'Religiao e mitologia',
  'Necromancia e magia proibida',
  'Invocacao de criaturas/espiritos',
  'Viagem no tempo',
  'Realidade virtual/jogos',
  'Apocalipse zumbi/sobrevivencia',
]

const CreationForm = ({ onBack, onComplete }) => {
  const [step, setStep] = useState(1)
  const [config, setConfig] = useState({
    title: '',
    genres: [],
    elements: [],
    notesList: [],
  })
  const [currentNote, setCurrentNote] = useState('')

  const toggleGenre = (genre) => {
    setConfig((previousConfig) => ({
      ...previousConfig,
      genres: previousConfig.genres.includes(genre)
        ? previousConfig.genres.filter((currentGenre) => currentGenre !== genre)
        : [...previousConfig.genres, genre],
    }))
  }

  const toggleElement = (element) => {
    setConfig((previousConfig) => ({
      ...previousConfig,
      elements: previousConfig.elements.includes(element)
        ? previousConfig.elements.filter(
            (currentElement) => currentElement !== element,
          )
        : [...previousConfig.elements, element],
    }))
  }

  const addNote = () => {
    if (!currentNote.trim()) return

    setConfig((previousConfig) => ({
      ...previousConfig,
      notesList: [...previousConfig.notesList, currentNote.trim()],
    }))
    setCurrentNote('')
  }

  const removeNote = (index) => {
    setConfig((previousConfig) => ({
      ...previousConfig,
      notesList: previousConfig.notesList.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    }))
  }

  const randomGenres = () => {
    const selectedGenres = [...genreOptions]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)

    setConfig((previousConfig) => ({
      ...previousConfig,
      genres: selectedGenres,
    }))
  }

  const randomElements = () => {
    const selectedElements = [...elementOptions]
      .sort(() => Math.random() - 0.5)
      .slice(0, 6)

    setConfig((previousConfig) => ({
      ...previousConfig,
      elements: selectedElements,
    }))
  }

  const handleSubmit = async () => {
    const ln = await StorageManager.createLN(config)
    onComplete(ln)
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          type="button"
          className="glass-effect px-4 py-2 rounded-lg mb-6 flex items-center gap-2 hover-glow"
        >
          <Icons.ArrowLeft />
          Voltar
        </button>

        <div className="glass-effect rounded-2xl p-5 md:p-8">
          <h2 className="text-2xl md:text-3xl font-bold theme-gradient-text mb-6">
            Criar Nova Light Novel
          </h2>

          <div className="grid grid-cols-2 gap-2 mb-8">
            {[1, 2].map((currentStep) => (
              <div
                key={currentStep}
                className={`h-2 rounded-full ${
                  currentStep <= step ? 'theme-primary-btn' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6 fade-in">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Titulo da Light Novel (opcional)
                </label>
                <input
                  type="text"
                  value={config.title}
                  onChange={(event) =>
                    setConfig({ ...config, title: event.target.value })
                  }
                  className="w-full theme-input rounded-xl p-3"
                  placeholder="Deixe em branco para a IA gerar um titulo"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Se deixar vazio, a IA criara um titulo baseado nas suas
                  selecoes.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <label className="block text-sm font-medium">
                    Generos (selecione multiplos)
                  </label>
                  <button
                    onClick={randomGenres}
                    type="button"
                    title="Aleatorio"
                    className="theme-soft-btn px-3 py-2 rounded-xl transition-colors shrink-0"
                  >
                    🎲
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {genreOptions.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`min-h-12 p-2 text-sm rounded-xl border transition-all ${
                        config.genres.includes(genre)
                          ? 'theme-chip-selected'
                          : 'bg-black/30 border-gray-700 hover:border-[var(--theme-accent-from)]'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 fade-in">
              <div>
                <div className="flex items-center justify-between mb-2 gap-3">
                  <label className="block text-sm font-medium">
                    Elementos da Historia
                  </label>
                  <button
                    onClick={randomElements}
                    type="button"
                    title="Aleatorio"
                    className="theme-soft-btn px-3 py-2 rounded-xl transition-colors shrink-0"
                  >
                    🎲
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {elementOptions.map((element) => (
                    <button
                      key={element}
                      type="button"
                      onClick={() => toggleElement(element)}
                      className={`p-3 rounded-xl border transition-all text-left text-sm ${
                        config.elements.includes(element)
                          ? 'theme-chip-selected'
                          : 'bg-black/30 border-gray-700 hover:border-[var(--theme-accent-from)]'
                      }`}
                    >
                      {element}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Notas Adicionais
                </label>

                <div className="space-y-3">
                  <div className="flex gap-2 items-stretch">
                    <input
                      type="text"
                      value={currentNote}
                      onChange={(event) => setCurrentNote(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addNote()
                        }
                      }}
                      className="flex-1 min-w-0 theme-input rounded-xl p-3"
                      placeholder="Digite e pressione Enter"
                    />
                    <button
                      onClick={addNote}
                      type="button"
                      className="theme-primary-btn px-5 rounded-xl shrink-0"
                    >
                      Add
                    </button>
                  </div>

                  {config.notesList.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {config.notesList.map((note, index) => (
                        <div
                          key={`${note}-${index}`}
                          className="flex gap-2 items-center bg-black/30 p-3 rounded-xl border border-gray-700"
                        >
                          <span className="flex-1 text-sm text-gray-300">
                            {note}
                          </span>
                          <button
                            onClick={() => removeNote(index)}
                            type="button"
                            className="text-red-400 hover:text-red-300 px-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              type="button"
              className="glass-effect w-full px-4 md:px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>

            {step < 2 ? (
              <button
                onClick={() => setStep(step + 1)}
                type="button"
                className="theme-primary-btn w-full px-4 md:px-6 py-3 rounded-xl font-semibold"
              >
                Proximo
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                type="button"
                className="theme-primary-btn w-full px-4 md:px-6 py-3 rounded-xl font-semibold"
              >
                Criar Light Novel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreationForm
