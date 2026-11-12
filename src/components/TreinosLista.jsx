import { useState, useMemo } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { salvarDoc, apagarDoc } from '../services/db';
import { notificar } from '../utils/toast';
import useVoltar from '../hooks/useVoltar';
import ConfirmModal from './ConfirmModal';
import AvatarMuscular from './AvatarMuscular';
import { EditorSessao, HistoricoTreino } from './SessoesTreino';
import { hojeLocalStr } from '../utils/date';
import { sessaoInicial, sessaoParaForm, historicoDoTreino } from '../utils/sessoes';
import { EXERCICIOS, CATEGORIAS, MUSCULOS } from '../data/exercicios';
import { novoItem, validarTreino, resumoTreino, intensidadesDoTreino, musculosMaisTrabalhados, moverItem, ordenarTreinos } from '../utils/treinoModelo';

const achar = (id) => EXERCICIOS.find((e) => e.id === id);
const campo = 'bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1.5 text-xs text-white text-center';

// ---------- editor: nome + exercícios (séries, repetições, carga) + avatar ao vivo ----------
function EditorTreino({ inicial, config, onClose, onSalvar }) {
  useVoltar(true, onClose);
  const [nome, setNome] = useState(inicial.nome || '');
  const [itens, setItens] = useState(inicial.itens || []);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [escolhendo, setEscolhendo] = useState(!(inicial.itens || []).length);
  const [busca, setBusca] = useState('');
  const [cat, setCat] = useState(null);
  const { sexo, cor, modo } = config.treino;

  const intensidades = useMemo(() => intensidadesDoTreino({ itens }, achar, modo), [itens, modo]);
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return EXERCICIOS.filter((e) => (!cat || e.cat === cat) && (!q || e.nome.toLowerCase().includes(q)));
  }, [busca, cat]);

  const mudar = (id, f, v) => setItens((l) => l.map((i) => (i.id === id ? { ...i, [f]: v } : i)));

  const salvar = async () => {
    const r = validarTreino({ nome, itens }, (id) => !!achar(id));
    if (!r.ok) return setErro(r.erro);
    setErro('');
    setSalvando(true);
    await onSalvar({ ...r.treino, id: inicial.id, criadoEm: inicial.criadoEm });
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Treino" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-lg p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{inicial.id ? 'Editar treino' : 'Novo treino'}</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <label className="flex flex-col text-[11px] text-zinc-400">Nome do treino
          <input type="text" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Treino A – Peito e tríceps" className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
        </label>

        {itens.length > 0 && <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidades} className="max-w-xs mx-auto" />}

        <div className="flex flex-col gap-1.5">
          {itens.length > 0 && (
            <div className="grid grid-cols-[1fr_2.6rem_3.4rem_3.4rem_4.2rem] gap-1 text-[10px] text-zinc-500 px-1">
              <span>Exercício</span><span className="text-center">Séries</span><span className="text-center">Reps</span><span className="text-center">Kg</span><span />
            </div>
          )}
          {itens.map((it, i) => {
            const ex = achar(it.exercicioId);
            return (
              <div key={it.id} className="grid grid-cols-[1fr_2.6rem_3.4rem_3.4rem_4.2rem] gap-1 items-center bg-zinc-950/50 border border-zinc-800 rounded-lg p-1">
                <span className="text-xs text-zinc-100 truncate px-1" title={ex?.nome}>{ex ? ex.nome : 'Exercício removido'}</span>
                <input aria-label={`Séries de ${ex?.nome || ''}`} inputMode="numeric" value={it.series} onChange={(e) => mudar(it.id, 'series', e.target.value)} className={campo} />
                <input aria-label={`Repetições de ${ex?.nome || ''}`} value={it.reps} onChange={(e) => mudar(it.id, 'reps', e.target.value)} className={campo} />
                <input aria-label={`Carga de ${ex?.nome || ''} em kg`} inputMode="decimal" value={it.carga ?? ''} onChange={(e) => mudar(it.id, 'carga', e.target.value)} placeholder="–" className={campo} />
                <div className="flex justify-end">
                  <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => setItens((l) => moverItem(l, it.id, -1))} className="w-5 h-6 text-zinc-400 hover:text-white disabled:opacity-25">▲</button>
                  <button type="button" aria-label="Descer" disabled={i === itens.length - 1} onClick={() => setItens((l) => moverItem(l, it.id, 1))} className="w-5 h-6 text-zinc-400 hover:text-white disabled:opacity-25">▼</button>
                  <button type="button" aria-label={`Remover ${ex?.nome || 'exercício'}`} onClick={() => setItens((l) => l.filter((x) => x.id !== it.id))} className="w-5 h-6 text-red-500 hover:text-red-400 font-bold">×</button>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" onClick={() => setEscolhendo((v) => !v)} aria-expanded={escolhendo} className="text-xs font-bold text-zinc-300 hover:text-white">
          {escolhendo ? '▼︎' : '▶︎'} Adicionar exercício
        </button>
        {escolhendo && (
          <div className="flex flex-col gap-2 border border-zinc-800 rounded-lg p-2">
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício…" aria-label="Buscar exercício" className="bg-zinc-950 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white" />
            <div className="flex flex-wrap gap-1">
              {[null, ...CATEGORIAS].map((c) => (
                <button key={c || 'todos'} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`text-[11px] px-2 py-0.5 rounded-full border ${cat === c ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-bold' : 'border-zinc-700 text-zinc-400 hover:text-zinc-100'}`}>{c || 'Todos'}</button>
              ))}
            </div>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
              {lista.length === 0 && <span className="text-xs text-zinc-500 py-1">Nenhum exercício encontrado.</span>}
              {lista.map((e) => (
                <button key={e.id} type="button" onClick={() => setItens((l) => [...l, novoItem(e.id)])} className="flex items-center justify-between text-left text-xs px-2 py-1.5 rounded bg-zinc-800/60 hover:bg-zinc-800 text-zinc-100">
                  <span>{e.nome}</span><span className="text-zinc-500 text-[11px]">+ {e.cat}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold disabled:opacity-60">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ---------- detalhe: avatar grande, músculos mais trabalhados e exercícios ----------
function DetalheTreino({ treino, sessoes, config, atualizarConfig, onClose, onEditar, onExcluir, onRegistrar, onEditarSessao, onExcluirSessao }) {
  useVoltar(true, onClose);
  const { sexo, cor, modo } = config.treino;
  const intensidades = intensidadesDoTreino(treino, achar, modo);
  const top = musculosMaisTrabalhados(intensidades, 5);
  const { exercicios, series } = resumoTreino(treino);
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={treino.nome} className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold break-words">{treino.nome}</h2>
            <div className="text-xs text-zinc-500">{exercicios} exercícios · {series} séries</div>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidades} />

        <div className="flex flex-col gap-1">
          <div className="flex rounded border border-zinc-700 overflow-hidden self-start" role="group" aria-label="Como calcular a cor">
            {[['absoluto', 'Pelo volume'], ['relativo', 'Relativo ao treino']].map(([v, r]) => (
              <button key={v} onClick={() => atualizarConfig({ treino: { modo: v } })} aria-pressed={modo === v} className={`text-[11px] px-2.5 py-1 ${modo === v ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>{r}</button>
            ))}
          </div>
          <p className="text-[11px] text-zinc-500">{modo === 'absoluto' ? 'A cor depende das séries: cerca de 10 séries em um músculo deixam ele na cor cheia; treino leve fica mais apagado.' : 'O músculo mais exigido do treino fica na cor cheia e os demais são proporcionais a ele.'}</p>
        </div>

        {top.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {top.map(([g, v]) => (
              <span key={g} className="text-[11px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-300">{MUSCULOS[g] || g} <span className="text-zinc-500">· {Math.round(v * 100)}%</span></span>
            ))}
          </div>
        )}

        <ol className="flex flex-col gap-1">
          {treino.itens.map((it, i) => {
            const ex = achar(it.exercicioId);
            return (
              <li key={it.id} className="flex items-center justify-between gap-2 bg-zinc-950/50 border border-zinc-800 rounded-lg px-2.5 py-1.5">
                <span className="text-xs text-zinc-100 truncate"><span className="text-zinc-500 mr-1.5">{i + 1}.</span>{ex ? ex.nome : 'Exercício removido'}</span>
                <span className="text-xs text-zinc-300 shrink-0">{it.series} × {it.reps}{it.carga ? ` · ${String(it.carga).replace('.', ',')} kg` : ''}</span>
              </li>
            );
          })}
        </ol>

        <button onClick={onRegistrar} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors">Registrar sessão</button>

        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">Histórico</h3>
          <HistoricoTreino treino={treino} sessoes={sessoes} config={config} onEditar={onEditarSessao} onExcluir={onExcluirSessao} />
        </div>

        <div className="flex justify-between gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onExcluir} className="px-3 py-1.5 text-red-500 hover:text-red-400 text-sm">Excluir</button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Fechar</button>
            <button onClick={onEditar} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold">Editar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- bloco principal ----------
export default function TreinosLista({ user, treinos, setTreinos, sessoes = [], setSessoes = () => {}, config, atualizarConfig }) {
  const [editor, setEditor] = useState(null);
  const [detalheId, setDetalheId] = useState(null);
  const [excluir, setExcluir] = useState(null);
  const [editorSessao, setEditorSessao] = useState(null);
  const [excluirSessao, setExcluirSessao] = useState(null);
  const ordenados = useMemo(() => ordenarTreinos(treinos), [treinos]);
  const detalhe = treinos.find((t) => t.id === detalheId) || null;
  const { sexo, cor, modo } = config.treino;

  const persistirLocal = (lista) => { setTreinos(lista); try { localStorage.setItem('local_treinos', JSON.stringify(lista)); } catch { /* sem armazenamento */ } };

  const salvar = async (t) => {
    const id = t.id || `${Date.now()}`;
    const completo = { id, nome: t.nome, itens: t.itens, criadoEm: t.criadoEm || new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    let ok = true;
    if (user) ok = await salvarDoc(doc(db, 'users', user.uid, 'treinos', id), completo);
    else persistirLocal([...treinos.filter((x) => x.id !== id), completo]);
    if (ok) { notificar('Treino salvo.', 'sucesso'); setEditor(null); setDetalheId(null); }
  };

  const persistirLocalSessoes = (lista) => { setSessoes(lista); try { localStorage.setItem('local_sessoes', JSON.stringify(lista)); } catch { /* sem armazenamento */ } };

  const salvarSessao = async (x) => {
    const id = x.id || `${Date.now()}`;
    const completa = { ...x, id, criadoEm: x.criadoEm || new Date().toISOString() };
    Object.keys(completa).forEach((k) => completa[k] === undefined && delete completa[k]);
    let ok = true;
    if (user) ok = await salvarDoc(doc(db, 'users', user.uid, 'sessoes', id), completa);
    else persistirLocalSessoes([...sessoes.filter((y) => y.id !== id), completa]);
    if (ok) { notificar('Sessão salva.', 'sucesso'); setEditorSessao(null); }
  };

  const apagarSessao = async (x) => {
    let ok = true;
    if (user) ok = await apagarDoc(doc(db, 'users', user.uid, 'sessoes', x.id));
    else persistirLocalSessoes(sessoes.filter((y) => y.id !== x.id));
    if (ok) notificar('Sessão excluída.', 'info', { rotulo: 'Desfazer', fn: () => salvarSessao(x) });
  };

  const registrar = (t) => setEditorSessao(sessaoInicial(t, historicoDoTreino(sessoes, t.id)[0], hojeLocalStr()));

  const apagar = async (t) => {
    let ok = true;
    if (user) ok = await apagarDoc(doc(db, 'users', user.uid, 'treinos', t.id));
    else persistirLocal(treinos.filter((x) => x.id !== t.id));
    if (ok) { setDetalheId(null); notificar('Treino excluído.', 'info', { rotulo: 'Desfazer', fn: () => salvar(t) }); }
  };

  return (
    <div className="mt-2 w-full px-2 sm:px-0 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-zinc-100">Meus treinos</h2>
        <button onClick={() => setEditor({ nome: '', itens: [] })} className="text-xs font-bold px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 transition-colors">+ Treino</button>
      </div>

      {ordenados.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-300 mb-1">Nenhum treino ainda.</p>
          <p className="text-xs text-zinc-500 mb-3">Monte um treino com exercícios da biblioteca e veja no avatar quais músculos ele trabalha.</p>
          <button onClick={() => setEditor({ nome: '', itens: [] })} className="text-sm font-bold px-4 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300">Criar o primeiro treino</button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ordenados.map((t) => {
            const { exercicios, series } = resumoTreino(t);
            return (
              <li key={t.id}>
                <button onClick={() => setDetalheId(t.id)} className="w-full flex items-center gap-3 text-left bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-2.5 transition-colors">
                  <div className="w-24 shrink-0"><AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidadesDoTreino(t, achar, modo)} /></div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-zinc-100 break-words">{t.nome}</div>
                    <div className="text-xs text-zinc-500">{exercicios} exercícios · {series} séries</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {detalhe && !editor && (
        <DetalheTreino treino={detalhe} sessoes={historicoDoTreino(sessoes, detalhe.id)} config={config} atualizarConfig={atualizarConfig} onClose={() => setDetalheId(null)}
          onEditar={() => setEditor(detalhe)} onExcluir={() => setExcluir(detalhe)}
          onRegistrar={() => registrar(detalhe)} onEditarSessao={(x) => setEditorSessao(sessaoParaForm(x))} onExcluirSessao={(x) => setExcluirSessao(x)} />
      )}
      {editorSessao && <EditorSessao inicial={editorSessao} config={config} onClose={() => setEditorSessao(null)} onSalvar={salvarSessao} />}
      {editor && <EditorTreino inicial={editor} config={config} onClose={() => setEditor(null)} onSalvar={salvar} />}
      <ConfirmModal aberto={!!excluirSessao} titulo="Excluir sessão" mensagem={excluirSessao ? `Excluir a sessão de ${excluirSessao.data.split('-').reverse().join('/')}?` : ''}
        onCancelar={() => setExcluirSessao(null)} onConfirmar={() => { const x = excluirSessao; setExcluirSessao(null); apagarSessao(x); }} />
      <ConfirmModal aberto={!!excluir} titulo="Excluir treino" mensagem={excluir ? `Excluir o treino "${excluir.nome}"?` : ''}
        onCancelar={() => setExcluir(null)} onConfirmar={() => { const t = excluir; setExcluir(null); apagar(t); }} />
    </div>
  );
}
