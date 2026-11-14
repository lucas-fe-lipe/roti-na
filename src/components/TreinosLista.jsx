import { useState, useMemo, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { salvarDoc, apagarDoc } from '../services/db';
import { notificar } from '../utils/toast';
import useVoltar from '../hooks/useVoltar';
import ConfirmModal from './ConfirmModal';
import PickerExercicios from './PickerExercicios';
import SeriesPopup from './SeriesPopup';
import AvatarMuscular from './AvatarMuscular';
import IconeTreino, { chaveIcone } from './IconeTreino';
import CampoFaixa from './CampoFaixa';
import { EscolherTipo, EditorTreinoSimples, VinculoAtividade } from './TreinoFormComum';
import { EditorSessao, HistoricoTreino } from './SessoesTreino';
import { hojeLocalStr } from '../utils/date';
import { horariosDoTreino, proximoHorarioDoTreino, rotuloProximo } from '../utils/treinoAtividade';
import { sessaoInicial, sessaoParaForm, historicoDoTreino } from '../utils/sessoes';
import { achar, MUSCULOS, rotuloVariacao } from '../data/exercicios';
import { tipoDe, TIPOS, resumoDoTreino, validarTreinoGeral, faixaParaTexto } from '../utils/treinoTipos';
import { novoItemComSets, textoSeries, intensidadesDoTreino, musculosMaisTrabalhados, moverItem, ordenarTreinos } from '../utils/treinoModelo';

const campo = 'bg-zinc-950 border border-zinc-700 rounded px-1.5 py-1.5 text-xs text-white text-center';

// ---------- editor do treino de força: nome, duração, vínculo, exercícios (séries/reps/peso) e avatar ao vivo ----------
function EditorTreino({ inicial, config, onClose, onSalvar, exCustom, midias, atividades = [], vinculoInicial = '' }) {
  useVoltar(true, onClose);
  const [nome, setNome] = useState(inicial.nome || '');
  const [itens, setItens] = useState(inicial.itens || []);
  const [duracaoTexto, setDuracaoTexto] = useState(faixaParaTexto(inicial.duracao));
  const [vinculo, setVinculo] = useState(vinculoInicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [picker, setPicker] = useState(false);
  const [seriesPara, setSeriesPara] = useState(null); // { exercicio, item? }
  const [remover, setRemover] = useState(null);
  const { sexo, cor, modo } = config.treino;

  const intensidades = useMemo(() => intensidadesDoTreino({ itens }, achar, modo), [itens, modo]);

  const salvar = async () => {
    const r = validarTreinoGeral({ tipo: 'forca', nome, itens, duracaoTexto }, (id) => !!achar(id));
    if (!r.ok) return setErro(r.erro);
    setErro('');
    setSalvando(true);
    await onSalvar({ ...r.treino, id: inicial.id, criadoEm: inicial.criadoEm }, vinculo);
    setSalvando(false);
  };

  const confirmarSeries = ({ sets, variacao, unilateral }) => {
    const extras = { ...(variacao ? { variacao } : {}), ...(unilateral ? { unilateral: true } : {}) };
    if (seriesPara.item) {
      setItens((l) => l.map((i) => {
        if (i.id !== seriesPara.item.id) return i;
        const { variacao: _v, unilateral: _u, ...resto } = i;
        return { ...resto, ...novoItemComSets(i.exercicioId, sets, extras), id: i.id };
      }));
    } else {
      setItens((l) => [...l, novoItemComSets(seriesPara.exercicio.id, sets, extras)]);
      setPicker(false);
    }
    setSeriesPara(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Treino" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-lg p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{inicial.id ? 'Editar treino' : 'Novo treino de força'}</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <label className="flex flex-col text-[11px] text-zinc-400">Nome do treino
          <input type="text" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Treino A – Peito e tríceps" className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
        </label>
        <CampoFaixa rotulo="Duração" sufixo={<span className="text-xs text-zinc-400 shrink-0">min</span>} valor={duracaoTexto} onChange={setDuracaoTexto} placeholder="60" />
        <VinculoAtividade valor={vinculo} onChange={setVinculo} atividades={atividades} treinoId={inicial.id} />

        {itens.length > 0 && <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidades} className="max-w-xs mx-auto" />}

        <ol className="flex flex-col gap-1.5">
          {itens.map((it, i) => {
            const ex = achar(it.exercicioId);
            return (
              <li key={it.id} className="flex items-center gap-1 bg-zinc-950/50 border border-zinc-800 rounded-lg p-1.5">
                <div className="flex flex-col shrink-0">
                  <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => setItens((l) => moverItem(l, it.id, -1))} className="w-6 h-5 text-zinc-400 hover:text-white disabled:opacity-25 text-xs">▲</button>
                  <button type="button" aria-label="Descer" disabled={i === itens.length - 1} onClick={() => setItens((l) => moverItem(l, it.id, 1))} className="w-6 h-5 text-zinc-400 hover:text-white disabled:opacity-25 text-xs">▼</button>
                </div>
                <button type="button" onClick={() => ex && setSeriesPara({ exercicio: ex, item: it })} className="flex-1 min-w-0 text-left" aria-label={`Editar séries de ${ex?.nome || 'exercício'}`}>
                  <span className="block text-xs text-zinc-100 truncate">{ex ? ex.nome : 'Exercício removido'}{(it.variacao || it.unilateral) && <span className="text-zinc-500"> ({rotuloVariacao(it.variacao, it.unilateral)})</span>}</span>
                  <span className="block text-[11px] text-zinc-400 truncate">{textoSeries(it)}</span>
                </button>
                <button type="button" aria-label={`Remover ${ex?.nome || 'exercício'}`} onClick={() => setRemover(it)} className="w-7 h-7 shrink-0 text-red-500 hover:text-red-400 font-bold">×</button>
              </li>
            );
          })}
        </ol>

        <button type="button" onClick={() => setPicker(true)} className="w-full py-2 border border-dashed border-zinc-600 rounded-lg text-sm font-bold text-zinc-200 hover:bg-zinc-800">+ Adicionar exercício</button>

        {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold disabled:opacity-60">Salvar</button>
        </div>
      </div>
      {picker && <PickerExercicios config={config} midias={midias} exCustom={exCustom} onClose={() => setPicker(false)} onEscolher={(e) => setSeriesPara({ exercicio: e })} />}
      {seriesPara && <SeriesPopup exercicio={seriesPara.exercicio} item={seriesPara.item} rotuloBotao={seriesPara.item ? 'Salvar' : 'Adicionar'} onClose={() => setSeriesPara(null)} onSalvar={confirmarSeries} />}
      <ConfirmModal aberto={!!remover} titulo="Remover exercício" mensagem={remover ? `Remover "${achar(remover.exercicioId)?.nome || 'este exercício'}" do treino?` : ''}
        onCancelar={() => setRemover(null)} onConfirmar={() => { const r = remover; setRemover(null); setItens((l) => l.filter((x) => x.id !== r.id)); }} />
    </div>
  );
}

function ResumoTreino({ linhas }) {
  return (
    <dl className="grid grid-cols-2 gap-1.5">
      {linhas.map((l) => (
        <div key={l.rotulo} className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-2.5 py-1.5">
          <dt className="text-[10px] uppercase tracking-wide text-zinc-500">{l.rotulo}</dt>
          <dd className="text-sm text-zinc-100">{l.valor}</dd>
        </div>
      ))}
    </dl>
  );
}

// Imagem do cartão ampliada
function ImagemAmpliada({ treino, config, onClose }) {
  useVoltar(true, onClose);
  const { sexo, cor, modo } = config.treino;
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[55] p-4" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-full max-w-xs" onClick={(e) => e.stopPropagation()}>
        <div className="text-sm font-bold text-zinc-100 mb-2 text-center break-words">{treino.nome}</div>
        {tipoDe(treino) === 'forca' ? <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidadesDoTreino(treino, achar, modo)} /> : <IconeTreino chave={chaveIcone(treino)} className="w-48 h-48 mx-auto text-zinc-300" />}
      </div>
    </div>
  );
}

