import { useState } from 'react';

// Valor exato ou faixa ("45" ou "60-90"). O valor é guardado como texto; quem usa valida com lerFaixa().
export default function CampoFaixa({ rotulo, sufixo, valor, onChange, placeholder = '' }) {
  const [faixa, setFaixa] = useState(String(valor || '').includes('-'));
  const [min = '', max = ''] = String(valor || '').split('-');
  const inp = 'w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white text-center';
  const junta = (a, b) => (!a && !b ? '' : `${a}-${b}`);
  const trocar = (f) => { setFaixa(f); if (!f) onChange(min); };
  return (
    <div className="flex flex-col gap-1 text-[11px] text-zinc-400">
      <div className="flex items-center justify-between">
        <span>{rotulo}</span>
        <div className="flex rounded border border-zinc-700 overflow-hidden" role="group" aria-label={`${rotulo}: exata ou faixa`}>
          {[[false, 'Exata'], [true, 'Faixa']].map(([v, r]) => (
            <button key={r} type="button" onClick={() => trocar(v)} aria-pressed={faixa === v} className={`px-2 py-0.5 ${faixa === v ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>{r}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {faixa ? (
          <>
            <input aria-label={`${rotulo}, mínimo`} inputMode="decimal" value={min} placeholder="mín." onChange={(e) => onChange(junta(e.target.value, max))} className={inp} />
            <span className="text-zinc-500">a</span>
            <input aria-label={`${rotulo}, máximo`} inputMode="decimal" value={max} placeholder="máx." onChange={(e) => onChange(junta(min, e.target.value))} className={inp} />
          </>
        ) : (
          <input aria-label={rotulo} inputMode="decimal" value={valor || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inp} />
        )}
        {sufixo}
      </div>
    </div>
  );
}
