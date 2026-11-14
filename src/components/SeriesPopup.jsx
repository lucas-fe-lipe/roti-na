import { useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import { validarSet, setsDoItem } from '../utils/treinoModelo';

const campo = 'w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white text-center';
let seq = 0;
const comId = (x) => ({ id: `k${seq++}`, reps: x.reps, carga: x.carga });

// Pop-up de um exercício no treino: séries com repetições e peso (número ou faixa). "+ série" copia a anterior.
export default function SeriesPopup({ exercicio, item = null, rotuloBotao = 'Adicionar', onSalvar, onClose }) {
  useVoltar(true, onClose);
  const inicial = item ? setsDoItem(item) : [{ reps: '10', carga: '' }];
  const [sets, setSets] = useState(inicial.map(comId));
  const [variacao, setVariacao] = useState(item?.variacao || '');
  const [unilateral, setUnilateral] = useState(!!item?.unilateral);
  const [erro, setErro] = useState('');

  const mudar = (id, f, v) => setSets((l) => l.map((x) => (x.id === id ? { ...x, [f]: v } : x)));
  const maisUma = () => setSets((l) => (l.length >= 20 ? l : [...l, comId(l[l.length - 1] || { reps: '10', carga: '' })]));

  const salvar = () => {
    const saida = [];
    for (const x of sets) {
      const r = validarSet(x);
      if (!r.ok) return setErro(r.erro);
      saida.push(r.set);
    }
    setErro('');
    onSalvar({ sets: saida, variacao, unilateral });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[56] p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={exercicio.nome} className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-sm p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <h2 className="text-base font-bold break-words">{exercicio.nome}</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {(exercicio.eq || exercicio.uni) && (
          <div className="flex items-center gap-2">
            {exercicio.eq && (
              <select aria-label="Variação" value={variacao} onChange={(e) => setVariacao(e.target.value)} className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1.5 text-xs text-zinc-200">
                <option value="">Variação: não definida</option>
                {exercicio.eq.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            {exercicio.uni && (
              <label className="flex items-center gap-1 text-xs text-zinc-300 shrink-0"><input type="checkbox" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} /> Unilateral</label>
            )}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-1.5 text-[10px] text-zinc-500 px-0.5">
            <span>Série</span><span className="text-center">Repetições</span><span className="text-center">Peso (kg)</span><span />
          </div>
          {sets.map((x, i) => (
            <div key={x.id} className="grid grid-cols-[2rem_1fr_1fr_1.5rem] gap-1.5 items-center">
              <span className="text-xs text-zinc-400 text-center">{i + 1}</span>
              <input aria-label={`Repetições da série ${i + 1}`} inputMode="numeric" value={x.reps} onChange={(e) => mudar(x.id, 'reps', e.target.value)} placeholder="10 ou 5-7" className={campo} />
              <input aria-label={`Peso da série ${i + 1}`} inputMode="decimal" value={x.carga} onChange={(e) => mudar(x.id, 'carga', e.target.value)} placeholder="20 ou 20-25" className={campo} />
              <button type="button" aria-label={`Remover série ${i + 1}`} disabled={sets.length === 1} onClick={() => setSets((l) => l.filter((y) => y.id !== x.id))} className="text-red-500 hover:text-red-400 font-bold disabled:opacity-25">×</button>
            </div>
          ))}
          <button type="button" onClick={maisUma} disabled={sets.length >= 20} className="self-start text-xs font-bold px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-100 disabled:opacity-40">+ Adicionar série</button>
        </div>

        {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Cancelar</button>
          <button onClick={salvar} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold">{rotuloBotao}</button>
        </div>
      </div>
    </div>
  );
}
