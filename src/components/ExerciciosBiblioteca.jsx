import { useState, useMemo } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { salvarDoc } from '../services/db';
import { notificar } from '../utils/toast';
import AvatarMuscular from './AvatarMuscular';
import { EXERCICIOS, CATEGORIAS, MUSCULOS, P, S } from '../data/exercicios';
import { intensidadeDoExercicio, midiaDoLink, linkValido } from '../utils/treino';

const PRESETS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899'];
const rotuloPeso = (w) => (w >= P ? 'principal' : w >= S ? 'auxiliar' : 'leve');

function Midia({ link }) {
  const [falhou, setFalhou] = useState(false);
  const m = midiaDoLink(link);
  if (!m) return null;
  if (!falhou || !m.iframe) {
    return <img src={m.img} alt="Demonstração do exercício" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} className="w-full max-h-72 object-contain rounded-lg bg-black" />;
  }
  return <iframe src={m.iframe} title="Demonstração do exercício" className="w-full h-64 rounded-lg border-0 bg-black" allow="autoplay" />;
}

function EditorMidia({ exercicio, atual }) {
  const [texto, setTexto] = useState(atual || '');
  const salvar = async () => {
    const v = texto.trim();
    if (!linkValido(v)) { notificar('O link precisa começar com https://', 'erro'); return; }
    const ref = doc(db, 'biblioteca', exercicio.id);
    if (!v) {
      try { await deleteDoc(ref); notificar('Link removido.', 'sucesso'); } catch (e) { console.error(e); notificar('Não foi possível remover o link.', 'erro'); }
      return;
    }
    if (await salvarDoc(ref, { midia: v, atualizadoEm: new Date().toISOString() })) notificar('Link salvo.', 'sucesso');
  };
  return (
    <div className="flex flex-col gap-1 border border-dashed border-zinc-700 rounded-lg p-2">
      <label className="text-[11px] text-zinc-400" htmlFor={`midia-${exercicio.id}`}>Administrador: link do GIF (Google Drive público)</label>
      <div className="flex gap-2">
        <input id={`midia-${exercicio.id}`} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="https://drive.google.com/file/d/…/view" className="flex-1 min-w-0 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-500" />
        <button onClick={salvar} className="bg-zinc-100 text-zinc-900 text-xs font-bold px-3 rounded hover:bg-white">Salvar</button>
      </div>
    </div>
  );
}

function Detalhe({ ex, sexo, cor, midia, admin, aoEscolher }) {
  const principais = Object.entries(ex.m).sort((a, b) => b[1] - a[1]);
  const topo = principais[0]?.[0];
  const alternativas = EXERCICIOS.filter((o) => o.id !== ex.id && o.m[topo] >= P).slice(0, 8);
  return (
    <div className="flex flex-col gap-3 pt-2">
      {midia && <Midia link={midia} />}
      <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidadeDoExercicio(ex)} />
      {(ex.eq || ex.uni) && (
        <div className="text-[11px] text-zinc-400">
          <span className="text-zinc-500">Variações (não mudam os músculos): </span>{[...(ex.eq || []), ...(ex.uni ? ['unilateral ou bilateral'] : [])].join(' · ')}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {principais.map(([g, w]) => (
          <span key={g} className="text-[11px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-300">{MUSCULOS[g]} <span className="text-zinc-500">· {rotuloPeso(w)}</span></span>
        ))}
      </div>
      {alternativas.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-zinc-500">Alternativas para {MUSCULOS[topo]?.toLowerCase()}</span>
          <div className="flex flex-wrap gap-1.5">
            {alternativas.map((a) => <button key={a.id} onClick={() => aoEscolher(a.id)} className="text-[11px] px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200">{a.nome}</button>)}
          </div>
        </div>
      )}
      {admin && <EditorMidia key={ex.id + (midia || '')} exercicio={ex} atual={midia} />}
    </div>
  );
}

export default function ExerciciosBiblioteca({ config, atualizarConfig, midias, admin }) {
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState(null);
  const [aberto, setAberto] = useState(null);
  const { sexo, cor } = config.treino;

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return EXERCICIOS.filter((e) => (!cat || e.cat === cat) && (!q || e.nome.toLowerCase().includes(q)));
  }, [busca, cat]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded border border-zinc-700 overflow-hidden" role="group" aria-label="Avatar">
          {[['m', 'Homem'], ['f', 'Mulher']].map(([v, r]) => (
            <button key={v} onClick={() => atualizarConfig({ treino: { sexo: v } })} aria-pressed={sexo === v} className={`text-xs px-3 py-1.5 ${sexo === v ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>{r}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5" role="group" aria-label="Cor dos músculos">
          {PRESETS.map((c) => (
            <button key={c} onClick={() => atualizarConfig({ treino: { cor: c } })} aria-label={`Cor ${c}`} aria-pressed={cor === c} style={{ background: c }} className={`w-5 h-5 rounded-full border-2 ${cor === c ? 'border-white' : 'border-transparent'}`} />
          ))}
          <input type="color" value={cor} onChange={(e) => atualizarConfig({ treino: { cor: e.target.value } })} aria-label="Escolher outra cor" className="w-6 h-6 bg-transparent border-0 p-0 cursor-pointer" />
        </div>
      </div>

      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício…" aria-label="Buscar exercício" className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-500" />
      <div className="flex flex-wrap gap-1.5">
        {[null, ...CATEGORIAS].map((c) => (
          <button key={c || 'todos'} onClick={() => setCat(c)} aria-pressed={cat === c} className={`text-xs px-2.5 py-1 rounded-full border ${cat === c ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-bold' : 'border-zinc-700 text-zinc-400 hover:text-zinc-100'}`}>{c || 'Todos'}</button>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5">
        {lista.length === 0 && <li className="text-xs text-zinc-500 py-2">Nenhum exercício encontrado.</li>}
        {lista.map((e) => {
          const ativo = aberto === e.id;
          return (
            <li key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
              <button onClick={() => setAberto(ativo ? null : e.id)} aria-expanded={ativo} className="w-full flex items-center justify-between text-left gap-2">
                <span className="text-sm text-zinc-100">{e.nome}</span>
                <span className="text-[11px] text-zinc-500 shrink-0">{midias[e.id] ? '▶ GIF · ' : ''}{e.cat}</span>
              </button>
              {ativo && <Detalhe ex={e} sexo={sexo} cor={cor} midia={midias[e.id]} admin={admin} aoEscolher={setAberto} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
