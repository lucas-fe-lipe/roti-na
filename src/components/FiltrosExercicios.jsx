import { CATEGORIAS, EQP } from '../data/exercicios';

const chip = (ativo) => `text-[11px] px-2.5 py-1 rounded-full border whitespace-nowrap ${ativo ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-bold' : 'border-zinc-700 text-zinc-400 hover:text-zinc-100'}`;

// Busca + filtros de músculos (atende a todos os marcados) e de equipamento (qualquer um dos marcados)
export default function FiltrosExercicios({ filtros }) {
  const { busca, cats, eqps, setBusca, alternarCat, alternarEqp, limpar } = filtros;
  return (
    <div className="flex flex-col gap-2">
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício…" aria-label="Buscar exercício" className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-sm text-white" />
      <div>
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Músculos <span className="normal-case">(mostra o que atende a todos os marcados)</span></div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtro de músculos">
          {CATEGORIAS.map((c) => <button key={c} type="button" onClick={() => alternarCat(c)} aria-pressed={cats.includes(c)} className={chip(cats.includes(c))}>{c}</button>)}
        </div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-1">Equipamento <span className="normal-case">(mostra o que usa qualquer um dos marcados)</span></div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtro de equipamento">
          {Object.entries(EQP).map(([k, r]) => <button key={k} type="button" onClick={() => alternarEqp(k)} aria-pressed={eqps.includes(k)} className={chip(eqps.includes(k))}>{r}</button>)}
        </div>
      </div>
      {(busca || cats.length > 0 || eqps.length > 0) && <button type="button" onClick={limpar} className="self-start text-[11px] text-zinc-400 hover:text-white underline">Limpar filtros</button>}
    </div>
  );
}
