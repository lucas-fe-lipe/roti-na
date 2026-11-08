import { NOVIDADES } from '../data/novidades';

const formatarData = (iso) => {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
};

export default function Novidades({ onVoltar }) {
  return (
    <div className="w-full max-w-xl flex flex-col gap-4 px-3 sm:px-0 pt-3 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">Novidades</h2>
        <button onClick={onVoltar} className="text-sm text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded hover:bg-zinc-800">Voltar</button>
      </div>

      {NOVIDADES.map((n) => (
        <article key={n.versao} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-bold text-zinc-100">{n.titulo}</h3>
            <span className="text-[11px] text-zinc-500 shrink-0">v{n.versao} · {formatarData(n.data)}</span>
          </div>
          <ul className="mt-2 space-y-1 list-disc list-inside text-xs text-zinc-300">
            {n.itens.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </article>
      ))}
    </div>
  );
}
