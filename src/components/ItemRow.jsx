// Linha de atividade/tarefa usada nas listas (Hoje, Atrasadas, próximos dias, Concluídas).
const IconeAvaliacao = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-blue-400 shrink-0" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export default function ItemRow({
  cor,
  horario,
  horarioVazio = false, // true: mostra "--:--" quando não há horário (atividades)
  titulo,
  detalhes,
  isAvaliacao = false,
  atrasado = false,
  concluido = false,
  onAbrir,
  onToggle,
}) {
  const riscado = concluido ? 'line-through' : '';
  const textoHorario = horario || (horarioVazio ? '--:--' : '');

  return (
    <div
      onClick={onAbrir}
      className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-opacity ${
        concluido ? 'border-zinc-800/50 opacity-50' : 'border-zinc-800 hover:border-zinc-700'
      }`}
      style={{ backgroundColor: cor }}
    >
      <div className="flex items-center gap-2 overflow-hidden pr-2 flex-1">
        {textoHorario && <span className={`font-mono font-bold text-xs text-white shrink-0 ${riscado}`}>{textoHorario}</span>}
        {textoHorario && <span className="text-white font-bold text-xs">-</span>}

        <div className="flex flex-col overflow-hidden flex-1">
          <div className="flex items-center gap-2 overflow-hidden">
            {isAvaliacao && <IconeAvaliacao />}
            <span className={`text-white font-semibold text-xs truncate ${riscado}`}>{titulo}</span>
            {atrasado && !concluido && (
              <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">Atrasado</span>
            )}
          </div>
          {detalhes && <span className={`text-zinc-300 text-[10px] whitespace-pre-line max-w-full ${riscado}`}>{detalhes}</span>}
        </div>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-2 flex items-center">
        <input
          type="checkbox"
          aria-label={concluido ? 'Desmarcar conclusão' : 'Marcar como concluída'}
          checked={concluido}
          onChange={onToggle}
          className={`w-4 h-4 rounded cursor-pointer border-0 accent-zinc-500 ${concluido ? '' : 'bg-black/35'}`}
        />
      </div>
    </div>
  );
}
