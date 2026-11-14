import { useMemo, useRef, useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import AvatarMuscular from './AvatarMuscular';
import ExercicioEditor from './ExercicioEditor';
import Midia from './MidiaExercicio';
import { todosExercicios, filtrarExercicios, CATEGORIAS, EQP, equipamentosDe } from '../data/exercicios';
import { intensidadeDoExercicio } from '../utils/treino';
import { notificar } from '../utils/toast';

const chip = (ativo) => `text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${ativo ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-bold' : 'border-zinc-700 text-zinc-400 hover:text-zinc-100'}`;

// Corpo de um exercício expandido: GIF e músculos trabalhados (frente e costas), um de cada vez (arraste ou toque)
function Previa({ ex, midia, sexo, cor }) {
  const ref = useRef(null);
  const [aba, setAba] = useState(0);
  const ir = (i) => { setAba(i); const el = ref.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); };
  const aoRolar = (e) => { const el = e.currentTarget; setAba(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };
  return (
    <div className="mt-1.5">
      <div ref={ref} onScroll={aoRolar} className="flex overflow-x-auto snap-x snap-mandatory rounded-lg bg-zinc-950 border border-zinc-800" style={{ scrollbarWidth: 'none' }}>
        <div className="snap-center shrink-0 w-full flex items-center justify-center min-h-40 p-1" onClick={() => ir(1)}>
          {midia ? <Midia link={midia} /> : <span className="text-xs text-zinc-500 px-4 text-center">Este exercício ainda não tem GIF. Deslize para ver os músculos.</span>}
        </div>
        <div className="snap-center shrink-0 w-full p-2 flex items-center justify-center" onClick={() => ir(0)}>
          <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidadeDoExercicio(ex)} className="max-w-[16rem]" />
        </div>
      </div>
      <div className="flex justify-center gap-3 mt-1">
        {['GIF', 'Músculos'].map((r, i) => (
          <button key={r} type="button" onClick={() => ir(i)} aria-pressed={aba === i} className={`text-[11px] ${aba === i ? 'text-white font-bold' : 'text-zinc-500'}`}>{aba === i ? '● ' : '○ '}{r}</button>
        ))}
      </div>
    </div>
  );
}

// Pop-up com a lista de exercícios: filtros de músculo (todos) e equipamento (qualquer um), prévia e "+"
export default function PickerExercicios({ config, midias = {}, exCustom, onEscolher, onClose }) {
  useVoltar(true, onClose);
  const [busca, setBusca] = useState('');
  const [cats, setCats] = useState([]);
  const [eqps, setEqps] = useState([]);
  const [aberto, setAberto] = useState(null);
  const [novoEx, setNovoEx] = useState(false);
  const { sexo, cor } = config.treino;
  const nCustom = exCustom?.lista?.length || 0;
  const alternar = (set, v) => set((l) => (l.includes(v) ? l.filter((x) => x !== v) : [...l, v]));

  const lista = useMemo(() => filtrarExercicios(todosExercicios(), { busca, cats, eqps }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busca, cats, eqps, nCustom]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[52] p-3" onClick={onClose}>
      {novoEx && <ExercicioEditor config={config} onClose={() => setNovoEx(false)} onSalvar={async (ex) => { const c = await exCustom.salvar(ex); if (c) { setNovoEx(false); notificar('Exercício criado. Procure por ele na lista.', 'sucesso'); setBusca(c.nome); } }} />}
      <div role="dialog" aria-modal="true" aria-label="Adicionar exercício" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-lg p-3 shadow-2xl border border-zinc-800 max-h-[92vh] flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Adicionar exercício</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício…" aria-label="Buscar exercício" className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white" />
        <div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Músculos <span className="normal-case">(mostra o que atende a todos os marcados)</span></div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtro de músculos">
            {CATEGORIAS.map((c) => <button key={c} type="button" onClick={() => alternar(setCats, c)} aria-pressed={cats.includes(c)} className={chip(cats.includes(c))}>{c}</button>)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Equipamento <span className="normal-case">(mostra o que usa qualquer um dos marcados)</span></div>
          <div className="flex flex-wrap gap-1" role="group" aria-label="Filtro de equipamento">
            {Object.entries(EQP).map(([k, r]) => <button key={k} type="button" onClick={() => alternar(setEqps, k)} aria-pressed={eqps.includes(k)} className={chip(eqps.includes(k))}>{r}</button>)}
          </div>
        </div>
        {exCustom && <button type="button" onClick={() => setNovoEx(true)} className="text-left text-xs px-2 py-1.5 rounded border border-dashed border-zinc-600 text-zinc-200 hover:bg-zinc-800">+ Criar exercício que não está na lista</button>}
        <div className="text-[11px] text-zinc-500">{lista.length} exercício{lista.length === 1 ? '' : 's'}</div>
        <ul className="overflow-y-auto flex flex-col gap-1 min-h-0">
          {lista.length === 0 && <li className="text-xs text-zinc-500 py-2">Nenhum exercício com esses filtros.</li>}
          {lista.map((e) => {
            const ativo = aberto === e.id;
            return (
              <li key={e.id} className="bg-zinc-800/50 rounded-lg px-1.5 py-1">
                <div className="flex items-center gap-1">
                  <button type="button" aria-expanded={ativo} aria-label={`${ativo ? 'Recolher' : 'Ver'} ${e.nome}`} onClick={() => setAberto(ativo ? null : e.id)} className="w-7 h-7 shrink-0 text-zinc-400 hover:text-white text-xs">{ativo ? '▼' : '▶'}</button>
                  <button type="button" onClick={() => setAberto(ativo ? null : e.id)} className="flex-1 min-w-0 text-left">
                    <span className="block text-sm text-zinc-100 truncate">{e.nome}{e.custom && <span className="text-zinc-500 text-[10px]"> · seu</span>}</span>
                    <span className="block text-[10px] text-zinc-500 truncate">{e.cat} · {equipamentosDe(e).map((x) => EQP[x]).join(', ')}</span>
                  </button>
                  <button type="button" aria-label={`Adicionar ${e.nome} ao treino`} onClick={() => onEscolher(e)} className="w-8 h-8 shrink-0 rounded bg-zinc-100 text-zinc-950 font-bold text-lg leading-none hover:bg-white">+</button>
                </div>
                {ativo && <Previa ex={e} midia={midias[e.id]} sexo={sexo} cor={cor} />}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