// ---------- detalhe: avatar grande, músculos mais trabalhados e exercícios ----------
function DetalheTreino({ treino, pesoKg, sessoes, atividades, onAgendar, config, atualizarConfig, onClose, onEditar, onExcluir, onRegistrar, onEditarSessao, onExcluirSessao }) {
  useVoltar(true, onClose);
  const { sexo, cor, modo } = config.treino;
  const intensidades = intensidadesDoTreino(treino, achar, modo);
  const top = musculosMaisTrabalhados(intensidades, 5);
  const tipo = tipoDe(treino);
  const forca = tipo === 'forca';
  const horarios = horariosDoTreino(atividades, treino.id);
  const proximo = proximoHorarioDoTreino(atividades, treino.id, new Date());
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={treino.nome} className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold break-words">{treino.nome}</h2>
            <div className="text-xs text-zinc-500">{TIPOS[tipo].nome}</div>
          </div>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {forca ? <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidades} /> : <IconeTreino chave={chaveIcone(treino)} className="w-28 h-28 mx-auto text-zinc-300" />}
        <ResumoTreino linhas={resumoDoTreino(treino, pesoKg)} />

        {forca && (
          <>
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
                <span className="text-xs text-zinc-100 truncate"><span className="text-zinc-500 mr-1.5">{i + 1}.</span>{ex ? ex.nome : 'Exercício removido'}{(it.variacao || it.unilateral) && <span className="text-zinc-500"> ({rotuloVariacao(it.variacao, it.unilateral)})</span>}</span>
                <span className="text-xs text-zinc-300 shrink-0 text-right">{textoSeries(it)}</span>
              </li>
            );
          })}
        </ol>

          </>
        )}

        <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-2.5 py-2 flex items-start justify-between gap-2">
          <div className="min-w-0 text-xs">
            <div className="text-zinc-400 mb-0.5">Na grade horária</div>
            {horarios.length === 0 ? <div className="text-zinc-500">Ainda não está agendado.</div> : (
              <>
                <div className="text-zinc-100">{horarios.map((h) => `${h.dia} ${h.inicio}`).join(' · ')}</div>
                {proximo && <div className="text-zinc-500">Próximo: {rotuloProximo(proximo)}</div>}
              </>
            )}
          </div>
          <button onClick={onAgendar} className="shrink-0 text-xs px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded font-bold">{horarios.length === 0 ? 'Agendar na grade' : 'Agendar outro'}</button>
        </div>

        {forca && (
          <>
        <button onClick={onRegistrar} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors">Registrar sessão</button>

        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wide text-zinc-500">Histórico</h3>
          <HistoricoTreino treino={treino} sessoes={sessoes} config={config} onEditar={onEditarSessao} onExcluir={onExcluirSessao} />
        </div>

          </>
        )}

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
export default function TreinosLista({ user, treinos, setTreinos, sessoes = [], setSessoes = () => {}, atividades = [], onAgendar = () => {}, onVincular = () => {}, pesoKg = null, abrir = null, onAbriu = () => {}, config, atualizarConfig, exCustom, midias = {} }) {
  const [editor, setEditor] = useState(null);
  const [escolhendoTipo, setEscolhendoTipo] = useState(false);
  const [ampliar, setAmpliar] = useState(null);
  const [detalheId, setDetalheId] = useState(null);
  const [excluir, setExcluir] = useState(null);
  const [editorSessao, setEditorSessao] = useState(null);
  const [excluirSessao, setExcluirSessao] = useState(null);
  const ordenados = useMemo(() => ordenarTreinos(treinos), [treinos]);
  const detalhe = treinos.find((t) => t.id === detalheId) || null;
  const { sexo, cor, modo } = config.treino;

  const persistirLocal = (lista) => { setTreinos(lista); try { localStorage.setItem('local_treinos', JSON.stringify(lista)); } catch { /* sem armazenamento */ } };

  const vinculoAtual = (id) => atividades.find((a) => a.treinoId === id)?.id || '';

  // vinculo: '' (nenhum), 'criar' (nova atividade com o mesmo nome) ou o id de uma atividade da grade
  const salvar = async (t, vinculo = '') => {
    const id = t.id || `${Date.now()}`;
    const completo = { ...t, id, criadoEm: t.criadoEm || new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    let ok = true;
    if (user) ok = await salvarDoc(doc(db, 'users', user.uid, 'treinos', id), completo);
    else persistirLocal([...treinos.filter((x) => x.id !== id), completo]);
    if (!ok) return;
    notificar('Treino salvo.', 'sucesso');
    setEditor(null);
    setDetalheId(null);
    const antes = t.id ? vinculoAtual(id) : '';
    if (vinculo === 'criar') { if (!antes) onAgendar(completo); }
    else if (vinculo !== antes) {
      if (antes) onVincular(antes, null);
      if (vinculo) onVincular(vinculo, id);
    }
  };

  const novo = (tipo) => { setEscolhendoTipo(false); setEditor({ tipo, nome: '', itens: [] }); };

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

  // pedido vindo da grade: abre o treino (ou já o registro da sessão)
  useEffect(() => {
    if (!abrir) return;
    const t = treinos.find((x) => x.id === abrir.id);
    if (!t) {
      if (treinos.length > 0) { notificar('Esse treino não existe mais.', 'info'); onAbriu(); }
      return; // ainda carregando
    }
    setDetalheId(t.id);
    if (abrir.registrar) setEditorSessao(sessaoInicial(t, historicoDoTreino(sessoes, t.id)[0], hojeLocalStr()));
    onAbriu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrir, treinos]);

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
        <button onClick={() => setEscolhendoTipo(true)} className="text-xs font-bold px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 transition-colors">+ Adicionar treino</button>
      </div>

      {ordenados.length === 0 ? (
        <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-xl p-6 text-center">
          <p className="text-sm text-zinc-300 mb-1">Nenhum treino ainda.</p>
          <p className="text-xs text-zinc-500 mb-3">Crie treinos de força, cardio ou outros tipos e acompanhe duração e calorias estimadas.</p>
          <button onClick={() => setEscolhendoTipo(true)} className="text-sm font-bold px-4 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300">Criar o primeiro treino</button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ordenados.map((t) => {
            const tipo = tipoDe(t);
            return (
              <li key={t.id} className="flex items-stretch gap-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-2 transition-colors">
                <button onClick={() => setAmpliar(t)} aria-label={`Ampliar imagem de ${t.nome}`} className="w-20 shrink-0 self-center text-zinc-300">
                  {tipo === 'forca' ? <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidadesDoTreino(t, achar, modo)} /> : <IconeTreino chave={chaveIcone(t)} className="w-full h-20" />}
                </button>
                <button onClick={() => setDetalheId(t.id)} className="flex-1 min-w-0 text-left pl-1">
                  <div className="text-sm font-bold text-zinc-100 break-words">{t.nome}</div>
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-0.5">{TIPOS[tipo].nome}</div>
                  <ul className="text-xs text-zinc-400 space-y-0.5">
                    {resumoDoTreino(t, pesoKg).map((l) => <li key={l.rotulo}><span className="text-zinc-500">{l.rotulo}:</span> {l.valor}</li>)}
                  </ul>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {detalhe && !editor && (
        <DetalheTreino treino={detalhe} pesoKg={pesoKg} sessoes={historicoDoTreino(sessoes, detalhe.id)} atividades={atividades} onAgendar={() => onAgendar(detalhe)} config={config} atualizarConfig={atualizarConfig} onClose={() => setDetalheId(null)}
          onEditar={() => setEditor(detalhe)} onExcluir={() => setExcluir(detalhe)}
          onRegistrar={() => registrar(detalhe)} onEditarSessao={(x) => setEditorSessao(sessaoParaForm(x))} onExcluirSessao={(x) => setExcluirSessao(x)} />
      )}
      {editorSessao && <EditorSessao inicial={editorSessao} config={config} onClose={() => setEditorSessao(null)} onSalvar={salvarSessao} />}
      {escolhendoTipo && <EscolherTipo onEscolher={novo} onClose={() => setEscolhendoTipo(false)} />}
      {ampliar && <ImagemAmpliada treino={ampliar} config={config} onClose={() => setAmpliar(null)} />}
      {editor && tipoDe(editor) === 'forca' && <EditorTreino inicial={editor} config={config} onClose={() => setEditor(null)} onSalvar={salvar} exCustom={exCustom} midias={midias} atividades={atividades} vinculoInicial={editor.id ? vinculoAtual(editor.id) : ''} />}
      {editor && tipoDe(editor) !== 'forca' && <EditorTreinoSimples tipo={tipoDe(editor)} inicial={editor} atividades={atividades} vinculoInicial={editor.id ? vinculoAtual(editor.id) : ''} onClose={() => setEditor(null)} onSalvar={salvar} />}
      <ConfirmModal aberto={!!excluirSessao} titulo="Excluir sessão" mensagem={excluirSessao ? `Excluir a sessão de ${excluirSessao.data.split('-').reverse().join('/')}?` : ''}
        onCancelar={() => setExcluirSessao(null)} onConfirmar={() => { const x = excluirSessao; setExcluirSessao(null); apagarSessao(x); }} />
      <ConfirmModal aberto={!!excluir} titulo="Excluir treino" mensagem={excluir ? `Excluir o treino "${excluir.nome}"?` : ''}
        onCancelar={() => setExcluir(null)} onConfirmar={() => { const t = excluir; setExcluir(null); apagar(t); }} />
    </div>
  );
}
