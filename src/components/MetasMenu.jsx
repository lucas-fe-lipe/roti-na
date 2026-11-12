import { useState, useRef } from 'react';
import useVoltar from '../hooks/useVoltar';
import { distribuirMetas } from '../utils/metasLayout';

const ICONE_ARRASTAR = '⋮⋮';

// Menu das metas diárias: adicionar, editar (lista com ordem e linha), linhas (1 ou 2) e fechar.
export default function MetasMenu({ isOpen, onClose, metas, linhas, onLinhas, onAdicionar, onEditar, onValor, onMover }) {
  useVoltar(isOpen, onClose);
  const [listaAberta, setListaAberta] = useState(false);
  const [arrasto, setArrasto] = useState(null); // id da meta arrastada
  const [alvo, setAlvo] = useState(null); // { linha, indice }
  const alvoRef = useRef(null);
  const raiz = useRef(null);
  const [valores, setValores] = useState({}); // texto digitado em "meta diária", por id

  if (!isOpen) return null;

  const grupos = distribuirMetas(metas, linhas);

  const calcularAlvo = (id, y) => {
    const grades = Array.from(raiz.current?.querySelectorAll('[data-grupo]') || []);
    if (grades.length === 0) return null;
    let melhor = grades[0];
    let menor = Infinity;
    grades.forEach((g) => {
      const r = g.getBoundingClientRect();
      const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < menor) { menor = d; melhor = g; }
    });
    const itens = Array.from(melhor.querySelectorAll('[data-meta]')).filter((el) => el.dataset.meta !== id);
    const indice = itens.filter((el) => { const r = el.getBoundingClientRect(); return y > r.top + r.height / 2; }).length;
    return { linha: Number(melhor.dataset.grupo), indice };
  };

  const iniciar = (e, id) => {
    e.preventDefault();
    setArrasto(id);
    const mover = (ev) => { const a = calcularAlvo(id, ev.clientY); alvoRef.current = a; setAlvo(a); };
    const encerrar = (aplicar) => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      const a = alvoRef.current;
      alvoRef.current = null;
      setArrasto(null);
      setAlvo(null);
      if (aplicar && a) onMover(id, a.linha, a.indice);
    };
    const soltar = () => encerrar(true);
    const cancelar = () => encerrar(false);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', cancelar);
  };

  const Traco = () => <div className="h-0.5 bg-blue-500 rounded -my-px" aria-hidden="true" />;

  const confirmarValor = (m) => {
    const t = valores[m.id];
    if (t === undefined) return;
    const n = Number(String(t).replace(',', '.'));
    setValores((v) => { const { [m.id]: _descartado, ...resto } = v; return resto; }); // eslint-disable-line no-unused-vars
    if (Number.isFinite(n) && n > 0 && n !== Number(m.meta)) onValor(m, n);
  };

  // chamado como função (não como componente) para a alça não ser recriada durante o arrasto com o dedo
  const itemMeta = (m) => (
    <div key={m.id} data-meta={m.id} className={`flex items-center gap-1.5 bg-zinc-950/60 border border-zinc-800 rounded-lg px-1.5 py-1.5 ${arrasto === m.id ? 'opacity-40' : ''}`}>
      <button type="button" onPointerDown={(e) => iniciar(e, m.id)} aria-label={`Arrastar para mudar a ordem: ${m.titulo}`} title="Arraste para mudar a ordem" style={{ touchAction: 'none' }} className="px-1.5 py-1 text-zinc-500 hover:text-zinc-200 cursor-grab active:cursor-grabbing select-none text-sm font-bold tracking-tighter shrink-0">{ICONE_ARRASTAR}</button>
      <span className="flex-1 min-w-0 text-xs font-medium text-zinc-100 truncate">{m.titulo}</span>
      <input type="text" inputMode="decimal" aria-label={`Meta diária de ${m.titulo}`} value={valores[m.id] !== undefined ? valores[m.id] : String(m.meta)}
        onChange={(e) => setValores((v) => ({ ...v, [m.id]: e.target.value }))} onBlur={() => confirmarValor(m)} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="w-14 shrink-0 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1 text-xs text-center text-white" />
      <button type="button" onClick={() => onEditar(m)} className="shrink-0 text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded">Editar</button>
    </div>
  );

  const grupo = (lista, linha, titulo) => {
    const indice = arrasto && alvo && alvo.linha === linha ? alvo.indice : null;
    const saida = [];
    let n = 0;
    lista.forEach((m) => {
      if (indice !== null && n === indice && m.id !== arrasto) saida.push(<Traco key={`t-${m.id}`} />);
      saida.push(itemMeta(m));
      if (m.id !== arrasto) n += 1;
    });
    if (indice !== null && indice >= n) saida.push(<Traco key="t-fim" />);
    return (
      <div key={linha} className="flex flex-col gap-1.5">
        {titulo && <div className="text-[11px] uppercase tracking-wide text-zinc-500 mt-1">{titulo}</div>}
        <div data-grupo={linha} className="flex flex-col gap-1.5 min-h-8 rounded">
          {saida}
          {lista.length === 0 && indice === null && <div className="text-[11px] text-zinc-600 italic px-2 py-1.5 border border-dashed border-zinc-800 rounded">Arraste uma meta para cá.</div>}
          {lista.length === 0 && indice !== null && <Traco />}
        </div>
      </div>
    );
  };

  const opcao = 'w-full text-left bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-3 text-sm font-medium text-zinc-100 transition-colors';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Metas diárias" ref={raiz} onClick={(e) => e.stopPropagation()} className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-4 shadow-2xl border border-zinc-800 max-h-[90vh] overflow-y-auto flex flex-col gap-2.5">
        <h2 className="text-lg font-bold">Metas diárias</h2>

        <button onClick={onAdicionar} className={opcao}>+ Adicionar Nova Meta Diária</button>

        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg">
          <button onClick={() => setListaAberta((a) => !a)} aria-expanded={listaAberta} className="w-full text-left px-3 py-3 text-sm font-medium text-zinc-100 flex items-center gap-2">
            <span className="text-zinc-400 text-xs">{listaAberta ? '▼︎' : '▶︎'}</span> Editar
            <span className="text-[11px] text-zinc-500 font-normal">({metas.length})</span>
          </button>
          {listaAberta && (
            <div className="px-2.5 pb-2.5 flex flex-col gap-1.5">
              {metas.length === 0 && <p className="text-xs text-zinc-500 italic px-1">Nenhuma meta ainda.</p>}
              {metas.length > 0 && <p className="text-[11px] text-zinc-500 px-1">Arraste pelo {ICONE_ARRASTAR} para mudar a ordem{linhas === 2 ? ' ou a linha' : ''}. O número é a meta diária.</p>}
              {metas.length > 0 && (linhas === 2 ? [grupo(grupos[0], 1, 'Linha 1'), grupo(grupos[1], 2, 'Linha 2')] : [grupo(grupos[0], 1, '')])}
            </div>
          )}
        </div>

        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg px-3 py-3 flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-zinc-100">Linhas</span>
          <div className="flex rounded border border-zinc-600 overflow-hidden" role="group" aria-label="Quantidade de linhas de metas">
            {[1, 2].map((n) => (
              <button key={n} onClick={() => onLinhas(n)} aria-pressed={linhas === n} className={`text-sm px-4 py-1 ${linhas === n ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-300 hover:bg-zinc-700'}`}>{n}</button>
            ))}
          </div>
        </div>

        <button onClick={onClose} className={`${opcao} text-center text-zinc-300`}>Fechar</button>
      </div>
    </div>
  );
}
