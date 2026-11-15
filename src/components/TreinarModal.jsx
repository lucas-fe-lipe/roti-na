import { useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import Midia from './MidiaExercicio';
import { achar, rotuloVariacao } from '../data/exercicios';
import { textoSeries } from '../utils/treinoModelo';

const campo = 'w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-base text-white text-center';

// Modo treinar: um exercício por vez, na ordem do treino. As quantidades podem ser ajustadas (valem para esta sessão);
// ao finalizar, entrega o formulário da sessão para conferir e salvar.
export default function TreinarModal({ treino, inicial, midias = {}, onFinalizar, onClose }) {
  useVoltar(true, onClose);
  const [f, setF] = useState(inicial);
  const [i, setI] = useState(0);
  const total = f.itens.length;
  const it = f.itens[i];
  const ex = it ? achar(it.exercicioId) : null;
  const plano = treino.itens.find((x) => x.exercicioId === it?.exercicioId);

  const mudar = (si, c, v) => setF((s) => ({ ...s, itens: s.itens.map((x, k) => (k !== i ? x : { ...x, series: x.series.map((y, j) => (j === si ? { ...y, [c]: v } : y)) })) }));
  const maisUma = () => setF((s) => ({ ...s, itens: s.itens.map((x, k) => {
    if (k !== i) return x;
    const u = x.series[x.series.length - 1] || { reps: '', carga: '' };
    return { ...x, series: [...x.series, { id: `t${Date.now().toString(36)}${x.series.length}`, reps: u.reps, carga: u.carga }] };
  }) }));
  const tirar = (si) => setF((s) => ({ ...s, itens: s.itens.map((x, k) => (k !== i ? x : { ...x, series: x.series.filter((_, j) => j !== si) })) }));

  if (!it) return null;
  const ultimo = i === total - 1;
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[54] p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Treinar" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-4 shadow-2xl border border-zinc-800 max-h-[94vh] overflow-y-auto flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <div className="text-[11px] text-zinc-500">{treino.nome} · exercício {i + 1} de {total}</div>
            <h2 className="text-lg font-bold break-words">{ex ? ex.nome : 'Exercício removido'}{(it.variacao || it.unilateral) && <span className="text-sm font-normal text-zinc-400"> ({rotuloVariacao(it.variacao, it.unilateral)})</span>}</h2>
          </div>
          <button aria-label="Sair do treino" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="h-1 rounded bg-zinc-800 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${((i + 1) / total) * 100}%` }} /></div>

        {midias[it.exercicioId] && <Midia link={midias[it.exercicioId]} />}
        {plano && <div className="text-[11px] text-zinc-500">Planejado: {textoSeries(plano)}</div>}

        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[2rem_1fr_1fr_1.75rem] gap-1.5 text-[10px] text-zinc-500 px-0.5"><span>Série</span><span className="text-center">Repetições</span><span className="text-center">Peso (kg)</span><span /></div>
          {it.series.map((s, si) => (
            <div key={s.id} className="grid grid-cols-[2rem_1fr_1fr_1.75rem] gap-1.5 items-center">
              <span className="text-xs text-zinc-400 text-center">{si + 1}</span>
              <input type="text" inputMode="numeric" aria-label={`Repetições da série ${si + 1}`} value={s.reps} onChange={(e) => mudar(si, 'reps', e.target.value)} className={campo} />
              <input type="text" inputMode="decimal" aria-label={`Peso da série ${si + 1}`} value={s.carga} onChange={(e) => mudar(si, 'carga', e.target.value)} className={campo} />
              <button type="button" aria-label={`Remover série ${si + 1}`} onClick={() => tirar(si)} className="text-red-500 hover:text-red-400 font-bold">×</button>
            </div>
          ))}
          <button type="button" onClick={maisUma} className="self-start text-xs font-bold text-zinc-300 hover:text-white">+ Adicionar série</button>
        </div>

        <div className="flex gap-2 pt-2 border-t border-zinc-800">
          <button onClick={() => setI(i - 1)} disabled={i === 0} className="flex-1 py-2.5 bg-zinc-800 rounded-lg text-zinc-200 hover:bg-zinc-700 text-sm font-bold disabled:opacity-30">← Anterior</button>
          {ultimo
            ? <button onClick={() => onFinalizar(f)} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold">Finalizar</button>
            : <button onClick={() => setI(i + 1)} className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 rounded-lg text-sm font-bold">Próximo →</button>}
        </div>
      </div>
    </div>
  );
}
