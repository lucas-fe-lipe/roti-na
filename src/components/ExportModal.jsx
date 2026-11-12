import { useState, useMemo, useEffect } from 'react';
import useVoltar from '../hooks/useVoltar';
import { hojeLocalStr } from '../utils/date';
import { montarICS } from '../utils/ics';
import { montarItens, normalizarLembretes, CORES_GOOGLE, MAX_LEMBRETES } from '../utils/agendaItens';
import { calcularPlano } from '../utils/agendaPlano';
import { notificar } from '../utils/toast';
import {
  integracaoConfigurada, precarregarGIS, pedirToken, garantirAgendas, executarPlano,
  carregarMapa, salvarMapa, mensagemDeErro, NOME_AGENDA, NOME_AGENDA_AVALIACOES, iniciarSincronizacao, terminarSincronizacao,
} from '../services/googleAgenda';
import { agendasNecessarias } from '../hooks/useGoogleAutoSync';

const UNIDADES = [
  { mult: 1, rotulo: 'minutos' },
  { mult: 60, rotulo: 'horas' },
  { mult: 1440, rotulo: 'dias' },
];

// minutos -> { v, u } com a maior unidade que divide certinho
const minutosParaLinha = (min) => {
  const m = Number(min);
  const un = m > 0 && m % 1440 === 0 ? 1440 : m > 0 && m % 60 === 0 ? 60 : 1;
  return { v: String(m / un), u: String(un) };
};
const linhaParaMinutos = (l) => (l.v === '' || Number.isNaN(Number(l.v)) ? null : Number(l.v) * Number(l.u));

const somarDias = (dataStr, dias) => {
  const [a, m, d] = dataStr.split('-').map(Number);
  return hojeLocalStr(new Date(a, m - 1, d + dias));
};

const chaveRegistro = (user) => `ics_exportados_${user ? user.uid : 'local'}`;
const lerRegistro = (user) => {
  try { return JSON.parse(localStorage.getItem(chaveRegistro(user)) || '{}') || {}; } catch { return {}; }
};

