import { useMemo, useRef } from 'react';
import { buildFigure, VISTAS } from '../utils/bodyGeometry';

// Área reservada ao desenho (em unidades do SVG). Uma pessoa de ALTURA_CHEIA metros ocupa
// exatamente a altura do chão (GROUND_Y) até o topo (0). Acima disso, a cabeça é cortada.
const VB_W = 300;
const VB_H = 500;
const GROUND_Y = 490;
const ALTURA_CHEIA = 2.5;

export default function BodyFigure({ sexo, alturaM, medidas, imc, view, onChangeView }) {
  const alturaCm = alturaM * 100;

  const shapes = useMemo(
    () => buildFigure(view, sexo, medidas, alturaCm, imc),
    [view, sexo, medidas, alturaCm, imc]
  );

  // regra de 3: 2,5 m -> GROUND_Y unidades; o corpo tem 1000 unidades internas
  const escala = ((alturaM / ALTURA_CHEIA) * GROUND_Y) / 1000;

  const inicioX = useRef(null);
  const onDown = (e) => { inicioX.current = e.clientX; };
  const onUp = (e) => {
    if (inicioX.current === null) return;
    const dx = e.clientX - inicioX.current;
    inicioX.current = null;
    if (dx > 40) onChangeView((view + 2) % 3);
    else if (dx < -40) onChangeView((view + 1) % 3);
  };

  const marcas = [0.5, 1, 1.5, 2, 2.5];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 select-none">
      <div className="relative touch-pan-y" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => { inicioX.current = null; }}>
        <svg viewBox={`${-VB_W / 2} 0 ${VB_W} ${VB_H}`} className="w-full h-auto block" role="img" aria-label={`Corpo ${sexo === 'F' ? 'feminino' : 'masculino'} - vista ${VISTAS[view]}`}>
          {marcas.map(m => {
            const y = GROUND_Y - (m / ALTURA_CHEIA) * GROUND_Y;
            return (
              <g key={m}>
                <line x1={-VB_W / 2 + 22} x2={VB_W / 2} y1={y} y2={y} stroke="#3f3f46" strokeWidth="0.5" strokeDasharray="2 3" />
                <text x={-VB_W / 2 + 2} y={y + 3} fontSize="8" fill="#71717a">{String(m).replace('.', ',')}m</text>
              </g>
            );
          })}
          <line x1={-VB_W / 2} x2={VB_W / 2} y1={GROUND_Y} y2={GROUND_Y} stroke="#71717a" strokeWidth="1" />

          <g transform={`translate(0 ${GROUND_Y}) scale(${escala}) translate(0 -1000)`}>
            {shapes.map((p, i) => (
              <path
                key={i}
                d={p.d}
                fill={p.fill}
                opacity={p.opacity ?? 1}
                stroke={p.stroke || '#09090b'}
                strokeWidth={p.sw || 1}
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>

        <button
          type="button"
          onClick={() => onChangeView((view + 2) % 3)}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-7 h-9 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-lg flex items-center justify-center"
          aria-label="Vista anterior"
        >‹</button>
        <button
          type="button"
          onClick={() => onChangeView((view + 1) % 3)}
          className="absolute right-0 top-1/2 -translate-y-1/2 w-7 h-9 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-lg flex items-center justify-center"
          aria-label="Próxima vista"
        >›</button>
      </div>

      <div className="flex items-center justify-center gap-2 mt-1 text-xs text-zinc-400">
        {VISTAS.map((nome, i) => (
          <button
            key={nome}
            type="button"
            onClick={() => onChangeView(i)}
            className={`px-2 py-0.5 rounded ${view === i ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'hover:text-zinc-200'}`}
          >
            {nome}
          </button>
        ))}
      </div>
    </div>
  );
}
