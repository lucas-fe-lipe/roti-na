import { useRef, useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import GraficoMedidas from './GraficoMedidas';
import { MEDIDAS, IMC_FAIXAS, nivelIMC, faixaDoIMC, serieDaMedida, ultimoValor, medidaPorId } from '../utils/medidas';

export const fmtM = (n, casas = 1) => (n === null || n === undefined || !Number.isFinite(n) ? '–' : n.toFixed(casas).replace('.', ','));

// Bolinha do IMC: amarela (fora do normal) ou vermelha (muito ruim); nada se estiver normal
export function PontoIMC({ imc }) {
  const n = nivelIMC(imc);
  if (n !== 'amarelo' && n !== 'vermelho') return null;
  return <span role="img" aria-label={n === 'vermelho' ? 'IMC muito fora do normal' : 'IMC fora do normal'} className={`inline-block w-2.5 h-2.5 rounded-full align-middle ${n === 'vermelho' ? 'bg-red-500' : 'bg-yellow-400'}`} />;
}

// Texto do valor de uma medida: "180 cm", "22,5% estimada", "24,1"
export function textoMedida(enr, id) {
  const m = medidaPorId(id);
  const u = ultimoValor(enr, id);
  if (!m || !u) return { valor: '–', estimada: false };
  const un = m.unidade === '%' ? '%' : m.unidade ? ` ${m.unidade}` : '';
  return { valor: `${fmtM(u.valor, m.casas)}${un}`, estimada: u.estimada, bruto: u.valor };
}

function Camada({ rotulo, onClose, z = 'z-[45]', largura = 'max-w-md', children }) {
  useVoltar(true, onClose);
  return (
    <div className={`fixed inset-0 bg-black/80 flex items-center justify-center ${z} p-3`} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={rotulo} className={`bg-zinc-900 text-zinc-100 rounded-xl w-full ${largura} p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto flex flex-col gap-3`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{rotulo}</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// Evolução de uma medida
export function PopupGraficoMedida({ enr, id, onClose }) {
  const m = medidaPorId(id);
  const s = serieDaMedida(enr, id, 0);
  const u = ultimoValor(enr, id);
  return (
    <Camada rotulo={m?.rotulo || 'Medida'} onClose={onClose} z="z-[48]">
      {u && <div className="text-sm text-zinc-300">Atual: <span className="font-bold text-white">{textoMedida(enr, id).valor}</span>{u.estimada && <span className="text-zinc-500"> · estimada</span>}</div>}
      <GraficoMedidas series={[s]} rotuloAria={`Evolução: ${m?.rotulo}`} />
    </Camada>
  );
}

// O que cada faixa do IMC significa + evolução do IMC
export function PopupIMC({ enr, onClose }) {
  const atual = ultimoValor(enr, 'imc')?.valor;
  const faixaAtual = faixaDoIMC(atual);
  const lim = (f, i) => { const ini = i === 0 ? null : IMC_FAIXAS[i - 1].ate; if (ini === null) return `abaixo de ${fmtM(f.ate)}`; return f.ate === Infinity ? `${fmtM(ini)} ou mais` : `${fmtM(ini)} a ${fmtM(f.ate - 0.1)}`; };
  const cor = { vermelho: 'text-red-400', amarelo: 'text-yellow-400', normal: 'text-zinc-100' };
  return (
    <Camada rotulo="Índice de Massa Corporal (IMC)" onClose={onClose} z="z-[48]">
      <p className="text-xs text-zinc-400">O IMC é o peso (kg) dividido pela altura (m) ao quadrado. É só uma referência: não separa músculo de gordura.</p>
      <ul className="flex flex-col gap-1">
        {IMC_FAIXAS.map((f, i) => (
          <li key={f.rotulo} className={`rounded-lg px-2.5 py-1.5 border ${faixaAtual === f ? 'border-zinc-500 bg-zinc-800' : 'border-zinc-800'}`}>
            <div className={`text-sm font-bold ${cor[f.nivel]}`}>{f.rotulo} <span className="font-normal text-xs opacity-80">· {lim(f, i)}</span>{faixaAtual === f && <span className="text-[10px] text-zinc-400 font-normal"> · você está aqui</span>}</div>
            <div className={`text-[11px] ${f.nivel === 'normal' ? 'text-zinc-400' : cor[f.nivel] + ' opacity-80'}`}>{f.texto}</div>
          </li>
        ))}
      </ul>
      <div className="text-[11px] text-zinc-500">Vermelho: faixas mais extremas · Amarelo: atenção · Sem cor: normal.</div>
      <GraficoMedidas series={[serieDaMedida(enr, 'imc', 0)]} rotuloAria="Evolução do IMC" />
    </Camada>
  );
}

// Escolha das medidas mostradas no bloco da página Treinos
export function PopupMedidasExibidas({ selecionadas, onSalvar, onClose }) {
  const [sel, setSel] = useState(selecionadas);
  const alternar = (id) => setSel((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const grupos = [['Principais', MEDIDAS.filter((m) => m.grupo === 'base')], ['Em centímetros', MEDIDAS.filter((m) => m.grupo === 'cm')]];
  return (
    <Camada rotulo="Medidas exibidas no bloco" onClose={onClose} z="z-[48]">
      <p className="text-[11px] text-zinc-500">Marque o que aparece no bloco da página Treinos. Com muitas medidas, o bloco vira um carrossel (arraste para o lado).</p>
      {grupos.map(([titulo, lista]) => (
        <div key={titulo} className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-wide text-zinc-500">{titulo}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {lista.map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-xs bg-zinc-950/60 border border-zinc-800 rounded-lg px-2.5 py-1.5 cursor-pointer">
                <input type="checkbox" checked={sel.includes(m.id)} onChange={() => alternar(m.id)} className="accent-zinc-100" />
                <span className="text-zinc-200">{m.rotulo}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
        <button onClick={() => setSel(['altura', 'peso', 'imc'])} className="mr-auto text-xs text-zinc-400 hover:text-white">Restaurar padrão</button>
        <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Cancelar</button>
        <button onClick={() => { onSalvar(sel); onClose(); }} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold">Salvar</button>
      </div>
    </Camada>
  );
}

// Dois gráficos lado a lado (arraste ou use os pontinhos)
export function CarrosselGraficos({ paginas }) {
  const ref = useRef(null);
  const [aba, setAba] = useState(0);
  const ir = (i) => { setAba(i); const el = ref.current; if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' }); };
  const aoRolar = (e) => { const el = e.currentTarget; setAba(Math.round(el.scrollLeft / Math.max(1, el.clientWidth))); };
  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3">
      <div className="flex justify-center gap-4 mb-2">
        {paginas.map((p, i) => <button key={p.titulo} type="button" onClick={() => ir(i)} aria-pressed={aba === i} className={`text-[11px] ${aba === i ? 'text-white font-bold' : 'text-zinc-500'}`}>{aba === i ? '● ' : '○ '}{p.titulo}</button>)}
      </div>
      <div ref={ref} onScroll={aoRolar} className="flex overflow-x-auto snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
        {paginas.map((p) => <div key={p.titulo} className="snap-center shrink-0 w-full px-0.5">{p.conteudo}</div>)}
      </div>
    </div>
  );
}
