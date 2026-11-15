import { useState, useRef } from 'react';

const fmt = (n, casas = 1) => (n === null || n === undefined || !Number.isFinite(n) ? '–' : n.toFixed(casas).replace('.', ','));
const fmtData = (d) => { const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; };
const fmtCurta = (d) => { const [, m, dia] = d.split('-'); return `${dia}/${m}`; };
const dia = (d) => new Date(`${d}T12:00:00`).getTime();

function marcador(i, cx, cy, cor) {
  const k = i % 3;
  if (k === 0) return <circle cx={cx} cy={cy} r="3.5" fill={cor} />;
  if (k === 1) return <rect x={cx - 3.2} y={cy - 3.2} width="6.4" height="6.4" fill={cor} />;
  return <polygon points={`${cx},${cy - 4} ${cx + 4},${cy + 3} ${cx - 4},${cy + 3}`} fill={cor} />;
}

// Gráfico de linhas. "series" são todas as disponíveis; "visiveis" (ids) as que aparecem; "onAlternar(id)" liga/desliga.
// Cada linha usa a própria escala (peso e IMC têm números muito diferentes); com uma só linha, mostra a escala real.
export default function GraficoMedidas({ series, visiveis, onAlternar, rotuloAria = 'Evolução das medidas' }) {
  const [foco, setFoco] = useState(null);
  const svgRef = useRef(null);
  const comDados = series.filter((s) => s.pontos.length > 0);
  const ids = visiveis || comDados.map((s) => s.id);
  const mostradas = comDados.filter((s) => ids.includes(s.id));
  const L = 34, R = 10, T = 12, B = 22, W = 600, H = 220;
  const datas = Array.from(new Set(mostradas.flatMap((s) => s.pontos.map((p) => p.data)))).sort();
  const t0 = datas.length ? dia(datas[0]) : 0, t1 = datas.length ? dia(datas[datas.length - 1]) : 0;
  const x = (d) => (t1 === t0 ? (L + W - R) / 2 : L + ((dia(d) - t0) / (t1 - t0)) * (W - L - R));
  const unica = mostradas.length === 1;

  const faixa = (s) => {
    const v = s.pontos.map((p) => p.valor);
    let min = Math.min(...v), max = Math.max(...v);
    if (max - min < (s.casas === 0 ? 2 : 1)) { const c = (max + min) / 2; min = c - 1; max = c + 1; }
    const pad = (max - min) * 0.12;
    return [min - pad, max + pad];
  };
  const escalas = Object.fromEntries(mostradas.map((s) => [s.id, faixa(s)]));
  const yDe = (s, v) => { const [mn, mx] = escalas[s.id]; return T + (1 - (v - mn) / (mx - mn)) * (H - T - B); };

  const aoMover = (e) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r || datas.length === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    let melhor = datas[0], dist = Infinity;
    datas.forEach((d) => { const dd = Math.abs(x(d) - px); if (dd < dist) { dist = dd; melhor = d; } });
    setFoco(melhor);
  };

  const ticks = unica ? [0, 1, 2, 3].map((i) => { const [mn, mx] = escalas[mostradas[0].id]; return mn + ((mx - mn) * i) / 3; }) : [];
  const dadosFoco = foco ? mostradas.map((s) => ({ s, p: s.pontos.find((p) => p.data === foco) })).filter((o) => o.p) : [];

  return (
    <div>
      {onAlternar && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {comDados.map((s, i) => {
            const on = ids.includes(s.id);
            return (
              <button key={s.id} type="button" onClick={() => onAlternar(s.id)} aria-pressed={on}
                className={`flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded border transition-colors ${on ? 'border-zinc-600 text-zinc-100' : 'border-zinc-800 text-zinc-600'}`}>
                <svg width="14" height="10" aria-hidden="true">{marcador(i, 7, 5, on ? s.cor : '#52525b')}</svg>
                {s.rotulo}
              </button>
            );
          })}
        </div>
      )}
      {mostradas.length === 0 ? (
        <p className="text-xs text-zinc-500 text-center py-10">{comDados.length === 0 ? 'Ainda não há valores para este gráfico.' : 'Marque uma medida acima para ver o gráfico.'}</p>
      ) : (
        <>
          <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-pan-y select-none" role="img" aria-label={rotuloAria}
            onPointerMove={aoMover} onPointerDown={aoMover} onPointerLeave={() => setFoco(null)}>
            {[0, 1, 2, 3].map((k) => { const yy = T + ((H - T - B) * k) / 3; return <line key={k} x1={L} x2={W - R} y1={yy} y2={yy} stroke="#3f3f46" strokeWidth="0.6" strokeDasharray="3 4" />; })}
            {ticks.map((t) => <text key={t} x={L - 4} y={yDe(mostradas[0], t) + 3} textAnchor="end" fontSize="10" fill="#a1a1aa">{t.toFixed(mostradas[0].casas === 0 ? 0 : 1).replace('.', ',')}</text>)}
            {[datas[0], datas.length > 2 ? datas[Math.floor(datas.length / 2)] : null, datas.length > 1 ? datas[datas.length - 1] : null].filter(Boolean).map((d, k, arr) => (
              <text key={d} x={x(d)} y={H - 6} textAnchor={k === 0 && arr.length > 1 ? 'start' : k === arr.length - 1 && arr.length > 1 ? 'end' : 'middle'} fontSize="10" fill="#a1a1aa">{fmtCurta(d)}</text>
            ))}
            {foco && <line x1={x(foco)} x2={x(foco)} y1={T} y2={H - B} stroke="#71717a" strokeWidth="1" />}
            {mostradas.map((s) => {
              const i = series.findIndex((o) => o.id === s.id);
              return (
                <g key={s.id}>
                  {s.pontos.length > 1 && <polyline fill="none" stroke={s.cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={s.pontos.map((p) => `${x(p.data)},${yDe(s, p.valor)}`).join(' ')} />}
                  {s.pontos.map((p) => <g key={p.data + p.valor}>{marcador(i, x(p.data), yDe(s, p.valor), s.cor)}</g>)}
                </g>
              );
            })}
          </svg>
          <div className="min-h-[2.25rem] text-xs text-zinc-300 mt-1" aria-live="polite">
            {foco ? (
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                <span className="font-bold text-zinc-100">{fmtData(foco)}</span>
                {dadosFoco.map(({ s, p }) => <span key={s.id} style={{ color: s.cor }}>{s.rotulo}: <span className="font-bold">{fmt(p.valor, s.casas ?? 1)}{s.unidade ? ` ${s.unidade}` : ''}</span></span>)}
              </div>
            ) : <span className="text-zinc-500">Toque no gráfico para ver os valores de cada dia.{!unica && ' Cada linha tem escala própria.'}</span>}
          </div>
        </>
      )}
    </div>
  );
}
