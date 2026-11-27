import { useState, useEffect, useCallback } from 'react';
import { hojeLocalStr } from '../utils/date';
import { organizarAgenda, rotuloDoDia, linkParaApp, linkAbrirAppAgenda } from '../utils/agendaWidget';
import { pedirTokenLeitura, tokenLeituraValido, carregarAgendaEtarefas, mensagemDeErroLeitura } from '../services/googleLeitura';

const agente = () => (typeof navigator !== 'undefined' ? navigator.userAgent : '');
const abrirNoApp = (url) => { window.location.href = linkParaApp(url, agente()); };
const URL_AGENDA = 'https://calendar.google.com/calendar/u/0/r/agenda';
const abrirAgendaNoApp = () => { window.location.href = linkAbrirAppAgenda(URL_AGENDA, agente()); };

const chaveCache = (user) => `google_widget_${user ? user.uid : 'local'}`;
const lerCache = (user) => { try { return JSON.parse(localStorage.getItem(chaveCache(user)) || 'null'); } catch { return null; } };
const gravarCache = (user, dados) => { try { localStorage.setItem(chaveCache(user), JSON.stringify(dados)); } catch { /* sem armazenamento */ } };
const horaDe = (ms) => new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

function Linha({ item }) {
  const tarefa = item.tipo === 'tarefa';
  return (
    <li>
      <button type="button" onClick={() => item.link && abrirNoApp(item.link)} disabled={!item.link} className="w-full flex items-center gap-2.5 text-left px-3 py-2 hover:bg-zinc-800/60 disabled:hover:bg-transparent">
        <span className="w-12 shrink-0 text-[11px] text-zinc-400 text-right leading-tight">{item.diaInteiro ? (tarefa ? '' : 'Dia todo') : item.hora}</span>
        {tarefa
          ? <span aria-hidden="true" className="w-3.5 h-3.5 shrink-0 rounded-full border-2 border-sky-400" />
          : <span aria-hidden="true" className="w-3.5 h-3.5 shrink-0 rounded" style={{ background: item.cor || '#3b82f6' }} />}
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-zinc-100 truncate">{item.titulo}</span>
          {(item.agenda || item.horaFim) && <span className="block text-[11px] text-zinc-500 truncate">{tarefa ? 'Tarefa' : (item.horaFim ? `até ${item.horaFim}` : '')}{item.agenda ? `${tarefa || item.horaFim ? ' · ' : ''}${item.agenda}` : ''}</span>}
        </span>
      </button>
    </li>
  );
}

