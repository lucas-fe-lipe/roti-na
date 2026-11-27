// Leitura (só leitura) do Google Agenda e do Google Tarefas para o widget da tela.
// Usa um token à parte do da sincronização (que só enxerga as agendas roti-na): aqui a permissão é de leitura
// de todas as agendas e das tarefas. O token fica só na memória (1 hora).
import { carregarGIS } from './googleAgenda';
import { itensDoEvento, itemDaTarefa } from '../utils/agendaWidget';

const ESCOPO = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks.readonly';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
let token = null; // { valor, expiraEm }

export const tokenLeituraValido = () => (token && token.expiraEm > Date.now() + 60000 ? token.valor : null);

// Precisa ser chamada logo após um clique (senão o navegador bloqueia o pop-up do Google).
export async function pedirTokenLeitura() {
  const atual = tokenLeituraValido();
  if (atual) return atual;
  await carregarGIS();
  return new Promise((resolve, reject) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: ESCOPO,
      callback: (resp) => {
        if (resp.error || !resp.access_token) { reject(new Error(resp.error === 'access_denied' ? 'Permissão negada no Google.' : `Erro no login do Google (${resp.error || 'sem token'}).`)); return; }
        token = { valor: resp.access_token, expiraEm: Date.now() + (Number(resp.expires_in) || 3600) * 1000 };
        resolve(token.valor);
      },
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'A janela do Google foi fechada antes de terminar.' : 'Não foi possível abrir o login do Google (pop-up bloqueado?).')),
    });
    cliente.requestAccessToken({ prompt: '' });
  });
}

async function obter(url) {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${tokenLeituraValido()}` } });
  if (resp.ok) return resp.json();
  let detalhe = '';
  try { detalhe = (await resp.json())?.error?.message || ''; } catch { /* sem corpo */ }
  if (resp.status === 401) token = null;
  const e = new Error(detalhe || `Erro ${resp.status} do Google.`);
  e.status = resp.status;
  e.detalhe = detalhe;
  throw e;
}

export function mensagemDeErroLeitura(e) {
  if (e?.status === 401) return 'A sessão do Google expirou. Toque em atualizar.';
  if (e?.status === 403 && /Tasks API/i.test(e.detalhe || '')) return 'A Google Tasks API não está ativada no projeto do Google Cloud.';
  if (e?.status === 403 && /Calendar API/i.test(e.detalhe || '')) return 'A Google Calendar API não está ativada no projeto do Google Cloud.';
  if (e?.status === 403) return 'O Google negou o acesso. Confira as permissões e as APIs ativadas.';
  return e?.message || 'Não foi possível ler o Google.';
}

const nomeRotiNa = (nome = '') => /^roti-na( avaliações)?$/i.test(nome.trim());
const inicioDoDia = (dataStr) => { const [y, m, d] = dataStr.split('-').map(Number); return new Date(y, m - 1, d); };

// Busca eventos (todas as agendas marcadas na conta) e tarefas com data, de hoje até "dias" dias à frente.
// Tarefas atrasadas vêm junto. Devolve { itens, avisos }: se só uma das fontes falhar, a outra continua valendo.
export async function carregarAgendaEtarefas({ hoje, dias, incluirRotiNa }) {
  const avisos = [];
  const min = inicioDoDia(hoje);
  const max = new Date(min.getFullYear(), min.getMonth(), min.getDate() + dias + 1);
  const itens = [];

  try {
    const lista = await obter('https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=reader&maxResults=50');
    const agendas = (lista.items || []).filter((c) => c.selected !== false && (incluirRotiNa || !nomeRotiNa(c.summaryOverride || c.summary))).slice(0, 15);
    const ps = agendas.map(async (c) => {
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(c.id)}/events?singleEvents=true&orderBy=startTime&maxResults=250&timeMin=${encodeURIComponent(min.toISOString())}&timeMax=${encodeURIComponent(max.toISOString())}`;
      const r = await obter(url);
      (r.items || []).forEach((ev) => itens.push(...itensDoEvento(ev, { nome: c.summaryOverride || c.summary, cor: c.backgroundColor })));
    });
    (await Promise.allSettled(ps)).forEach((r) => { if (r.status === 'rejected') avisos.push(mensagemDeErroLeitura(r.reason)); });
  } catch (e) { avisos.push(mensagemDeErroLeitura(e)); }

  try {
    const listas = await obter('https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=50');
    const dueMax = max.toISOString();
    const ps = (listas.items || []).map(async (l) => {
      const r = await obter(`https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(l.id)}/tasks?showCompleted=false&showHidden=false&maxResults=100&dueMax=${encodeURIComponent(dueMax)}`);
      (r.items || []).forEach((t) => { const i = itemDaTarefa(t, l.title); if (i) itens.push(i); });
    });
    (await Promise.allSettled(ps)).forEach((r) => { if (r.status === 'rejected') avisos.push(mensagemDeErroLeitura(r.reason)); });
  } catch (e) { avisos.push(mensagemDeErroLeitura(e)); }

  return { itens, avisos: Array.from(new Set(avisos)) };
}