function SeletorCor({ rotulo, valor, onChange }) {
  const cor = CORES_GOOGLE.find((c) => c.id === valor);
  return (
    <div className="flex items-center gap-2">
      <span className="w-3.5 h-3.5 rounded-full shrink-0 border border-zinc-600" style={{ backgroundColor: cor ? cor.hex : 'transparent' }} aria-hidden="true" />
      <span className="flex-1 min-w-0 truncate text-sm">{rotulo}</span>
      <select value={valor} onChange={(e) => onChange(e.target.value)} className="bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-100 text-xs" aria-label={`Cor de ${rotulo}`}>
        <option value="">Cor da agenda</option>
        {CORES_GOOGLE.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
      </select>
    </div>
  );
}

export default function ExportModal({ aberto, onFechar, user, atividades, tarefas, config, atualizarConfig }) {
  const hoje = hojeLocalStr(new Date());
  const googleOk = integracaoConfigurada();
  const [destino, setDestino] = useState(googleOk ? 'google' : 'ics');
  const [incluirAtividades, setIncluirAtividades] = useState(true);
  const [inicio, setInicio] = useState(hoje);
  const [fim, setFim] = useState(somarDias(hoje, 112)); // ~16 semanas
  const [incluirAvaliacoes, setIncluirAvaliacoes] = useState(true);
  const [linhasLembrete, setLinhasLembrete] = useState([minutosParaLinha(10)]);
  const [coresAtividade, setCoresAtividade] = useState({});
  const [corAvaliacao, setCorAvaliacao] = useState('');
  const [soNovosICS, setSoNovosICS] = useState(false);
  const [atualizarMudancas, setAtualizarMudancas] = useState(true); // Google: atualizar o que mudou e remover o que foi excluído
  const [mapa, setMapa] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  useVoltar(aberto, () => { if (!sincronizando) onFechar(); });
  const [falhas, setFalhas] = useState([]);
  const [confirmouRemocao, setConfirmouRemocao] = useState(false);
  const [removerDesmarcadas, setRemoverDesmarcadas] = useState({ atividade: false, avaliacao: false }); // apagar do Google o que já foi enviado de categorias desmarcadas

  const fusoHorario = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
  const lembretes = normalizarLembretes(linhasLembrete.map(linhaParaMinutos));
  const chaveLembretes = lembretes.join(',');
  const categorias = [incluirAtividades && 'atividade', incluirAvaliacoes && 'avaliacao'].filter(Boolean);
  const categoriasDeAtividade = Array.from(new Set(atividades.map((a) => a.categoria).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  // só as categorias que existem de fato entram nas cores (e na "assinatura" dos eventos)
  const coresUsadas = Object.fromEntries(categoriasDeAtividade.filter((c) => coresAtividade[c]).map((c) => [c, coresAtividade[c]]));
  const chaveCores = JSON.stringify([coresUsadas, corAvaliacao]);
  const ROTULO_CATEGORIA = { atividade: 'atividades', avaliacao: 'avaliações' };
  // categorias desmarcadas que ainda têm eventos na agenda do Google
  const salvosPorCategoria = (cat) => Object.values(mapa?.itens || {}).filter((g) => g.categoria === cat).length;
  const desmarcadasComSalvos = ['atividade', 'avaliacao'].filter((cat) => !categorias.includes(cat) && salvosPorCategoria(cat) > 0);
  const chaveRemocaoDesm = desmarcadasComSalvos.map((c) => `${c}:${removerDesmarcadas[c] ? 1 : 0}`).join(',');
  // plano da sincronização + remoção do que já foi enviado de categorias desmarcadas (se a pessoa pediu)
  const montarPlanoCompleto = (itens, mapaBase) => {
    const plano = calcularPlano(itens, mapaBase, { categorias, atualizar: atualizarMudancas, remover: atualizarMudancas });
    desmarcadasComSalvos.filter((cat) => removerDesmarcadas[cat]).forEach((cat) => {
      Object.entries(mapaBase?.itens || {}).forEach(([chave, g]) => {
        if (g.categoria === cat && !plano.remover.some((r) => r.chave === chave)) {
          plano.remover.push({ chave, eventId: g.eventId, agenda: g.agenda || 'atividades' });
        }
      });
    });
    return plano;
  };

  useEffect(() => {
    if (!aberto) return;
    setFalhas([]);
    setConfirmouRemocao(false);
    setRemoverDesmarcadas({ atividade: false, avaliacao: false });
    if (googleOk) {
      precarregarGIS();
      let ativo = true;
      carregarMapa(user).then((m) => {
        if (!ativo) return;
        setMapa(m);
        // reabre com o que foi usado da última vez (senão tudo apareceria como "precisa atualizar")
        const o = m.opcoes;
        if (o) {
          setIncluirAtividades(!!o.incluirAtividades);
          if (o.inicio) setInicio(o.inicio);
          if (o.fim) setFim(o.fim);
          setIncluirAvaliacoes(!!o.incluirAvaliacoes);
          const salvos = normalizarLembretes(o.lembretes !== undefined ? o.lembretes : o.lembrete);
          setLinhasLembrete(salvos.map(minutosParaLinha));
          setCoresAtividade(o.coresAtividade || {});
          setCorAvaliacao(o.corAvaliacao || '');
        }
      });
      return () => { ativo = false; };
    }
  }, [aberto, user, googleOk]);

  const opcoesItens = { atividades, tarefas, incluirAtividades, inicio, fim, incluirAvaliacoes, lembretes, coresAtividade: coresUsadas, corAvaliacao };

  // Pré-visualização do arquivo .ics
  const previaICS = useMemo(
    () => (aberto && destino === 'ics'
      ? montarICS({ ...opcoesItens, soNovos: soNovosICS, exportados: soNovosICS ? lerRegistro(user) : {}, fusoHorario })
      : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [aberto, destino, atividades, tarefas, incluirAtividades, inicio, fim, incluirAvaliacoes, chaveLembretes, soNovosICS]
  );

  // Pré-visualização da sincronização com o Google
  const previaGoogle = useMemo(() => {
    if (!aberto || destino !== 'google' || !mapa) return null;
    const { itens, semData } = montarItens(opcoesItens);
    const plano = montarPlanoCompleto(itens, mapa);
    return { itens, semData, plano };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, destino, mapa, atividades, tarefas, incluirAtividades, inicio, fim, incluirAvaliacoes, chaveLembretes, chaveCores, atualizarMudancas, chaveRemocaoDesm]);

  useEffect(() => { setConfirmouRemocao(false); }, [previaGoogle?.plano.remover.length]);

  if (!aberto) return null;

  const periodoInvalido = incluirAtividades && (!inicio || !fim || fim < inicio);

  const handleBaixar = () => {
    if (periodoInvalido) return;
    const r = montarICS({ ...opcoesItens, soNovos: soNovosICS, exportados: soNovosICS ? lerRegistro(user) : {}, fusoHorario });
    if (r.total === 0) {
      notificar('Não há nada novo para exportar com essas opções.', 'info');
      return;
    }
    const blob = new Blob([r.texto], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roti-na-${hojeLocalStr(new Date())}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    try {
      localStorage.setItem(chaveRegistro(user), JSON.stringify({ ...lerRegistro(user), ...r.registros }));
    } catch { /* sem armazenamento */ }
    notificar(`Arquivo gerado com ${r.total} ${r.total === 1 ? 'evento' : 'eventos'}.`, 'sucesso');
    onFechar();
  };

  const handleSincronizar = async () => {
    if (periodoInvalido || !previaGoogle || sincronizando) return;
    const { plano } = previaGoogle;
    const precisaConfirmar = plano.remover.length >= 5 && !confirmouRemocao;
    if (precisaConfirmar) {
      setConfirmouRemocao(true);
      return;
    }
    if (!iniciarSincronizacao()) {
      notificar('Já há uma sincronização em andamento. Tente de novo em instantes.', 'info');
      return;
    }
    setSincronizando(true);
    setFalhas([]);
    let mapaAtual = mapa;
    try {
      const token = await pedirToken();
      mapaAtual = await garantirAgendas(token, mapa, fusoHorario, agendasNecessarias({ incluirAtividades, incluirAvaliacoes }));
      // se uma agenda foi recriada, o mapa mudou: recalcula o plano com ele
      const { itens } = montarItens(opcoesItens);
      const planoFinal = montarPlanoCompleto(itens, mapaAtual);
      const resumo = await executarPlano(token, planoFinal, mapaAtual, fusoHorario);
      const partes = [];
      if (resumo.criados) partes.push(`${resumo.criados} criados`);
      if (resumo.atualizados) partes.push(`${resumo.atualizados} atualizados`);
      if (resumo.removidos) partes.push(`${resumo.removidos} removidos`);
      if (resumo.falhas.length === 0) {
        notificar(partes.length ? `Google Agenda sincronizado: ${partes.join(', ')}.` : 'A agenda já estava em dia.', 'sucesso');
      } else {
        setFalhas(resumo.falhas.slice(0, 5));
        notificar(`${resumo.falhas.length} itens não foram sincronizados.`, 'erro');
      }
    } catch (e) {
      console.error(e);
      notificar(mensagemDeErro(e), 'erro');
    } finally {
      if (mapaAtual && Object.keys(mapaAtual.agendas || {}).length) {
        // guarda o que deu certo (e as opções usadas, para a sincronização automática)
        mapaAtual.opcoes = { incluirAtividades, inicio, fim, incluirAvaliacoes, lembretes, coresAtividade: coresUsadas, corAvaliacao };
        await salvarMapa(user, mapaAtual);
        setMapa({ agendas: { ...mapaAtual.agendas }, calendarId: mapaAtual.calendarId, itens: { ...mapaAtual.itens }, opcoes: mapaAtual.opcoes });
      }
      terminarSincronizacao();
      setSincronizando(false);
    }
  };

  const c = previaICS?.contagem;
  const p = previaGoogle?.plano;
  const totalGoogle = p ? p.criar.length + p.atualizar.length + p.remover.length : 0;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={sincronizando ? undefined : onFechar}>
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-xl font-bold">Exportar para o Google Agenda</h2>

        <div className="space-y-3 text-sm">
          <div className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={incluirAtividades} onChange={(e) => setIncluirAtividades(e.target.checked)} className="w-4 h-4 accent-zinc-300" />
              <span className="font-medium">Atividades (grade semanal)</span>
            </label>
            {incluirAtividades && (
              <div className="flex gap-2 pl-6">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">De</label>
                  <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-100 [color-scheme:dark]" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">Até</label>
                  <input type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-100 [color-scheme:dark]" />
                </div>
              </div>
            )}
            {periodoInvalido && <p className="text-xs text-red-400 pl-6">A data final precisa ser igual ou posterior à inicial.</p>}
          </div>

          <label className="flex items-center gap-2 cursor-pointer rounded border border-zinc-800 bg-zinc-950 p-3">
            <input type="checkbox" checked={incluirAvaliacoes} onChange={(e) => setIncluirAvaliacoes(e.target.checked)} className="w-4 h-4 accent-zinc-300" />
            <span className="font-medium">Avaliações (da página Notas)</span>
          </label>

          <div className="space-y-1.5">
            <label className="block text-xs text-zinc-500">Lembretes (até {MAX_LEMBRETES})</label>
            {linhasLembrete.length === 0 && <p className="text-xs text-zinc-500">Sem lembretes.</p>}
            {linhasLembrete.map((l, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="number" min="0" value={l.v}
                  onChange={(e) => setLinhasLembrete((p) => p.map((x, j) => (j === i ? { ...x, v: e.target.value } : x)))}
                  className="w-20 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-zinc-100 text-sm"
                  aria-label={`Lembrete ${i + 1}`}
                />
                <select
                  value={l.u}
                  onChange={(e) => setLinhasLembrete((p) => p.map((x, j) => (j === i ? { ...x, u: e.target.value } : x)))}
                  className="bg-zinc-950 border border-zinc-700 rounded p-1.5 text-zinc-100 text-sm"
                >
                  {UNIDADES.map((u) => <option key={u.mult} value={String(u.mult)}>{u.rotulo}</option>)}
                </select>
                <span className="text-xs text-zinc-500 flex-1">antes</span>
                <button type="button" onClick={() => setLinhasLembrete((p) => p.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-400 px-2 text-lg leading-none" title="Remover lembrete">×</button>
              </div>
            ))}
            {linhasLembrete.length < MAX_LEMBRETES && (
              <button type="button" onClick={() => setLinhasLembrete((p) => [...p, minutosParaLinha(p.length === 0 ? 10 : 60)])} className="text-xs text-zinc-300 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded px-2.5 py-1">+ Adicionar lembrete</button>
            )}
            <p className="text-[11px] text-zinc-500">Itens sem horário (dia inteiro) avisam uma vez, na véspera às 09:00.</p>
          </div>
        </div>

        <div className="flex bg-zinc-950 rounded p-1" role="tablist">
          <button role="tab" aria-selected={destino === 'google'} onClick={() => setDestino('google')} className={`flex-1 py-2 text-sm rounded transition-colors ${destino === 'google' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Sincronizar com o Google</button>
          <button role="tab" aria-selected={destino === 'ics'} onClick={() => setDestino('ics')} className={`flex-1 py-2 text-sm rounded transition-colors ${destino === 'ics' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>Arquivo .ics</button>
        </div>

        {destino === 'google' && (
          <div className="space-y-3 text-sm">
            {!googleOk ? (
              <div className="rounded bg-amber-950/40 border border-amber-700/60 p-3 text-xs text-amber-200">
                A integração com o Google ainda não foi configurada neste site (falta o código de acesso <code>VITE_GOOGLE_CLIENT_ID</code>). Use o arquivo .ics por enquanto.
              </div>
            ) : (
              <>
                <p className="text-xs text-zinc-400">
                  O app cria e mantém duas agendas na sua conta Google: <strong>{NOME_AGENDA}</strong> (atividades) e <strong>{NOME_AGENDA_AVALIACOES}</strong> (avaliações). Ele só enxerga essas agendas, nunca as suas outras.
                </p>

                <div className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                  <div className="text-xs text-zinc-500">Cores no Google Agenda</div>
                  {incluirAtividades && categoriasDeAtividade.map((cat) => (
                    <SeletorCor key={cat} rotulo={cat} valor={coresAtividade[cat] || ''} onChange={(v) => setCoresAtividade((p) => ({ ...p, [cat]: v }))} />
                  ))}
                  {incluirAtividades && categoriasDeAtividade.length === 0 && <p className="text-xs text-zinc-500">Suas atividades ainda não têm categoria.</p>}
                  {incluirAvaliacoes && <SeletorCor rotulo="Avaliações" valor={corAvaliacao} onChange={setCorAvaliacao} />}
                </div>
                {desmarcadasComSalvos.map((cat) => (
                  <label key={cat} className="flex items-start gap-2 cursor-pointer rounded border border-amber-700/50 bg-amber-950/20 p-2.5">
                    <input type="checkbox" checked={!!removerDesmarcadas[cat]} onChange={(e) => setRemoverDesmarcadas((p) => ({ ...p, [cat]: e.target.checked }))} className="w-4 h-4 mt-0.5 accent-zinc-300" />
                    <span>
                      Remover do Google as {ROTULO_CATEGORIA[cat]} já enviadas
                      <span className="block text-xs text-zinc-400">{salvosPorCategoria(cat)} {salvosPorCategoria(cat) === 1 ? 'evento' : 'eventos'} na agenda. Você desmarcou esta categoria; marque aqui para apagá-los na próxima sincronização.</span>
                    </span>
                  </label>
                ))}
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={atualizarMudancas} onChange={(e) => setAtualizarMudancas(e.target.checked)} className="w-4 h-4 mt-0.5 accent-zinc-300" />
                  <span>
                    Atualizar o que mudou e remover o que foi excluído
                  </span>
                </label>

                {config && atualizarConfig && (
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" checked={config.integracoes.googleAutoSync} onChange={(e) => atualizarConfig({ integracoes: { googleAutoSync: e.target.checked } })} className="w-4 h-4 mt-0.5 accent-zinc-300" />
                    <span>
                      Sincronizar automaticamente
                    </span>
                  </label>
                )}

                <div className="rounded bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-300 space-y-1">
                  {!previaGoogle ? (
                    <div className="text-zinc-500">Carregando…</div>
                  ) : (
                    <>
                      <div>
                        <strong>{p.criar.length}</strong> para criar · <strong>{p.atualizar.length}</strong> para atualizar · <strong>{p.remover.length}</strong> para remover
                      </div>
                      <div className="text-zinc-500">{p.iguais} já estão na agenda e não mudaram.</div>
                      {previaGoogle.semData > 0 && <div className="text-amber-400">{previaGoogle.semData} avaliações sem data ficam de fora (o Google Agenda precisa de uma data).</div>}
                      <div className="text-zinc-500">A sincronização é só do app para o Google: mudanças feitas direto na agenda podem ser sobrescritas.</div>
                    </>
                  )}
                </div>
                {falhas.length > 0 && (
                  <ul className="rounded bg-red-950/40 border border-red-800 p-3 text-xs text-red-200 list-disc list-inside space-y-1">
                    {falhas.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                )}
              </>
            )}
          </div>
        )}

        {destino === 'ics' && (
          <div className="space-y-3 text-sm">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={soNovosICS} onChange={(e) => setSoNovosICS(e.target.checked)} className="w-4 h-4 mt-0.5 accent-zinc-300" />
              <span>
                Só o que ainda não foi exportado
                <span className="block text-xs text-zinc-500">Pula o que você já baixou neste aparelho e não mudou. Itens alterados são enviados de novo.</span>
              </span>
            </label>
            <div className="rounded bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-300 space-y-1">
              <div><strong>{previaICS?.total ?? 0}</strong> {previaICS?.total === 1 ? 'evento será gerado' : 'eventos serão gerados'}: {c?.atividades ?? 0} de atividades e {c?.avaliacoes ?? 0} de avaliações.</div>
              {c?.jaExportados > 0 && <div className="text-zinc-500">{c.jaExportados} já exportados e sem mudanças (ignorados).</div>}
              {c?.semData > 0 && <div className="text-amber-400">{c.semData} sem data não entram no arquivo.</div>}
              <div className="text-zinc-500">Avaliações que já têm nota não são exportadas.</div>
            </div>
            <details className="text-xs text-zinc-400">
              <summary className="cursor-pointer text-zinc-300">Como importar no Google Agenda</summary>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>No computador, abra calendar.google.com.</li>
                <li>Crie uma agenda chamada <strong>roti-na</strong> (Outras agendas → + → Criar nova agenda).</li>
                <li>Engrenagem → Configurações → <strong>Importar e exportar</strong> → escolha o arquivo e a agenda <strong>roti-na</strong> → Importar.</li>
              </ol>
              <p className="mt-2">O arquivo é uma cópia do momento: apagar algo aqui depois não apaga na agenda. Para isso, use a sincronização.</p>
            </details>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onFechar} disabled={sincronizando} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm disabled:opacity-40">Fechar</button>
          {destino === 'google' ? (
            <button
              onClick={handleSincronizar}
              disabled={!googleOk || periodoInvalido || !previaGoogle || sincronizando || totalGoogle === 0}
              className={`px-5 py-2 rounded font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed ${confirmouRemocao ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-zinc-100 text-zinc-950 hover:bg-zinc-300'}`}
            >
              {sincronizando ? 'Sincronizando…' : confirmouRemocao ? `Confirmar: remover ${p.remover.length} eventos` : totalGoogle === 0 && previaGoogle ? 'Nada a sincronizar' : 'Sincronizar agora'}
            </button>
          ) : (
            <button onClick={handleBaixar} disabled={periodoInvalido || !previaICS || previaICS.total === 0} className="px-5 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              Baixar arquivo .ics
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
