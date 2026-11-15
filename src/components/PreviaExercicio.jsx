import { useRef, useState } from 'react';
import AvatarMuscular from './AvatarMuscular';
import Midia from './MidiaExercicio';
import { intensidadeDoExercicio } from '../utils/treino';

// Corpo de um exercício expandido: GIF e músculos trabalhados (frente e costas), um de cada vez (arraste ou toque)
export default function PreviaExercicio({ ex, midia, sexo, cor }) {
  const ref = useRef(null);
  const [aba, setAba] = useState(0);
  const ir = (i) => { setAba(i); const el = ref.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); };
  const aoRolar = (e) => { const el = e.currentTarget; setAba(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };
  return (
    <div className="mt-1.5">
      <div ref={ref} onScroll={aoRolar} className="flex overflow-x-auto snap-x snap-mandatory rounded-lg bg-zinc-950 border border-zinc-800" style={{ scrollbarWidth: 'none' }}>
        <div className="snap-center shrink-0 w-full flex items-center justify-center min-h-40 p-1" onClick={() => ir(1)}>
          {midia ? <Midia link={midia} /> : <span className="text-xs text-zinc-500 px-4 text-center">Este exercício ainda não tem GIF. Deslize para ver os músculos.</span>}
        </div>
        <div className="snap-center shrink-0 w-full p-2 flex items-center justify-center" onClick={() => ir(0)}>
          <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidadeDoExercicio(ex)} className="w-full max-w-[16rem]" />
        </div>
      </div>
      <div className="flex justify-center gap-3 mt-1">
        {['GIF', 'Músculos'].map((r, i) => (
          <button key={r} type="button" onClick={() => ir(i)} aria-pressed={aba === i} className={`text-[11px] ${aba === i ? 'text-white font-bold' : 'text-zinc-500'}`}>{aba === i ? '● ' : '○ '}{r}</button>
        ))}
      </div>
    </div>
  );
}

