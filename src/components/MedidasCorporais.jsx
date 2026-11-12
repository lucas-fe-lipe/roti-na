import { useState, useMemo, useRef } from 'react';
import useVoltar from '../hooks/useVoltar';
import { doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { salvarDoc, apagarDoc } from '../services/db';
import { hojeLocalStr } from '../utils/date';
import { notificar } from '../utils/toast';
import ConfirmModal from './ConfirmModal';
import { EXTRAS, enriquecer, montarSeries, variacao, validarMedida, classificarIMC, numero, estimarGordura, estimarMusculo } from '../utils/medidas';

const fmt = (n, casas = 1) => (n === null || n === undefined || !Number.isFinite(n) ? '–' : n.toFixed(casas).replace('.', ','));
const fmtData = (d) => { const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; };
const fmtCurta = (d) => { const [, m, dia] = d.split('-'); return `${dia}/${m}`; };
const dia = (d) => new Date(`${d}T12:00:00`).getTime();

const vazio = (altura = '') => ({ data: hojeLocalStr(), peso: '', altura: altura === null ? '' : String(altura), abdomen: '', gordura: '', musculo: '', extras: {}, obs: '' });

// ---------- gráfico: 3 linhas (IMC, % gordura, % músculo) ----------
function Grafico({ series }) {
  const [ocultas, setOcultas] = useState({});
  const [foco, setFoco] = useState(null); // data em destaque
  const svgRef = useRef(null);
  const visiveis = series.filter((s) => !ocultas[s.id] && s.pontos.length > 0);
  const todas = visiveis.flatMap((s) => s.pontos);

  const L = 34, R = 10, T = 12, B = 22, W = 600, H = 240;
  const datas = Array.from(new Set(series.flatMap((s) => s.pontos.map((p) => p.data)))).sort();
  if (datas.length === 0) return <p className="text-xs text-zinc-500 text-center py-6">Registre peso, altura e barriga para ver o gráfico.</p>;

  const t0 = dia(datas[0]), t1 = dia(datas[datas.length - 1]);
  const x = (d) => (t1 === t0 ? (L + W - R) / 2 : L + ((dia(d) - t0) / (t1 - t0)) * (W - L - R));
  const vals = todas.map((p) => p.valor);
  let min = vals.length ? Math.min(...vals) : 0, max = vals.length ? Math.max(...vals) : 1;
  if (max - min < 4) { const c = (max + min) / 2; min = c - 2; max = c + 2; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);

  const aoMover = (e) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || datas.length === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    let melhor = datas[0], dist = Infinity;
    datas.forEach((d) => { const dd = Math.abs(x(d) - px); if (dd < dist) { dist = dd; melhor = d; } });
    setFoco(melhor);
  };

  const marcador = (i, cx, cy, cor) => {
    if (i === 0) return <circle cx={cx} cy={cy} r="3.5" fill={cor} />;
    if (i === 1) return <rect x={cx - 3.2} y={cy - 3.2} width="6.4" height="6.4" fill={cor} />;
    return <polygon points={`${cx},${cy - 4} ${cx + 4},${cy + 3} ${cx - 4},${cy + 3}`} fill={cor} />;
  };

  const dadosFoco = foco ? series.map((s) => ({ s, p: s.pontos.find((p) => p.data === foco) })).filter((o) => o.p) : [];

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {series.map((s, i) => (
          <button key={s.id} onClick={() => setOcultas((o) => ({ ...o, [s.id]: !o[s.id] }))} aria-pressed={!ocultas[s.id]}
            className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded border transition-colors ${ocultas[s.id] ? 'border-zinc-800 text-zinc-600' : 'border-zinc-700 text-zinc-200'}`}>
            <svg width="14" height="10" aria-hidden="true">{marcador(i, 7, 5, ocultas[s.id] ? '#52525b' : s.cor)}</svg>
            {s.rotulo}
          </button>
        ))}
      </div>
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-pan-y select-none" role="img" aria-label="Evolução do IMC, do percentual de gordura e do percentual de massa muscular"
        onPointerMove={aoMover} onPointerDown={aoMover} onPointerLeave={() => setFoco(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#3f3f46" strokeWidth="0.6" strokeDasharray="3 4" />
            <text x={L - 4} y={y(t) + 3} textAnchor="end" fontSize="10" fill="#a1a1aa">{t.toFixed(0)}</text>
          </g>
        ))}
        {[datas[0], datas.length > 2 ? datas[Math.floor(datas.length / 2)] : null, datas.length > 1 ? datas[datas.length - 1] : null].filter(Boolean).map((d, k, arr) => (
          <text key={d} x={x(d)} y={H - 6} textAnchor={k === 0 && arr.length > 1 ? 'start' : k === arr.length - 1 && arr.length > 1 ? 'end' : 'middle'} fontSize="10" fill="#a1a1aa">{fmtCurta(d)}</text>
        ))}
        {foco && <line x1={x(foco)} x2={x(foco)} y1={T} y2={H - B} stroke="#71717a" strokeWidth="1" />}
        {visiveis.map((s) => {
          const i = series.findIndex((o) => o.id === s.id);
          return (
            <g key={s.id}>
              {s.pontos.length > 1 && <polyline fill="none" stroke={s.cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={s.pontos.map((p) => `${x(p.data)},${y(p.valor)}`).join(' ')} />}
              {s.pontos.map((p) => <g key={p.data + p.valor}>{marcador(i, x(p.data), y(p.valor), s.cor)}</g>)}
            </g>
          );
        })}
      </svg>
      <div className="min-h-[2.25rem] text-xs text-zinc-300 mt-1" aria-live="polite">
        {foco ? (
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <span className="font-bold text-zinc-100">{fmtData(foco)}</span>
            {dadosFoco.map(({ s, p }) => <span key={s.id} style={{ color: s.cor }}>{s.rotulo}: <span className="font-bold">{fmt(p.valor)}{s.unidade}</span></span>)}
          </div>
        ) : <span className="text-zinc-500">Toque ou passe o mouse no gráfico para ver os valores de cada dia.</span>}
      </div>
    </div>
  );
}

// ---------- formulário ----------
function ModalMedida({ inicial, sexo, onSexo, onClose, onSalvar }) {
  useVoltar(true, onClose);
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState('');
  const [mais, setMais] = useState(Object.keys(inicial.extras || {}).length > 0 || !!inicial.gordura || !!inicial.musculo);
  // estimativas ao vivo (usam o valor digitado em "Mais medidas" quando existir)
  const gEst = estimarGordura(sexo, f.altura, f.abdomen);
  const gUsada = numero(f.gordura) > 0 ? numero(f.gordura) : gEst;
  const mEst = estimarMusculo(sexo, f.peso, gUsada);
  const fmtN = (n, c = 1) => (n === null || !Number.isFinite(n) ? '–' : n.toFixed(c).replace('.', ','));
  const [salvando, setSalvando] = useState(false);
  const campo = (id, rotulo, un, passo = '0.1') => (
    <label className="flex flex-col text-[11px] text-zinc-400">
      {rotulo} {un && <span className="text-zinc-600">({un})</span>}
      <input type="text" inputMode="decimal" value={f[id] ?? ''} onChange={(e) => setF({ ...f, [id]: e.target.value })} step={passo}
        className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
    </label>
  );

  const salvar = async () => {
    const r = validarMedida(f, hojeLocalStr());
    if (!r.ok) return setErro(r.erro);
    setErro('');
    setSalvando(true);
    await onSalvar({ ...r.medida, id: inicial.id });
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Medição" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-4 shadow-2xl border border-zinc-800 max-h-[90vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{inicial.id ? 'Editar medição' : 'Nova medição'}</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <label className="flex flex-col text-[11px] text-zinc-400">
          Data
          <input type="date" value={f.data} max={hojeLocalStr()} onChange={(e) => setF({ ...f, data: e.target.value })} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white [color-scheme:dark]" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          {campo('peso', 'Peso', 'kg')}
          {campo('altura', 'Altura', 'cm')}
          {campo('abdomen', 'Barriga', 'cm')}
        </div>
        <p className="text-[11px] text-zinc-500">Barriga: meça na altura do umbigo, sem apertar. Com só esses três dados o app calcula o IMC e estima gordura e músculo. A altura só precisa ser informada uma vez.</p>
        <div className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
          <div className="text-xs text-zinc-300">
            <div>Gordura {numero(f.gordura) > 0 ? '' : 'estimada '}<span className="font-bold text-white">{fmtN(gUsada)}%</span></div>
            <div>Músculo {numero(f.musculo) > 0 ? '' : 'estimado '}<span className="font-bold text-white">{fmtN(numero(f.musculo) > 0 ? numero(f.musculo) : mEst)} kg</span></div>
          </div>
          <div className="flex rounded border border-zinc-700 overflow-hidden" role="group" aria-label="Sexo para o cálculo">
            {[['m', 'Homem'], ['f', 'Mulher']].map(([v, r]) => (
              <button key={v} type="button" onClick={() => onSexo(v)} aria-pressed={sexo === v} className={`text-[11px] px-2 py-1 ${sexo === v ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>{r}</button>
            ))}
          </div>
        </div>

        <button type="button" onClick={() => setMais((m) => !m)} aria-expanded={mais} className="text-xs font-bold text-zinc-300 hover:text-white">
          {mais ? '▼︎' : '▶︎'} Mais medidas
        </button>
        {mais && (
          <>
          <p className="text-[11px] text-zinc-500">Se você tem a gordura e o músculo da sua balança ou avaliação física, digite aqui: eles passam a valer no lugar da estimativa.</p>
          <div className="grid grid-cols-2 gap-2">
            {campo('gordura', '% de gordura', '%')}
            {campo('musculo', 'Massa muscular', 'kg')}
          </div>
          <div className="text-[11px] text-zinc-400">Outras medidas (cm)</div>
          <div className="grid grid-cols-2 gap-2">
            {EXTRAS.map((e) => (
              <label key={e.id} className="flex flex-col text-[11px] text-zinc-400">
                {e.rotulo}
                <input type="text" inputMode="decimal" value={f.extras?.[e.id] ?? ''} onChange={(ev) => setF({ ...f, extras: { ...f.extras, [e.id]: ev.target.value } })} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
              </label>
            ))}
          </div>
          </>
        )}
        <label className="flex flex-col text-[11px] text-zinc-400">
          Observação (opcional)
          <input type="text" maxLength={300} value={f.obs || ''} onChange={(e) => setF({ ...f, obs: e.target.value })} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
        </label>
        {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold disabled:opacity-60">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ---------- bloco principal ----------
export default function MedidasCorporais({ user, medidas, setMedidas, sexo = 'm', onSexo = () => {} }) {
  const [modal, setModal] = useState(null); // formulário inicial
  const [excluir, setExcluir] = useState(null);
  const enr = useMemo(() => enriquecer(medidas, sexo), [medidas, sexo]);
  const series = useMemo(() => montarSeries(enr), [enr]);
  const ultimaAltura = [...enr].reverse().find((r) => r.alturaUsada)?.alturaUsada ?? '';

  const persistirLocal = (lista) => { setMedidas(lista); if (!user) { try { localStorage.setItem('local_medidas', JSON.stringify(lista)); } catch { /* sem armazenamento */ } } };

  const salvar = async (m) => {
    const id = m.id || `${m.data}-${Date.now()}`;
    const completa = { ...m, id };
    // o Firestore não aceita undefined
    Object.keys(completa).forEach((k) => completa[k] === undefined && delete completa[k]);
    let ok = true;
    if (user) ok = await salvarDoc(doc(db, 'users', user.uid, 'medidas', id), completa);
    else persistirLocal([...medidas.filter((x) => x.id !== id), completa]);
    if (ok) { notificar('Medição salva.', 'sucesso'); setModal(null); }
  };

  const apagar = async (id) => {
    let ok = true;
    if (user) ok = await apagarDoc(doc(db, 'users', user.uid, 'medidas', id));
    else persistirLocal(medidas.filter((x) => x.id !== id));
    if (ok) notificar('Medição excluída.', 'sucesso');
  };

  const sPorId = Object.fromEntries(series.map((s) => [s.id, s]));
  const delta = (id, casas = 1) => {
    const v = variacao(sPorId[id]?.pontos);
    if (v === null) return null;
    return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(casas).replace('.', ',')}`;
  };
  const pesoPontos = enr.filter((r) => r.peso !== null && r.peso !== undefined).map((r) => ({ valor: r.peso }));
  const dPeso = variacao(pesoPontos);
  const musculoKgPontos = enr.filter((r) => Number.isFinite(r.musculoUsado)).map((r) => ({ valor: r.musculoUsado }));
  const ultimoDe = (campo) => [...enr].reverse().find((r) => r[campo] !== null && r[campo] !== undefined && Number.isFinite(r[campo]));

  const cards = [
    { r: 'Peso', v: ultimoDe('peso') ? `${fmt(ultimoDe('peso').peso)} kg` : '–', d: dPeso === null ? null : `${dPeso > 0 ? '+' : dPeso < 0 ? '−' : ''}${Math.abs(dPeso).toFixed(1).replace('.', ',')} kg` },
    { r: 'IMC', v: fmt(ultimoDe('imc')?.imc), s: classificarIMC(ultimoDe('imc')?.imc), d: delta('imc') },
    { r: '% de gordura', v: ultimoDe('gorduraUsada') ? `${fmt(ultimoDe('gorduraUsada').gorduraUsada)}%` : '–', s: ultimoDe('gorduraUsada')?.gorduraEstimada ? 'estimada' : '', d: delta('gordura') ? `${delta('gordura')} p.p.` : null },
    { r: 'Massa muscular', v: ultimoDe('musculoUsado') ? `${fmt(ultimoDe('musculoUsado').musculoUsado)} kg` : '–', s: ultimoDe('musculoPct') ? `${fmt(ultimoDe('musculoPct').musculoPct)}% do peso${ultimoDe('musculoUsado')?.musculoEstimado ? ' · estimada' : ''}` : '', d: (() => { const v = variacao(musculoKgPontos); return v === null ? null : `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v).toFixed(1).replace('.', ',')} kg`; })() },
  ];

  const historico = [...enr].reverse();

  return (
    <div className="mt-2 w-full px-2 sm:px-0 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-100">Medidas corporais</h2>
        <button onClick={() => setModal(vazio(ultimaAltura))} className="text-xs font-bold px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 transition-colors">+ Medição</button>
      </div>

      {enr.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-300 mb-1">Nenhuma medição ainda.</p>
          <p className="text-xs text-zinc-500 mb-3">Registre peso, altura e a medida da barriga: o app calcula o IMC e estima gordura e músculo.</p>
          <button onClick={() => setModal(vazio(''))} className="text-sm font-bold px-4 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300">Registrar a primeira medição</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {cards.map((c) => (
              <div key={c.r} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
                <div className="text-[11px] text-zinc-400">{c.r}</div>
                <div className="text-lg font-bold text-white leading-tight">{c.v}</div>
                {c.s && <div className="text-[11px] text-zinc-400">{c.s}</div>}
                {c.d && <div className="text-[11px] text-zinc-500">{c.d} desde a anterior</div>}
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
            <Grafico series={series} />
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 px-3 py-2">Histórico</h3>
            {historico.map((r) => {
              const extras = EXTRAS.filter((e) => numero(r.extras?.[e.id]) > 0);
              return (
                <div key={r.id} className="px-3 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0 text-xs text-zinc-300">
                    <div className="font-bold text-zinc-100 text-sm">{fmtData(r.data)}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {r.peso !== null && r.peso !== undefined && <span>Peso {fmt(r.peso)} kg</span>}
                      {r.imc !== null && <span>IMC {fmt(r.imc)}</span>}
                      {r.abdomen !== null && <span>Barriga {fmt(r.abdomen)} cm</span>}
                      {Number.isFinite(r.gorduraUsada) && <span>Gordura {fmt(r.gorduraUsada)}%{r.gorduraEstimada ? ' (est.)' : ''}</span>}
                      {Number.isFinite(r.musculoUsado) && <span>Músculo {fmt(r.musculoUsado)} kg{r.musculoEstimado ? ' (est.)' : ''}{r.musculoPct ? ` · ${fmt(r.musculoPct)}%` : ''}</span>}
                    </div>
                    {extras.length > 0 && <div className="text-zinc-500 mt-0.5">{extras.map((e) => `${e.rotulo} ${fmt(numero(r.extras[e.id]))} cm`).join(' · ')}</div>}
                    {r.obs && <div className="text-zinc-500 italic mt-0.5 break-words">{r.obs}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal({ ...vazio(''), ...r, peso: r.peso ?? '', altura: r.altura ?? '', abdomen: r.abdomen ?? '', gordura: r.gordura ?? '', musculo: r.musculo ?? '', extras: Object.fromEntries(Object.entries(r.extras || {}).filter(([k]) => k !== 'abdomen').map(([k, v]) => [k, String(v)])), obs: r.obs || '' })} className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded">Editar</button>
                    <button onClick={() => setExcluir(r)} className="text-xs px-2 py-1 text-red-400 hover:text-red-300" aria-label={`Excluir medição de ${fmtData(r.data)}`}>Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {modal && <ModalMedida inicial={modal} sexo={sexo} onSexo={onSexo} onClose={() => setModal(null)} onSalvar={salvar} />}
      <ConfirmModal
        aberto={!!excluir}
        titulo="Excluir medição"
        mensagem={excluir ? `Excluir a medição de ${fmtData(excluir.data)}?` : ''}
        onCancelar={() => setExcluir(null)}
        onConfirmar={() => { const id = excluir.id; setExcluir(null); apagar(id); }}
      />
    </div>
  );
}
