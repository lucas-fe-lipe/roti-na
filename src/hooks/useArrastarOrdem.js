import { useState, useRef } from 'react';
import { indiceAlvoY } from '../utils/ordem';

// Arrastar pela alça para mudar a ordem de uma lista vertical. Cada item precisa de data-ordem-id={id}.
// onMover(id, indice) é chamado ao soltar; "alvo" serve para desenhar a linha de destino.
export default function useArrastarOrdem(onMover) {
  const [arrasto, setArrasto] = useState(null);
  const [alvo, setAlvo] = useState(null);
  const alvoRef = useRef(null);
  const raiz = useRef(null);

  const calcular = (id, y) => {
    const itens = Array.from(raiz.current?.querySelectorAll('[data-ordem-id]') || []).filter((el) => el.dataset.ordemId !== id);
    return indiceAlvoY(itens.map((el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; }), y);
  };

  const iniciar = (e, id) => {
    e.preventDefault();
    setArrasto(id);
    const mover = (ev) => { const a = calcular(id, ev.clientY); alvoRef.current = a; setAlvo(a); };
    const encerrar = (aplicar) => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      const a = alvoRef.current;
      alvoRef.current = null;
      setArrasto(null);
      setAlvo(null);
      if (aplicar && a !== null) onMover(id, a);
    };
    const soltar = () => encerrar(true);
    const cancelar = () => encerrar(false);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', cancelar);
  };

  return { arrasto, alvo, raiz, iniciar };
}
