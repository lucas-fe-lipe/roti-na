import { useState } from 'react';
import useArrastarOrdem from '../hooks/useArrastarOrdem';
import ConfirmModal from './ConfirmModal';
import PickerExercicios from './PickerExercicios';
import SeriesPopup from './SeriesPopup';
import { achar, rotuloVariacao } from '../data/exercicios';
import { novoItemComSets, textoSeries, reordenarIds } from '../utils/treinoModelo';

// Lista dos exercícios de um treino: arrastar pelo "⋮⋮" muda a ordem, tocar nas quantidades edita as séries,
// "×" remove (sempre confirmando) e o botão no fim adiciona. Quem usa recebe a lista nova em onChange.
export default function ListaExerciciosTreino({ itens, onChange, config, midias, exCustom }) {
  const [picker, setPicker] = useState(false);
  const [seriesPara, setSeriesPara] = useState(null); // { exercicio, item? }
  const [remover, setRemover] = useState(null);
  const arrastar = useArrastarOrdem((id, indice) => {
    const ids = reordenarIds(itens.map((i) => i.id), id, indice);
    if (ids.join() !== itens.map((i) => i.id).join()) onChange(ids.map((tid) => itens.find((i) => i.id === tid)));
  });

  const confirmarSeries = ({ sets, variacao, unilateral }) => {
    const extras = { ...(variacao ? { variacao } : {}), ...(unilateral ? { unilateral: true } : {}) };
    if (seriesPara.item) {
      onChange(itens.map((i) => {
        if (i.id !== seriesPara.item.id) return i;
        const { variacao: _v, unilateral: _u, ...resto } = i;
        return { ...resto, ...novoItemComSets(i.exercicioId, sets, extras), id: i.id };
      }));
    } else {
      onChange([...itens, novoItemComSets(seriesPara.exercicio.id, sets, extras)]);
      setPicker(false);
    }
    setSeriesPara(null);
  };

  const outros = itens.filter((x) => x.id !== arrastar.arrasto);
  return (
    <>
      <ol ref={arrastar.raiz} className="flex flex-col gap-1.5">
        {itens.map((it, idx) => {
          const ex = achar(it.exercicioId);
          const ativo = arrastar.arrasto && arrastar.alvo !== null && it.id !== arrastar.arrasto;
          const linhaAntes = ativo && outros[arrastar.alvo]?.id === it.id;
          const linhaFim = ativo && idx === itens.length - 1 && arrastar.alvo >= outros.length;
          return (
            <li key={it.id} data-ordem-id={it.id} className={`flex items-center gap-1 bg-zinc-950/50 border border-zinc-800 rounded-lg p-1.5 ${arrastar.arrasto === it.id ? 'opacity-40' : ''} ${linhaAntes ? 'border-t-blue-500 border-t-2' : ''} ${linhaFim ? 'border-b-blue-500 border-b-2' : ''}`}>
              <button type="button" onPointerDown={(e) => arrastar.iniciar(e, it.id)} aria-label={`Arrastar para mudar a ordem: ${ex?.nome || 'exercício'}`} title="Arraste para mudar a ordem" style={{ touchAction: 'none' }} className="px-1.5 py-1 text-zinc-500 hover:text-zinc-200 cursor-grab active:cursor-grabbing select-none text-sm font-bold tracking-tighter shrink-0">⋮⋮</button>
              <span className="flex-1 min-w-0 text-xs text-zinc-100 truncate">{ex ? ex.nome : 'Exercício removido'}{(it.variacao || it.unilateral) && <span className="text-zinc-500"> ({rotuloVariacao(it.variacao, it.unilateral)})</span>}</span>
              <button type="button" onClick={() => ex && setSeriesPara({ exercicio: ex, item: it })} aria-label={`Editar séries de ${ex?.nome || 'exercício'}`} className="shrink-0 max-w-[45%] truncate text-[11px] text-zinc-200 bg-zinc-900 border border-zinc-700 hover:border-zinc-500 rounded px-2 py-1">{textoSeries(it)}</button>
              <button type="button" aria-label={`Remover ${ex?.nome || 'exercício'}`} onClick={() => setRemover(it)} className="w-7 h-7 shrink-0 text-red-500 hover:text-red-400 font-bold">×</button>
            </li>
          );
        })}
      </ol>
      <button type="button" onClick={() => setPicker(true)} className="w-full py-2 border border-dashed border-zinc-600 rounded-lg text-sm font-bold text-zinc-200 hover:bg-zinc-800">+ Adicionar exercício</button>

      {picker && <PickerExercicios config={config} midias={midias} exCustom={exCustom} onClose={() => setPicker(false)} onEscolher={(e) => setSeriesPara({ exercicio: e })} />}
      {seriesPara && <SeriesPopup exercicio={seriesPara.exercicio} item={seriesPara.item} rotuloBotao={seriesPara.item ? 'Salvar' : 'Adicionar'} onClose={() => setSeriesPara(null)} onSalvar={confirmarSeries} />}
      <ConfirmModal aberto={!!remover} titulo="Remover exercício" mensagem={remover ? `Remover "${achar(remover.exercicioId)?.nome || 'este exercício'}" do treino?` : ''}
        onCancelar={() => setRemover(null)} onConfirmar={() => { const r = remover; setRemover(null); onChange(itens.filter((x) => x.id !== r.id)); }} />
    </>
  );
}
