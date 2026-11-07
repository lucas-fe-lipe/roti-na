import { useState } from 'react';

export default function TaskDetailModal({ isOpen, onClose, tarefa, onEdit, onDelete }) {
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  if (!isOpen || !tarefa) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-md p-6 shadow-2xl space-y-4">
        <h2 className="text-xl font-bold truncate">{tarefa.nome || tarefa.texto}</h2>

        <div className="space-y-2 text-sm text-zinc-300 bg-zinc-950 p-3 rounded border border-zinc-800">
          <div><strong className="text-zinc-400">Data:</strong> {tarefa.data || 'Sem data'}</div>
          <div><strong className="text-zinc-400">Horário:</strong> {tarefa.horario || tarefa.hora || 'Não definido'}</div>
          {tarefa.detalhes && <div><strong className="text-zinc-400">Detalhes:</strong> {tarefa.detalhes}</div>}
        </div>

        {confirmarExclusao && (
          <div className="p-3 bg-red-950/50 border border-red-500 rounded text-red-200 text-xs flex justify-between items-center">
            <span>Tem certeza que deseja excluir esta tarefa?</span>
            <button onClick={() => { onDelete(tarefa.id); setConfirmarExclusao(false); onClose(); }} className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold">Sim</button>
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800">
          {!confirmarExclusao ? (
            <button onClick={() => setConfirmarExclusao(true)} className="px-3 py-2 bg-red-950/40 text-red-400 hover:bg-red-900/50 rounded text-xs font-medium">Excluir</button>
          ) : <div></div>}

          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm">Fechar</button>
            <button onClick={() => { onClose(); onEdit(tarefa); }} className="px-4 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm">Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}