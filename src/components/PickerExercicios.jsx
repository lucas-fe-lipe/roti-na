import { useMemo, useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import Previa from './PreviaExercicio';
import ExercicioEditor from './ExercicioEditor';
import FiltrosExercicios from './FiltrosExercicios';
import useFiltrosExercicios from '../hooks/useFiltrosExercicios';
import { todosExercicios, filtrarExercicios, EQP, equipamentosDe } from '../data/exercicios';
import { notificar } from '../utils/toast';

// Pop-up com a lista de exercícios: filtros de músculo (todos) e equipamento (qualquer um), prévia e "+"
export default function PickerExercicios({ config, midias = {}, exCustom, onEscolher, onClose }) {
  useVoltar(true, onClose);
  const filtros = useFiltrosExercicios();
  const { busca, cats, eqps, setBusca } = filtros;
  const [aberto, setAberto] = useState(null);
  const [novoEx, setNovoEx] = useState(false);
  const { sexo, cor } = config.treino;
  const nCustom = exCustom?.lista?.length || 0;

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
        <FiltrosExercicios filtros={filtros} />
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
