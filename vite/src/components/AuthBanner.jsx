import Icons from './Icons'

const AuthBanner = ({ onOpenConfig }) => {
  return (
    <div className="glass-effect p-4 rounded-lg mb-6 flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <div>
          <h3 className="font-semibold text-sm">Banco local ativo</h3>
          <p className="text-xs text-gray-400">
            Seus dados estao salvos no IndexedDB deste navegador.
          </p>
        </div>
      </div>

      <button
        onClick={onOpenConfig}
        className="glass-effect px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-purple-600/30 transition-colors"
      >
        <Icons.Settings /> Configuracoes
      </button>
    </div>
  )
}

export default AuthBanner
