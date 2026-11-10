// Integração com o Google Agenda.
// - Login: Google Identity Services (token de acesso de 1 hora, guardado só na memória).
// - Permissão: calendar.app.created -> o app só enxerga/altera a agenda que ele mesmo criou ("roti-na").
// - O mapa "item do app -> evento do Google" fica em users/{uid}/integracoes/googleAgenda (ou localStorage sem login).
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { salvarDoc } from './db';
import { paraEventoGoogle } from '../utils/agendaPlano';

export const NOME_AGENDA = 'roti-na'; // agenda das atividades
export const NOME_AGENDA_AVALIACOES = 'roti-na avaliações';
export const NOMES_AGENDAS = { atividades: NOME_AGENDA, avaliacoes: NOME_AGENDA_AVALIACOES };
const ESCOPO = 'https://www.googleapis.com/auth/calendar.app.created';
const API = 'https://www.googleapis.com/calendar/v3';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const integracaoConfigurada = () => Boolean(CLIENT_ID);

// ---------- login (Google Identity Services) ----------
let scriptPromise = null;
function carregarGIS() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { scriptPromise = null; reject(new Error('Não foi possível carregar o login do Google. Verifique a conexão ou bloqueadores de conteúdo.')); };
      document.head.appendChild(s);
    });
  }
  return scriptPromise;
}

// Carrega o script antes do clique, para o pop-up de login abrir sem ser bloqueado.
export function precarregarGIS() {
  if (CLIENT_ID) carregarGIS().catch(() => {});
}

let tokenEmMemoria = null; // { valor, expiraEm }

// Token ainda válido (o Google dá 1 hora), ou null.
export function tokenValido() {
  return tokenEmMemoria && tokenEmMemoria.expiraEm > Date.now() + 60000 ? tokenEmMemoria.valor : null;
}

const guardarToken = (resp) => {
  tokenEmMemoria = { valor: resp.access_token, expiraEm: Date.now() + (Number(resp.expires_in) || 3600) * 1000 };
  return resp.access_token;
};

// Renovação sem pop-up (só funciona se o navegador permitir). Devolve o token ou null.
export async function pedirTokenSilencioso() {
  const atual = tokenValido();
  if (atual) return atual;
  try { await carregarGIS(); } catch { return null; }
  return new Promise((resolve) => {
    const limite = setTimeout(() => resolve(null), 8000);
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: ESCOPO,
      prompt: 'none',
      callback: (resp) => { clearTimeout(limite); resolve(resp.access_token ? guardarToken(resp) : null); },
      error_callback: () => { clearTimeout(limite); resolve(null); },
    });
    cliente.requestAccessToken({ prompt: 'none' });
  });
}

// Só uma sincronização por vez (manual ou automática).
let sincronizacaoEmAndamento = false;
export function iniciarSincronizacao() {
  if (sincronizacaoEmAndamento) return false;
  sincronizacaoEmAndamento = true;
  return true;
}
export function terminarSincronizacao() { sincronizacaoEmAndamento = false; }

// Precisa ser chamada logo após um clique (senão o navegador bloqueia o pop-up).
export async function pedirToken() {
  const atual = tokenValido();
  if (atual) return atual;
  await carregarGIS();
  return new Promise((resolve, reject) => {
    const cliente = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: ESCOPO,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error === 'access_denied' ? 'Permissão negada no Google.' : `Erro no login do Google (${resp.error || 'sem token'}).`));
          return;
        }
        resolve(guardarToken(resp));
      },
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'A janela do Google foi fechada antes de terminar.' : 'Não foi possível abrir o login do Google (pop-up bloqueado?).')),
    });
    cliente.requestAccessToken({ prompt: '' });
  });
}

