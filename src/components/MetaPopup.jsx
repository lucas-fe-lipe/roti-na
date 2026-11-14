import { useLayoutEffect, useRef } from 'react';
import useVoltar from '../hooks/useVoltar';

// Pop-up de uma meta diária: fica no lugar do bloco (mesma altura), com − , + e "…" (editar).
// Fundo escurecido; tocar fora fecha.
export default function MetaPopup({ meta, rect, progresso, onMais, onMenos, onEditar, onClose }) {
  useVoltar(true, onClose);
  const ref = useRef(null);
  const percentual = Math.min(100, (progresso / meta.meta) * 100);

  // mantém o pop-up inteiro dentro da tela (ele é mais largo que o bloco)
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    const max = window.innerWidth - 8;
    el.style.left = `${Math.max(8, Math.min(rect.left, max - w))}px`;
  }, [rect.left, progresso, meta.titulo]);

  const botao = 'w-7 h-7 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded flex items-center justify-center text-sm transition-colors disabled:opacity-30 disabled:hover:bg-zinc-800/80';
  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-label={`Meta ${meta.titulo}`}
        onClick={(e) => e.stopPropagation()}
        style={{ top: rect.top, left: rect.left, height: rect.height, maxWidth: 'calc(100vw - 16px)' }}
        className="absolute inline-flex items-center justify-between bg-zinc-900 border border-zinc-600 rounded-lg overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 left-0 bottom-0 transition-all duration-300 opacity-80 z-0" style={{ width: `${percentual}%`, backgroundColor: meta.cor }}></div>
        <div className="relative z-10 pl-1.5 pr-1 flex flex-col justify-center overflow-hidden">
          <span className="text-xs font-bold text-white truncate">{meta.titulo}</span>
          <span className="text-[10px] text-zinc-300 font-mono">{progresso} / {meta.meta} {meta.unidade}</span>
        </div>
        <div className="relative z-10 flex items-center gap-0.5 pr-1.5 pl-0.5">
          <button aria-label={`Subtrair de ${meta.titulo}`} disabled={progresso <= 0} onClick={onMenos} className={botao}>−</button>
          <button aria-label={`Adicionar a ${meta.titulo}`} onClick={onMais} className={botao}>+</button>
          <button aria-label={`Editar ${meta.titulo}`} onClick={onEditar} className={botao}>…</button>
        </div>
      </div>
    </div>
  );
}
