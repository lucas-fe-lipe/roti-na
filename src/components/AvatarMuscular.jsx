import { CORPOS } from '../data/corpoSvg';
import { MUSCULOS } from '../data/exercicios';
import { corDoMusculo, COR_PADRAO } from '../utils/treino';

// Corpo (frente e costas) com os músculos coloridos conforme a intensidade (0 a 1) de cada grupo.
export default function AvatarMuscular({ sexo = 'm', cor = COR_PADRAO, intensidades = {}, vistas = ['frente', 'costas'], className = '' }) {
  const corpo = CORPOS[sexo === 'f' ? 'f' : 'm'];
  return (
    <div className={`flex justify-center gap-1 ${className}`}>
      {vistas.map((v) => {
        const d = corpo[v];
        return (
          <svg key={v} viewBox={d.viewBox} className="h-auto flex-1 min-w-0 max-w-[200px]" role="img" aria-label={`${sexo === 'f' ? 'Feminino' : 'Masculino'} — ${v}`}>
            <path d={d.corpo} fill="#141414" stroke="#9A9A9A" strokeWidth="2.5" strokeLinejoin="round" />
            {d.musculos.map((m) => {
              const c = corDoMusculo(intensidades[m.g], cor);
              return <path key={m.id} d={m.d} fill={c} stroke={c} strokeWidth="1" strokeLinejoin="round"><title>{MUSCULOS[m.g] || m.g}</title></path>;
            })}
          </svg>
        );
      })}
    </div>
  );
}