// ---------- chamadas à API ----------
class ErroGoogle extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function chamar(token, metodo, caminho, corpo, tentativa = 0) {
  const resp = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, ...(corpo ? { 'Content-Type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  if (resp.ok) return resp.status === 204 ? null : resp.json();

  // limite de velocidade: espera e tenta de novo (até 3 vezes)
  if ((resp.status === 429 || resp.status === 403) && tentativa < 3) {
    const texto = await resp.clone().text();
    if (resp.status === 429 || /rateLimitExceeded|userRateLimitExceeded/.test(texto)) {
      await esperar(1000 * (tentativa + 1));
      return chamar(token, metodo, caminho, corpo, tentativa + 1);
    }
  }
  let detalhe = '';
  try { detalhe = (await resp.json())?.error?.message || ''; } catch { /* sem corpo */ }
  if (resp.status === 401) tokenEmMemoria = null;
  throw new ErroGoogle(resp.status, detalhe || `Erro ${resp.status} do Google Agenda.`);
}

export function mensagemDeErro(e) {
  if (e instanceof ErroGoogle) {
    if (e.status === 401) return 'A sessão com o Google expirou. Tente sincronizar de novo.';
    if (e.status === 403) return 'O Google recusou o acesso. Confira se a Google Calendar API está ativada e se a permissão foi concedida.';
    return e.message;
  }
  return e?.message || 'Erro desconhecido ao falar com o Google.';
}

// ---------- agendas "roti-na" e "roti-na avaliações" ----------
// mapa = { agendas: { atividades: id, avaliacoes: id }, calendarId (= agendas.atividades, mantido por compatibilidade), itens, opcoes }
// Garante que as agendas necessárias existem na conta da pessoa. Se uma foi apagada no Google, cria outra
// e esquece os eventos que estavam nela (serão criados de novo).
export async function garantirAgendas(token, mapa, fusoHorario, necessarias = ['atividades', 'avaliacoes']) {
  const agendas = { ...(mapa?.agendas || {}) };
  const itens = { ...(mapa?.itens || {}) };
  for (const chave of necessarias) {
    if (agendas[chave]) {
      try {
        await chamar(token, 'GET', `/calendars/${encodeURIComponent(agendas[chave])}`);
        continue;
      } catch (e) {
        if (!(e instanceof ErroGoogle) || (e.status !== 404 && e.status !== 410)) throw e;
      }
      Object.keys(itens).forEach((k) => { if ((itens[k].agenda || 'atividades') === chave) delete itens[k]; });
    }
    const nova = await chamar(token, 'POST', '/calendars', { summary: NOMES_AGENDAS[chave], timeZone: fusoHorario });
    agendas[chave] = nova.id;
  }
  return { ...mapa, agendas, calendarId: agendas.atividades || '', itens };
}

async function emLotes(lista, simultaneos, fn) {
  let i = 0;
  const trabalhadores = Array.from({ length: Math.min(simultaneos, lista.length) }, async () => {
    while (i < lista.length) {
      const atual = lista[i++];
      await fn(atual);
    }
  });
  await Promise.all(trabalhadores);
}

// Executa o plano (remover / criar / atualizar). Altera `mapa.itens` e devolve o resumo.
// A remoção vem primeiro para que "mover" um item de uma agenda para outra funcione (remove e cria de novo).
export async function executarPlano(token, plano, mapa, fusoHorario) {
  const calDe = (agenda) => encodeURIComponent(mapa.agendas?.[agenda || 'atividades'] || mapa.calendarId);
  const resumo = { criados: 0, atualizados: 0, removidos: 0, falhas: [] };

  const criar = async (item) => {
    const ev = await chamar(token, 'POST', `/calendars/${calDe(item.agenda)}/events`, paraEventoGoogle(item, fusoHorario));
    mapa.itens[item.chave] = { eventId: ev.id, assinatura: item.assinatura, categoria: item.categoria, agenda: item.agenda || 'atividades' };
  };

  await emLotes(plano.remover, 4, async ({ chave, eventId, agenda, mover }) => {
    try {
      try {
        await chamar(token, 'DELETE', `/calendars/${calDe(agenda)}/events/${encodeURIComponent(eventId)}`);
      } catch (e) {
        if (!(e instanceof ErroGoogle) || (e.status !== 404 && e.status !== 410)) throw e; // já não existe: ok
      }
      delete mapa.itens[chave];
      if (!mover) resumo.removidos += 1;
    } catch (e) {
      resumo.falhas.push(`${chave}: ${mensagemDeErro(e)}`);
    }
  });

  await emLotes(plano.criar, 4, async (item) => {
    try { await criar(item); resumo.criados += 1; } catch (e) { resumo.falhas.push(`${item.titulo}: ${mensagemDeErro(e)}`); }
  });

  await emLotes(plano.atualizar, 4, async ({ item, eventId }) => {
    try {
      try {
        const ev = await chamar(token, 'PUT', `/calendars/${calDe(item.agenda)}/events/${encodeURIComponent(eventId)}`, paraEventoGoogle(item, fusoHorario));
        mapa.itens[item.chave] = { eventId: ev.id, assinatura: item.assinatura, categoria: item.categoria, agenda: item.agenda || 'atividades' };
      } catch (e) {
        // o evento foi apagado direto no Google: cria de novo
        if (e instanceof ErroGoogle && (e.status === 404 || e.status === 410)) await criar(item);
        else throw e;
      }
      resumo.atualizados += 1;
    } catch (e) {
      resumo.falhas.push(`${item.titulo}: ${mensagemDeErro(e)}`);
    }
  });

  return resumo;
}

// ---------- mapa salvo ----------
const CHAVE_LOCAL = 'google_agenda_local';
const refMapa = (user) => doc(db, 'users', user.uid, 'integracoes', 'googleAgenda');

const normalizarMapa = (d) => {
  const agendas = { ...(d?.agendas || {}) };
  if (!agendas.atividades && d?.calendarId) agendas.atividades = d.calendarId; // mapa antigo: uma agenda só
  return { agendas, calendarId: agendas.atividades || '', itens: d?.itens || {}, opcoes: d?.opcoes || null };
};

export async function carregarMapa(user) {
  try {
    if (user) {
      const snap = await getDoc(refMapa(user));
      return normalizarMapa(snap.exists() ? snap.data() : null);
    }
    return normalizarMapa(JSON.parse(localStorage.getItem(CHAVE_LOCAL) || 'null'));
  } catch (e) {
    console.error('Erro ao ler o mapa do Google Agenda:', e);
    return normalizarMapa(null);
  }
}

// Avisa o resto do app (ex.: botão de sincronização na barra) que o mapa mudou.
export const EVENTO_MAPA = 'roti-na:mapa-atualizado';

export async function salvarMapa(user, mapa) {
  const atual = normalizarMapa(mapa);
  atual.opcoes = mapa.opcoes || null;
  let ok;
  if (user) {
    ok = await salvarDoc(refMapa(user), { agendas: atual.agendas, calendarId: atual.calendarId, itens: atual.itens, opcoes: atual.opcoes, atualizadoEm: new Date().toISOString() });
  } else {
    try {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(atual));
      ok = true;
    } catch {
      ok = false;
    }
  }
  window.dispatchEvent(new CustomEvent(EVENTO_MAPA, { detail: atual }));
  return ok;
}