// Widget parecido com o do Google Agenda: atrasadas (minimizado), hoje (eventos + tarefas) e próximos dias.
// Só leitura: tocar num item abre o app do Google (no Android) para editar lá.
export default function AgendaGoogle({ user, config, atualizarConfig }) {
  const cfg = config?.agendaGoogle || {};
  const minimizada = !!cfg.minimizada;
  const [dados, setDados] = useState(() => lerCache(user)); // { quando, dias, itens }
  const [dias, setDias] = useState(() => lerCache(user)?.dias || 14);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [atrasadasAbertas, setAtrasadasAbertas] = useState(false);
  const hoje = hojeLocalStr();

  const atualizar = useCallback(async (diasPedidos) => {
    setErro('');
    setCarregando(true);
    try {
      await pedirTokenLeitura();
      const r = await carregarAgendaEtarefas({ hoje: hojeLocalStr(), dias: diasPedidos, incluirRotiNa: cfg.incluirRotiNa !== false });
      const novo = { quando: Date.now(), dias: diasPedidos, itens: r.itens };
      setDados(novo);
      gravarCache(user, novo);
      if (r.avisos.length) setErro(r.avisos.join(' '));
    } catch (e) { setErro(mensagemDeErroLeitura(e)); }
    setCarregando(false);
  }, [user, cfg.incluirRotiNa]);

  // com o token ainda válido (aberto há menos de 1 hora), atualiza sozinho ao mostrar o bloco
  useEffect(() => {
    if (!minimizada && tokenLeituraValido()) atualizar(dias);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimizada]);

  const org = dados ? organizarAgenda(dados.itens, hoje, dados.dias || dias) : null;
  const vazio = org && org.hoje.length === 0 && org.proximas.length === 0 && org.atrasadas.length === 0;

  return (
    <div className="mt-3 w-full px-2 sm:px-0">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800">
          <button onClick={() => atualizarConfig?.({ agendaGoogle: { minimizada: !minimizada } })} aria-expanded={!minimizada} aria-label={minimizada ? 'Expandir Google Agenda' : 'Minimizar Google Agenda'} className="flex items-center gap-2 text-xs font-bold text-zinc-200 hover:text-white">
            <span className="text-zinc-400 text-[10px]">{minimizada ? '▶︎' : '▼︎'}</span>
            Google Agenda e Tarefas
          </button>
          <div className="flex items-center gap-1.5">
            <button onClick={abrirAgendaNoApp} className="text-[11px] font-semibold px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors">Abrir</button>
            {!minimizada && <button onClick={() => atualizar(dias)} disabled={carregando} aria-label="Atualizar" title="Atualizar" className="text-[11px] font-semibold px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors disabled:opacity-50">{carregando ? '…' : '↻'}</button>}
          </div>
        </div>

        {!minimizada && (
          <div>
            {!dados && (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-zinc-400 mb-3">Mostre aqui os eventos do Google Agenda e as tarefas do Google Tarefas (só leitura).</p>
                <button onClick={() => atualizar(dias)} disabled={carregando} className="text-sm font-bold px-4 py-2 bg-zinc-100 text-zinc-950 rounded-lg hover:bg-zinc-300 disabled:opacity-50">{carregando ? 'Carregando…' : 'Conectar com o Google'}</button>
              </div>
            )}
            {erro && <p role="alert" className="text-xs text-red-400 px-3 py-2">{erro}</p>}
            {org && (
              <>
                {org.atrasadas.length > 0 && (
                  <div className="border-b border-zinc-800">
                    <button onClick={() => setAtrasadasAbertas((a) => !a)} aria-expanded={atrasadasAbertas} className="w-full flex items-center gap-2 px-3 py-2 text-left">
                      <span className="text-zinc-400 text-[10px]">{atrasadasAbertas ? '▼︎' : '▶︎'}</span>
                      <span className="text-xs font-bold text-red-400">Atrasadas</span>
                      <span className="text-[11px] text-red-400/80">({org.atrasadas.length})</span>
                    </button>
                    {atrasadasAbertas && (
                      <ul className="pb-1">
                        {org.atrasadas.map((i) => (
                          <div key={`${i.tipo}-${i.id}`}>
                            <div className="px-3 pt-1 text-[10px] uppercase tracking-wide text-zinc-500">{rotuloDoDia(i.data, hoje)}</div>
                            <Linha item={i} />
                          </div>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="border-b border-zinc-800">
                  <div className="px-3 pt-2 text-xs font-bold text-zinc-200">{rotuloDoDia(hoje, hoje)}</div>
                  {org.hoje.length === 0 ? <p className="px-3 py-2 text-xs text-zinc-500">Nada para hoje.</p> : <ul className="py-1">{org.hoje.map((i) => <Linha key={`${i.tipo}-${i.id}`} item={i} />)}</ul>}
                </div>

                {org.proximas.map((p) => (
                  <div key={p.data} className="border-b border-zinc-800 last:border-0">
                    <div className="px-3 pt-2 text-xs font-bold text-zinc-300">{rotuloDoDia(p.data, hoje)}</div>
                    <ul className="py-1">{p.itens.map((i) => <Linha key={`${i.tipo}-${i.id}`} item={i} />)}</ul>
                  </div>
                ))}
                {vazio && <p className="px-3 py-4 text-xs text-zinc-500 text-center">Nada nos próximos {dados.dias || dias} dias.</p>}

                <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-600">Atualizado às {horaDe(dados.quando)}. Toque em ↻ para buscar de novo.</span>
                  <button onClick={() => { const n = (dados.dias || dias) + 14; setDias(n); atualizar(n); }} disabled={carregando} className="text-[11px] font-semibold px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded disabled:opacity-50">Ver +14 dias</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
