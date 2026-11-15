import { useState, useMemo, useRef, useEffect } from 'react';
import useVoltar from '../hooks/useVoltar';
import { doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { salvarDoc, apagarDoc } from '../services/db';
import { hojeLocalStr } from '../utils/date';
import { notificar } from '../utils/toast';
import ConfirmModal from './ConfirmModal';
import GraficoMedidas from './GraficoMedidas';
import { CarrosselGraficos, PopupGraficoMedida, PopupIMC, PopupMedidasExibidas, PontoIMC, textoMedida } from './MedidasUI';
import { EXTRAS, enriquecer, validarMedida, numero, estimarGordura, estimarMusculo, GRAFICO1_IDS, GRAFICO2_IDS, medidaPorId, serieDaMedida, prefsMedidas } from '../utils/medidas';

const fmt = (n, casas = 1) => (n === null || n === undefined || !Number.isFinite(n) ? '–' : n.toFixed(casas).replace('.', ','));
const fmtData = (d) => { const [y, m, dia] = d.split('-'); return `${dia}/${m}/${y}`; };

const vazio = (altura = '') => ({ data: hojeLocalStr(), peso: '', altura: altura === null ? '' : String(altura), abdomen: '', gordura: '', musculo: '', extras: {}, obs: '' });

// ---------- formulário ----------
function ModalMedida({ inicial, sexo, onClose, onSalvar }) {
  useVoltar(true, onClose);
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState('');
  const [mais, setMais] = useState(Object.keys(inicial.extras || {}).length > 0 || !!inicial.gordura || !!inicial.musculo);
  // estimativas ao vivo (usam o valor digitado em "Mais medidas" quando existir)
  const gEst = estimarGordura(sexo, f.altura, f.abdomen);
  const gUsada = numero(f.gordura) > 0 ? numero(f.gordura) : gEst;
  const mEst = estimarMusculo(sexo, f.peso, gUsada);
  const fmtN = (n, c = 1) => (n === null || !Number.isFinite(n) ? '–' : n.toFixed(c).replace('.', ','));
  const [salvando, setSalvando] = useState(false);
  const campo = (id, rotulo, un, passo = '0.1') => (
    <label className="flex flex-col text-[11px] text-zinc-400">
      {rotulo} {un && <span className="text-zinc-600">({un})</span>}
      <input type="text" inputMode="decimal" value={f[id] ?? ''} onChange={(e) => setF({ ...f, [id]: e.target.value })} step={passo}
        className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
    </label>
  );

  const salvar = async () => {
    const r = validarMedida(f, hojeLocalStr());
    if (!r.ok) return setErro(r.erro);
    setErro('');
    setSalvando(true);
    await onSalvar({ ...r.medida, id: inicial.id });
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Medidas" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-4 shadow-2xl border border-zinc-800 max-h-[90vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{inicial.id ? 'Editar medidas' : 'Novas medidas'}</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <label className="flex flex-col text-[11px] text-zinc-400">
          Data
          <input type="date" value={f.data} max={hojeLocalStr()} onChange={(e) => setF({ ...f, data: e.target.value })} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white [color-scheme:dark]" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          {campo('peso', 'Peso', 'kg')}
          {campo('altura', 'Altura', 'cm')}
          {campo('abdomen', 'Barriga', 'cm')}
        </div>
        <p className="text-[11px] text-zinc-500">Barriga: meça na altura do umbigo, sem apertar. Com só esses três dados o app calcula o IMC e estima gordura e músculo. A altura só precisa ser informada uma vez.</p>
        <div className="flex items-center justify-between gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-2">
          <div className="text-xs text-zinc-300">
            <div>Gordura {numero(f.gordura) > 0 ? '' : 'estimada '}<span className="font-bold text-white">{fmtN(gUsada)}%</span></div>
            <div>Músculo {numero(f.musculo) > 0 ? '' : 'estimado '}<span className="font-bold text-white">{fmtN(numero(f.musculo) > 0 ? numero(f.musculo) : mEst)} kg</span></div>
          </div>
        </div>

        <button type="button" onClick={() => setMais((m) => !m)} aria-expanded={mais} className="text-xs font-bold text-zinc-300 hover:text-white">
          {mais ? '▼︎' : '▶︎'} Mais medidas
        </button>
        {mais && (
          <>
          <p className="text-[11px] text-zinc-500">Se você tem a gordura e o músculo da sua balança ou avaliação física, digite aqui: eles passam a valer no lugar da estimativa.</p>
          <div className="grid grid-cols-2 gap-2">
            {campo('gordura', '% de gordura', '%')}
            {campo('musculo', 'Massa muscular', 'kg')}
          </div>
          <div className="text-[11px] text-zinc-400">Outras medidas (cm)</div>
          <div className="grid grid-cols-2 gap-2">
            {EXTRAS.map((e) => (
              <label key={e.id} className="flex flex-col text-[11px] text-zinc-400">
                {e.rotulo}
                <input type="text" inputMode="decimal" value={f.extras?.[e.id] ?? ''} onChange={(ev) => setF({ ...f, extras: { ...f.extras, [e.id]: ev.target.value } })} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
              </label>
            ))}
          </div>
          </>
        )}
        <label className="flex flex-col text-[11px] text-zinc-400">
          Observação (opcional)
          <input type="text" maxLength={300} value={f.obs || ''} onChange={(e) => setF({ ...f, obs: e.target.value })} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
        </label>
        {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold disabled:opacity-60">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ---------- pop-up com os detalhes ----------
function DetalheMedidas({ onClose, onAdicionar, children }) {
  useVoltar(true, onClose);
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Medidas corporais" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-2xl p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto flex flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center gap-2">
          <h2 className="text-lg font-bold">Medidas corporais</h2>
          <div className="flex items-center gap-2">
            <button onClick={onAdicionar} className="text-xs font-bold px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300">+ Adicionar medidas</button>
            <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

const Cartao = ({ rotulo, onClick, children }) => (
  <button type="button" onClick={onClick} className="text-left bg-zinc-950/50 border border-zinc-800 hover:border-zinc-600 rounded-lg px-2.5 py-1.5 min-w-0">
    <div className="text-[11px] text-zinc-400">{rotulo}</div>
    <div className="text-base font-bold text-white leading-tight">{children}</div>
  </button>
);

// ---------- bloco principal ----------
export default function MedidasCorporais({ user, medidas, setMedidas, sexo = 'm', comando = null, config, atualizarConfig = () => {} }) {
  const [modal, setModal] = useState(null); // formulário inicial
  const [detalhe, setDetalhe] = useState(false);
  const [excluir, setExcluir] = useState(null);
  const [grafId, setGrafId] = useState(null); // medida aberta em gráfico
  const [imcAberto, setImcAberto] = useState(false);
  const [exibidas, setExibidas] = useState(false);
  const prefs = prefsMedidas(config?.medidas);
  const [meta, setMeta] = useState(null); // texto em edição da meta de peso
  const enr = useMemo(() => enriquecer(medidas, sexo), [medidas, sexo]);
  const ultimaAltura = [...enr].reverse().find((r) => r.alturaUsada)?.alturaUsada ?? '';

  const cmdVisto = useRef(comando);
  useEffect(() => { if (comando !== cmdVisto.current) { cmdVisto.current = comando; setModal(vazio(ultimaAltura)); } // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comando]);

  const persistirLocal = (lista) => { setMedidas(lista); if (!user) { try { localStorage.setItem('local_medidas', JSON.stringify(lista)); } catch { /* sem armazenamento */ } } };

  const salvar = async (m) => {
    const id = m.id || `${m.data}-${Date.now()}`;
    const completa = { ...m, id };
    // o Firestore não aceita undefined
    Object.keys(completa).forEach((k) => completa[k] === undefined && delete completa[k]);
    let ok = true;
    if (user) ok = await salvarDoc(doc(db, 'users', user.uid, 'medidas', id), completa);
    else persistirLocal([...medidas.filter((x) => x.id !== id), completa]);
    if (ok) { notificar('Medidas salvas.', 'sucesso'); setModal(null); }
  };

  const apagar = async (id) => {
    let ok = true;
    if (user) ok = await apagarDoc(doc(db, 'users', user.uid, 'medidas', id));
    else persistirLocal(medidas.filter((x) => x.id !== id));
    if (ok) notificar('Medidas excluídas.', 'sucesso');
  };

  const abrirMedida = (id) => (id === 'imc' ? setImcAberto(true) : setGrafId(id));
  const alternarGrafico = (chave) => (id) => atualizarConfig({ medidas: { [chave]: prefs[chave].includes(id) ? prefs[chave].filter((x) => x !== id) : [...prefs[chave], id] } });
  const historico = [...enr].reverse();
  const confirmarMeta = () => { if (meta !== null) { atualizarConfig({ medidas: { metaPeso: meta.trim() } }); setMeta(null); } };

  const conteudoMedida = (id) => {
    const t = textoMedida(enr, id);
    return <>{t.valor}{id === 'imc' && <> <PontoIMC imc={t.bruto} /></>}{t.estimada && <span className="text-[11px] font-normal text-zinc-500"> estimada</span>}</>;
  };

  return (
    <>
      {enr.length > 0 && (
        <div className="mt-2 w-full px-2 sm:px-0">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-2">
            <div className="flex-1 min-w-0 flex gap-1 overflow-x-auto snap-x" style={{ scrollbarWidth: 'none' }}>
              {prefs.bloco.map((id) => (
                <button key={id} type="button" onClick={() => abrirMedida(id)} className="flex-1 min-w-[4.75rem] snap-start text-center px-1 py-0.5 rounded-lg hover:bg-zinc-800">
                  <div className="text-[10px] text-zinc-500 whitespace-nowrap">{medidaPorId(id)?.rotulo}</div>
                  <div className="text-sm font-bold text-white leading-tight whitespace-nowrap">{conteudoMedida(id)}</div>
                </button>
              ))}
            </div>
            <button onClick={() => setDetalhe(true)} aria-label="Ver detalhes das medidas" className="shrink-0 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-lg font-bold leading-none">+</button>
          </div>
        </div>
      )}

      {detalhe && enr.length > 0 && (
        <DetalheMedidas onClose={() => setDetalhe(false)} onAdicionar={() => setModal(vazio(ultimaAltura))}>
          <div className="grid grid-cols-2 gap-1.5">
            <Cartao rotulo="Altura" onClick={() => abrirMedida('altura')}>{conteudoMedida('altura')}</Cartao>
            <Cartao rotulo="Peso" onClick={() => abrirMedida('peso')}>{conteudoMedida('peso')}</Cartao>
            <Cartao rotulo="IMC" onClick={() => abrirMedida('imc')}>{conteudoMedida('imc')}</Cartao>
            <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg px-2.5 py-1.5 min-w-0">
              <label className="text-[11px] text-zinc-400" htmlFor="meta-peso">Meta de peso</label>
              <div className="flex items-baseline gap-1">
                <input id="meta-peso" type="text" inputMode="decimal" placeholder="–" value={meta !== null ? meta : prefs.metaPeso} onChange={(e) => setMeta(e.target.value)} onBlur={confirmarMeta} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  className="w-full min-w-0 bg-transparent text-base font-bold text-white leading-tight focus:outline-none border-b border-zinc-700 focus:border-zinc-400" />
                <span className="text-xs text-zinc-500">kg</span>
              </div>
            </div>
            <Cartao rotulo="% de gordura" onClick={() => abrirMedida('gordura')}>{conteudoMedida('gordura')}</Cartao>
            <Cartao rotulo="Massa muscular" onClick={() => abrirMedida('musculo')}>{conteudoMedida('musculo')}</Cartao>
          </div>

          <CarrosselGraficos paginas={[
            { titulo: 'Peso, gordura, músculo e IMC', conteudo: <GraficoMedidas series={GRAFICO1_IDS.map((id, i) => serieDaMedida(enr, id, i))} visiveis={prefs.grafico1} onAlternar={alternarGrafico('grafico1')} rotuloAria="Evolução do peso, gordura, músculo e IMC" /> },
            { titulo: 'Medidas em cm', conteudo: <GraficoMedidas series={GRAFICO2_IDS.map((id, i) => serieDaMedida(enr, id, i))} visiveis={prefs.grafico2} onAlternar={alternarGrafico('grafico2')} rotuloAria="Evolução das medidas em centímetros" /> },
          ]} />

          <button onClick={() => setExibidas(true)} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-sm font-bold">Medidas exibidas no bloco</button>

          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl divide-y divide-zinc-800">
            <h3 className="text-xs uppercase tracking-wide text-zinc-500 px-3 py-2">Histórico</h3>
            {historico.map((r) => {
              const extras = EXTRAS.filter((e) => numero(r.extras?.[e.id]) > 0);
              return (
                <div key={r.id} className="px-3 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0 text-xs text-zinc-300">
                    <div className="font-bold text-zinc-100 text-sm">{fmtData(r.data)}</div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {r.peso !== null && r.peso !== undefined && <span>Peso {fmt(r.peso)} kg</span>}
                      {r.imc !== null && <span>IMC {fmt(r.imc)}</span>}
                      {r.abdomen !== null && <span>Barriga {fmt(r.abdomen)} cm</span>}
                      {Number.isFinite(r.gorduraUsada) && <span>Gordura {fmt(r.gorduraUsada)}%{r.gorduraEstimada ? ' (est.)' : ''}</span>}
                      {Number.isFinite(r.musculoUsado) && <span>Músculo {fmt(r.musculoUsado)} kg{r.musculoEstimado ? ' (est.)' : ''}{r.musculoPct ? ` · ${fmt(r.musculoPct)}%` : ''}</span>}
                    </div>
                    {extras.length > 0 && <div className="text-zinc-500 mt-0.5">{extras.map((e) => `${e.rotulo} ${fmt(numero(r.extras[e.id]))} cm`).join(' · ')}</div>}
                    {r.obs && <div className="text-zinc-500 italic mt-0.5 break-words">{r.obs}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setModal({ ...vazio(''), ...r, peso: r.peso ?? '', altura: r.altura ?? '', abdomen: r.abdomen ?? '', gordura: r.gordura ?? '', musculo: r.musculo ?? '', extras: Object.fromEntries(Object.entries(r.extras || {}).filter(([k]) => k !== 'abdomen').map(([k, v]) => [k, String(v)])), obs: r.obs || '' })} className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded">Editar</button>
                    <button onClick={() => setExcluir(r)} className="text-xs px-2 py-1 text-red-400 hover:text-red-300" aria-label={`Excluir medição de ${fmtData(r.data)}`}>Excluir</button>
                  </div>
                </div>
              );
            })}
          </div>
        </DetalheMedidas>
      )}

      {grafId && <PopupGraficoMedida enr={enr} id={grafId} onClose={() => setGrafId(null)} />}
      {imcAberto && <PopupIMC enr={enr} onClose={() => setImcAberto(false)} />}
      {exibidas && <PopupMedidasExibidas selecionadas={prefs.bloco} onSalvar={(bloco) => atualizarConfig({ medidas: { bloco } })} onClose={() => setExibidas(false)} />}
      {modal && <ModalMedida inicial={modal} sexo={sexo} onClose={() => setModal(null)} onSalvar={salvar} />}
      <ConfirmModal
        aberto={!!excluir}
        titulo="Excluir medidas"
        mensagem={excluir ? `Excluir as medidas de ${fmtData(excluir.data)}?` : ''}
        onCancelar={() => setExcluir(null)}
        onConfirmar={() => { const id = excluir.id; setExcluir(null); apagar(id); }}
      />
    </>
  );
}
