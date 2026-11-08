import { useState, useEffect } from 'react';
import { hojeLocalStr } from '../utils/date';

function dataBR(iso) {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

/**
 * Modal para adicionar um valor (com ou sem data) e ver/apagar o histórico.
 * campo = { titulo, unidade, parse(txt) -> número|null, fmt(n) -> texto, erro, comData, dica }
 */
export default function ValorModal({ isOpen, campo, historico = [], valorAtual, onSave, onDelete, onRemoverMeta, onClose }) {
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hojeLocalStr());
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isOpen) {
      setValor('');
      setData(hojeLocalStr());
      setErro('');
    }
  }, [isOpen, campo?.titulo]);

  if (!isOpen || !campo) return null;

  const comData = campo.comData !== false;

  const salvar = (e) => {
    e.preventDefault();
    const n = campo.parse(valor);
    if (n === null) return setErro(campo.erro);
    if (comData && !data) return setErro('Escolha a data.');
    onSave(n, data);
  };

  const ordenado = [...historico].sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : 0));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-sm p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold">{comData ? 'Adicionar' : 'Definir'} {campo.titulo.toLowerCase()}</h2>
        {campo.dica && <p className="text-xs text-zinc-400 -mt-2">{campo.dica}</p>}

        {erro && <div className="p-2 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs">{erro}</div>}

        <form onSubmit={salvar} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1 text-zinc-400">Valor ({campo.unidade})</label>
              <input
                autoFocus
                type="text"
                inputMode="decimal"
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder={valorAtual != null ? campo.fmt(valorAtual) : ''}
                className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none focus:border-zinc-500"
              />
            </div>
            {comData && (
              <div className="flex-1">
                <label className="block text-xs mb-1 text-zinc-400">Data</label>
                <input
                  type="date"
                  value={data}
                  max={hojeLocalStr()}
                  onChange={e => setData(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none [color-scheme:dark]"
                />
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-1">
            {onRemoverMeta && valorAtual != null ? (
              <button type="button" onClick={onRemoverMeta} className="text-red-500 hover:text-red-400 text-xs">Remover meta</button>
            ) : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm">Cancelar</button>
              <button type="submit" className="px-5 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm">Salvar</button>
            </div>
          </div>
        </form>

        {comData && ordenado.length > 0 && (
          <div className="border-t border-zinc-800 pt-3">
            <div className="text-xs text-zinc-400 mb-2">Histórico</div>
            <ul className="space-y-1 max-h-40 overflow-y-auto">
              {ordenado.map(h => (
                <li key={h.id} className="flex items-center justify-between text-sm bg-zinc-950 rounded px-2 py-1">
                  <span className="text-zinc-400 text-xs">{dataBR(h.data)}</span>
                  <span className="font-mono">{campo.fmt(h.valor)} {campo.unidade}</span>
                  <button type="button" onClick={() => onDelete(h.id)} className="text-red-500 hover:text-red-400 px-1" title="Apagar este registro">×</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
