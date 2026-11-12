import { useState, useMemo } from 'react';
import useVoltar from '../hooks/useVoltar';
import AvatarMuscular from './AvatarMuscular';
import { EXERCICIOS } from '../data/exercicios';
import { hojeLocalStr } from '../utils/date';
import { validarSessao, resumoSessao, intensidadesDaSessao, evolucaoExercicio, variacaoEvolucao } from '../utils/sessoes';

const achar = (id) => EXERCICIOS.find((e) => e.id === id);
const fmtData = (d) => { const [y, m, dia] = String(d).split('-'); return `${dia}/${m}/${y}`; };
const fmtCurta = (d) => { const [, m, dia] = String(d).split('-'); return `${dia}/${m}`; };
const kg = (n, c = 1) => Number(n).toFixed(c).replace('.', ',').replace(/,0$/, '');
const campo = 'bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1.5 text-xs text-white text-center w-full';
const num = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });

// ---------- registrar (ou editar) uma sessão ----------
export function EditorSessao({ inicial, config, onClose, onSalvar }) {
  useVoltar(true, onClose);
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { sexo, cor, modo } = config.treino;

  const validacao = useMemo(() => validarSessao(f, null, () => true), [f]);
  const intensidades = useMemo(() => (validacao.ok ? intensidadesDaSessao(validacao.sessao, achar, modo) : {}), [validacao, modo]);

  const mudarSerie = (ei, si, campoNome, v) => setF((s) => ({ ...s, itens: s.itens.map((it, i) => (i !== ei ? it : { ...it, series: it.series.map((x, j) => (j === si ? { ...x, [campoNome]: v } : x)) })) }));
  const addSerie = (ei) => setF((s) => ({ ...s, itens: s.itens.map((it, i) => {
    if (i !== ei) return it;
    const ult = it.series[it.series.length - 1] || { reps: '', carga: '' };
    return { ...it, series: [...it.series, { id: `n${Date.now().toString(36)}${it.series.length}`, reps: ult.reps, carga: ult.carga }] };
  }) }));
  const delSerie = (ei, si) => setF((s) => ({ ...s, itens: s.itens.map((it, i) => (i !== ei ? it : { ...it, series: it.series.filter((_, j) => j !== si) })) }));

  const salvar = async () => {
    const r = validarSessao(f, hojeLocalStr(), (id) => !!achar(id));
    if (!r.ok) return setErro(r.erro);
    setErro('');
    setSalvando(true);
    await onSalvar({ ...r.sessao, id: f.id, criadoEm: f.criadoEm });
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[52] p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Sessão de treino" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold">{f.id ? 'Editar sessão' : 'Registrar sessão'}</h2>
            <div className="text-xs text-zinc-500 truncate">{f.treinoNome}</div>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <label className="flex flex-col text-[11px] text-zinc-400">Data
          <input type="date" value={f.data} max={hojeLocalStr()} onChange={(e) => setF({ ...f, data: e.target.value })} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white [color-scheme:dark]" />
        </label>

        <p className="text-[11px] text-zinc-500">Já vem preenchido com o seu último treino (ou o plano). Ajuste o que mudou; série com repetições em branco conta como não feita.</p>

        {f.itens.map((it, ei) => {
          const ex = achar(it.exercicioId);
          return (
            <div key={it.exercicioId + ei} className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-2 space-y-1">
              <div className="text-sm font-bold text-zinc-100">{ex ? ex.nome : 'Exercício removido'}</div>
              <div className="grid grid-cols-[1.4rem_1fr_1fr_1.4rem] gap-1 text-[10px] text-zinc-500 px-0.5"><span /><span className="text-center">Repetições</span><span className="text-center">Carga (kg)</span><span /></div>
              {it.series.map((s, si) => (
                <div key={s.id} className="grid grid-cols-[1.4rem_1fr_1fr_1.4rem] gap-1 items-center">
                  <span className="text-[11px] text-zinc-500 text-center">{si + 1}</span>
                  <input aria-label={`Repetições da série ${si + 1} de ${ex?.nome || ''}`} inputMode="numeric" value={s.reps} onChange={(e) => mudarSerie(ei, si, 'reps', e.target.value)} className={campo} />
                  <input aria-label={`Carga da série ${si + 1} de ${ex?.nome || ''}`} inputMode="decimal" value={s.carga} onChange={(e) => mudarSerie(ei, si, 'carga', e.target.value)} placeholder="–" className={campo} />
                  <button type="button" aria-label={`Remover série ${si + 1}`} onClick={() => delSerie(ei, si)} className="text-red-500 hover:text-red-400 font-bold text-sm">×</button>
                </div>
              ))}
              <button type="button" onClick={() => addSerie(ei)} className="text-[11px] font-bold text-zinc-300 hover:text-white">+ Série</button>
            </div>
          );
        })}

        <label className="flex flex-col text-[11px] text-zinc-400">Observação (opcional)
          <input type="text" maxLength={300} value={f.obs} onChange={(e) => setF({ ...f, obs: e.target.value })} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
        </label>

        {validacao.ok && (
          <div className="space-y-1">
            <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidades} className="max-w-[16rem] mx-auto" />
            <div className="text-[11px] text-zinc-500 text-center">{resumoSessao(validacao.sessao).series} séries feitas · {num(resumoSessao(validacao.sessao).volume)} kg de volume</div>
          </div>
        )}

        {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold disabled:opacity-60">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ---------- gráfico da evolução de um exercício ----------
function GraficoEvolucao({ pontos, campoValor, unidade }) {
  const W = 300, H = 110, L = 30, R = 8, T = 10, B = 20;
  if (pontos.length === 0) return <p className="text-xs text-zinc-500 py-3 text-center">Sem registros deste exercício ainda.</p>;
  const dia = (d) => new Date(`${d}T12:00:00`).getTime();
  const t0 = dia(pontos[0].data), t1 = dia(pontos[pontos.length - 1].data);
  const x = (d) => (t1 === t0 ? (L + W - R) / 2 : L + ((dia(d) - t0) / (t1 - t0)) * (W - L - R));
  const vals = pontos.map((p) => p[campoValor]);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (max - min < 1) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15; min = Math.max(0, min - pad); max += pad;
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Evolução (${unidade}) por data`}>
      {[min, (min + max) / 2, max].map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#3f3f46" strokeWidth="0.6" strokeDasharray="3 4" />
          <text x={L - 3} y={y(t) + 3} textAnchor="end" fontSize="8" fill="#a1a1aa">{Math.round(t)}</text>
        </g>
      ))}
      <text x={L} y={H - 5} fontSize="8" fill="#a1a1aa">{fmtCurta(pontos[0].data)}</text>
      {pontos.length > 1 && <text x={W - R} y={H - 5} textAnchor="end" fontSize="8" fill="#a1a1aa">{fmtCurta(pontos[pontos.length - 1].data)}</text>}
      {pontos.length > 1 && <polyline fill="none" stroke="#34d399" strokeWidth="2" strokeLinejoin="round" points={pontos.map((p) => `${x(p.data)},${y(p[campoValor])}`).join(' ')} />}
      {pontos.map((p) => <circle key={p.data} cx={x(p.data)} cy={y(p[campoValor])} r="3" fill="#34d399"><title>{`${fmtData(p.data)}: ${kg(p[campoValor])} ${unidade}`}</title></circle>)}
    </svg>
  );
}

// ---------- histórico das sessões do treino + evolução ----------
export function HistoricoTreino({ treino, sessoes, config, onEditar, onExcluir }) {
  const [aberta, setAberta] = useState(null);
  const [exId, setExId] = useState(treino.itens[0]?.exercicioId || '');
  const [metrica, setMetrica] = useState('cargaMax');
  const { sexo, cor, modo } = config.treino;
  const pontos = useMemo(() => evolucaoExercicio(sessoes, exId), [sessoes, exId]);
  const delta = variacaoEvolucao(pontos, metrica);

  if (sessoes.length === 0) return <p className="text-xs text-zinc-500 italic">Nenhuma sessão registrada ainda. Use "Registrar sessão" depois de treinar.</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-2 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <select value={exId} onChange={(e) => setExId(e.target.value)} aria-label="Exercício" className="flex-1 min-w-0 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-white">
            {treino.itens.map((it) => <option key={it.id} value={it.exercicioId}>{achar(it.exercicioId)?.nome || 'Exercício removido'}</option>)}
          </select>
          <div className="flex rounded border border-zinc-700 overflow-hidden" role="group" aria-label="Métrica">
            {[['cargaMax', 'Carga máx.'], ['volume', 'Volume']].map(([v, r]) => (
              <button key={v} onClick={() => setMetrica(v)} aria-pressed={metrica === v} className={`text-[11px] px-2 py-1 ${metrica === v ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>{r}</button>
            ))}
          </div>
        </div>
        <GraficoEvolucao pontos={pontos} campoValor={metrica} unidade="kg" />
        {delta !== null && <div className="text-[11px] text-zinc-400">{delta === 0 ? 'Igual à sessão anterior.' : `${delta > 0 ? '+' : '−'}${kg(Math.abs(delta))} kg em relação à sessão anterior.`}</div>}
      </div>

      <ul className="flex flex-col gap-1.5">
        {sessoes.map((s) => {
          const r = resumoSessao(s);
          const ativo = aberta === s.id;
          return (
            <li key={s.id} className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-2.5 py-2">
              <button onClick={() => setAberta(ativo ? null : s.id)} aria-expanded={ativo} className="w-full flex items-center justify-between gap-2 text-left">
                <span className="text-sm font-bold text-zinc-100">{fmtData(s.data)}</span>
                <span className="text-[11px] text-zinc-400">{r.series} séries · {num(r.volume)} kg</span>
              </button>
              {ativo && (
                <div className="pt-2 space-y-2">
                  <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidadesDaSessao(s, achar, modo)} className="max-w-[14rem] mx-auto" />
                  <ul className="flex flex-col gap-0.5">
                    {s.itens.map((it) => (
                      <li key={it.exercicioId} className="text-xs text-zinc-300">
                        <span className="text-zinc-100 font-medium">{achar(it.exercicioId)?.nome || 'Exercício removido'}:</span>{' '}
                        {it.series.map((x) => `${x.reps}${x.carga ? ` × ${kg(x.carga)} kg` : ''}`).join(' · ')}
                      </li>
                    ))}
                  </ul>
                  {s.obs && <div className="text-xs text-zinc-500 italic break-words">{s.obs}</div>}
                  <div className="flex justify-end gap-1">
                    <button onClick={() => onEditar(s)} className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded">Editar</button>
                    <button onClick={() => onExcluir(s)} className="text-xs px-2 py-1 text-red-400 hover:text-red-300">Excluir</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
