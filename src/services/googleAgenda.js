// Integração com o Google Agenda.
// - Login: Google Identity Services (token de acesso de 1 hora, guardado só na memória).
// - Permissão: calendar.app.created -> o app só enxerga/altera a agenda que ele mesmo criou ("roti-na").
// - O mapa "item do app -> evento do Google" fica em users/{uid}/integracoes/googleAgenda (ou localStorage sem login).
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { salvarDoc } from './db';
import { paraEventoGoogle } from '../utils/agendaPlano';

export const NOME_AGENDA = 'roti-na';
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

// Precisa ser chamada logo após um clique (senão o navegador bloqueia o pop-up).
export async function pedirToken() {
  if (tokenEmMemoria && tokenEmMemoria.expiraEm > Date.now() + 60000) return tokenEmMemoria.valor;
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
        tokenEmMemoria = { valor: resp.access_token, expiraEm: Date.now() + (Number(resp.expires_in) || 3600) * 1000 };
        resolve(resp.access_token);
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

// ---------- agenda "roti-na" ----------
// Garante que a agenda existe na conta da pessoa. Se ela foi apagada no Google, cria outra e zera o mapa.
export async function garantirAgenda(token, mapa, fusoHorario) {
  if (mapa?.calendarId) {
    try {
      await chamar(token, 'GET', `/calendars/${encodeURIComponent(mapa.calendarId)}`);
      return mapa;
    } catch (e) {
      if (!(e instanceof ErroGoogle) || (e.status !== 404 && e.status !== 410)) throw e;
    }
  }
  const nova = await chamar(token, 'POST', '/calendars', { summary: NOME_AGENDA, timeZone: fusoHorario });
  return { calendarId: nova.id, itens: {} };
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

// Executa o plano (criar / atualizar / remover). Altera `mapa.itens` e devolve o resumo.
export async function executarPlano(token, plano, mapa, fusoHorario) {
  const cal = encodeURIComponent(mapa.calendarId);
  const resumo = { criados: 0, atualizados: 0, removidos: 0, falhas: [] };

  const criar = async (item) => {
    const ev = await chamar(token, 'POST', `/calendars/${cal}/events`, paraEventoGoogle(item, fusoHorario));
    mapa.itens[item.chave] = { eventId: ev.id, assinatura: item.assinatura, categoria: item.categoria };
  };

  await emLotes(plano.criar, 4, async (item) => {
    try { await criar(item); resumo.criados += 1; } catch (e) { resumo.falhas.push(`${item.titulo}: ${mensagemDeErro(e)}`); }
  });

  await emLotes(plano.atualizar, 4, async ({ item, eventId }) => {
    try {
      try {
        const ev = await chamar(token, 'PUT', `/calendars/${cal}/events/${encodeURIComponent(eventId)}`, paraEventoGoogle(item, fusoHorario));
        mapa.itens[item.chave] = { eventId: ev.id, assinatura: item.assinatura, categoria: item.categoria };
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

  await emLotes(plano.remover, 4, async ({ chave, eventId }) => {
    try {
      try {
        await chamar(token, 'DELETE', `/calendars/${cal}/events/${encodeURIComponent(eventId)}`);
      } catch (e) {
        if (!(e instanceof ErroGoogle) || (e.status !== 404 && e.status !== 410)) throw e; // já não existe: ok
      }
      delete mapa.itens[chave];
      resumo.removidos += 1;
    } catch (e) {
      resumo.falhas.push(`${chave}: ${mensagemDeErro(e)}`);
    }
  });

  return resumo;
}

// ---------- mapa salvo ----------
const CHAVE_LOCAL = 'google_agenda_local';
const refMapa = (user) => doc(db, 'users', user.uid, 'integracoes', 'googleAgenda');

export async function carregarMapa(user) {
  try {
    if (user) {
      const snap = await getDoc(refMapa(user));
      return snap.exists() ? { calendarId: snap.data().calendarId || '', itens: snap.data().itens || {} } : { calendarId: '', itens: {} };
    }
    const salvo = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || 'null');
    return salvo ? { calendarId: salvo.calendarId || '', itens: salvo.itens || {} } : { calendarId: '', itens: {} };
  } catch (e) {
    console.error('Erro ao ler o mapa do Google Agenda:', e);
    return { calendarId: '', itens: {} };
  }
}

export async function salvarMapa(user, mapa) {
  if (user) return salvarDoc(refMapa(user), { calendarId: mapa.calendarId, itens: mapa.itens, atualizadoEm: new Date().toISOString() });
  try {
    localStorage.setItem(CHAVE_LOCAL, JSON.stringify(mapa));
    return true;
  } catch {
    return false;
  }
}
