import useVoltar from '../hooks/useVoltar';
// Confirmação no padrão visual do app (substitui window.confirm).
export default function ConfirmModal({ aberto, titulo, mensagem, rotuloConfirmar = 'Excluir', onConfirmar, onCancelar }) {
  useVoltar(aberto, onCancelar);
  if (!aberto) return null;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[55] p-4" onClick={onCancelar}>
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-sm p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h3 className="text-lg font-bold">{titulo}</h3>
        <p className="text-sm text-zinc-400">{mensagem}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancelar} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm">Cancelar</button>
          <button onClick={onConfirmar} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium text-sm">{rotuloConfirmar}</button>
        </div>
      </div>
    </div>
  );
}
