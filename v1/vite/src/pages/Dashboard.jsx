import Icons from '../components/Icons'

const Dashboard = ({
  lns,
  loading,
  onCreateNew,
  onOpenConfig,
  onSelectLN,
  storageError,
}) => {
  return (
    <div className="min-h-screen px-4 py-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="sticky top-4 z-30 mb-8">
          <div className="glass-effect rounded-2xl px-4 py-4 md:px-6 md:py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold theme-gradient-text">
                  Light Novel Manager
                </h1>
                <p className="text-gray-400 mt-2">
                  Crie suas proprias historias com Inteligencia Artificial
                </p>
              </div>

              <div className="flex flex-wrap gap-2 md:gap-3">
                <button
                  onClick={onOpenConfig}
                  className="glass-effect px-4 md:px-6 py-2 md:py-3 rounded-lg hover-glow transition-all flex items-center gap-2 text-sm md:text-base"
                >
                  <Icons.Settings />
                  <span className="hidden sm:inline">Configuracoes</span>
                </button>

                <button
                  onClick={onCreateNew}
                  className="theme-primary-btn px-4 md:px-6 py-2 md:py-3 rounded-lg transition-all flex items-center gap-2 text-sm md:text-base font-semibold"
                >
                  <Icons.Plus />
                  <span className="hidden sm:inline">Nova Light Novel</span>
                  <span className="sm:hidden">Nova</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {storageError ? (
          <div className="glass-effect p-12 rounded-lg text-center border border-red-500/50 bg-red-900/20">
            <h3 className="text-xl text-red-300 mt-4">
              Falha ao abrir o banco local
            </h3>
            <p className="text-gray-300 mt-2">
              O IndexedDB deste navegador nao conseguiu ser inicializado.
            </p>
          </div>
        ) : loading ? (
          <div className="glass-effect p-12 rounded-lg text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mb-4"></div>
            <h3 className="text-xl text-gray-400">Carregando biblioteca local...</h3>
          </div>
        ) : lns.length === 0 ? (
          <div className="glass-effect p-12 rounded-lg text-center">
            <Icons.Book />
            <h3 className="text-xl text-gray-400 mt-4">
              Nenhuma Light Novel encontrada
            </h3>
            <p className="text-gray-500 mt-2">
              Comece criando sua primeira historia!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {lns.map((ln) => (
              <div
                key={ln.id}
                onClick={() => onSelectLN(ln)}
                className="glass-effect rounded-lg hover-glow cursor-pointer transition-all fade-in overflow-hidden flex flex-row"
              >
                {ln.coverImage && (
                  <div className="w-24 flex-shrink-0 bg-black/40 border-r border-gray-700">
                    <img
                      src={ln.coverImage}
                      alt="Capa"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 md:p-6 flex-1">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg md:text-xl font-semibold text-[var(--theme-accent-from)] flex-1 leading-tight">
                      {ln.title || 'Sem Titulo'}
                    </h3>
                  </div>

                  <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-gray-400">
                    <p className="line-clamp-1">
                      <span className="text-gray-500">Generos:</span>{' '}
                      {ln.genres?.join(', ') || 'Nenhum'}
                    </p>
                    <p>
                      <span className="text-gray-500">Capitulos:</span>{' '}
                      {ln.chapters?.length || 0}
                    </p>
                    <p>
                      <span className="text-gray-500">Criada em:</span>{' '}
                      {ln.createdAt
                        ? new Date(ln.createdAt).toLocaleDateString('pt-BR')
                        : 'Desconhecido'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
