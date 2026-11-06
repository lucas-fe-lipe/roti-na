export default function RightMenu({ isOpen, onClose, onOpenNewActivity, onSelectPage, activePage }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="w-72 bg-zinc-900 text-zinc-100 h-full p-5 shadow-2xl flex flex-col space-y-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <h2 className="text-lg font-bold">Menu</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-lg">✕</button>
        </div>

        <div className="flex flex-col space-y-2">
          <button 
            onClick={() => { onOpenNewActivity(); onClose(); }} 
            className="flex items-center gap-2 py-2 text-zinc-300 hover:text-white text-sm font-medium transition-colors text-left"
          >
            <span className="text-base font-bold">+</span> Nova Atividade
          </button>

          <button 
            onClick={() => { onSelectPage('Grade'); onClose(); }} 
            className={`py-2 text-sm font-medium text-left transition-colors ${activePage === 'Grade' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Rotina
          </button>

          <button 
            onClick={() => { onSelectPage('Notas'); onClose(); }} 
            className={`py-2 text-sm font-medium text-left transition-colors ${activePage === 'Notas' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Notas
          </button>

          <button 
            onClick={() => { onSelectPage('Treinos'); onClose(); }} 
            className={`py-2 text-sm font-medium text-left transition-colors ${activePage === 'Treinos' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Treinos
          </button>

          <button 
            onClick={() => { onSelectPage('Trabalhos'); onClose(); }} 
            className={`py-2 text-sm font-medium text-left transition-colors ${activePage === 'Trabalhos' ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Trabalhos
          </button>
        </div>
      </div>
    </div>
  );
}