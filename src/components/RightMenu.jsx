export default function RightMenu({ isOpen, onClose, onSelectPage, activePage, config, temNovidade }) {
  if (!isOpen) return null;

  const principais = [
    { id: 'Grade', rotulo: 'Rotina', visivel: true },
    { id: 'Notas', rotulo: 'Notas', visivel: config?.paginas?.notas !== false },
  ].filter((i) => i.visivel);

  const rodape = [
    { id: 'Novidades', rotulo: 'Novidades', selo: temNovidade },
    { id: 'Configuracoes', rotulo: 'Configurações' },
  ];

  const botao = (item) => (
    <button
      key={item.id}
      onClick={() => { onSelectPage(item.id); onClose(); }}
      className={`py-2 text-sm font-medium text-left transition-colors flex items-center gap-2 ${activePage === item.id ? 'text-white font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
    >
      {item.rotulo}
      {item.selo && <span className="bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold">novo</span>}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div className="w-72 bg-zinc-900 text-zinc-100 h-full p-5 shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <h2 className="text-lg font-bold">Menu</h2>
          <button aria-label="Fechar menu" onClick={onClose} className="text-zinc-400 hover:text-white text-lg">✕</button>
        </div>

        <div className="flex flex-col space-y-2 mt-6">
          {principais.map(botao)}
        </div>

        <div className="mt-auto pt-3 border-t border-zinc-800 flex flex-col space-y-1">
          {rodape.map(botao)}
        </div>
      </div>
    </div>
  );
}
