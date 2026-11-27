// Widget de agenda (eventos + tarefas do Google): normaliza, agrupa por dia e abre no app do Google. Funções puras.
import { hojeLocalStr } from './date.js';

const somarDias = (dataStr, n) => {
  const [y, m, d] = dataStr.split('-').map(Number);
  return hojeLocalStr(new Date(y, m - 1, d + n));
};
const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

// Evento do Google Agenda -> itens do widget (evento de dia inteiro com vários dias vira um item por dia)
export function itensDoEvento(ev, agenda = {}, limiteDias = 60) {
  if (!ev || ev.status === 'cancelled') return [];
  if (ev.attendees?.some((a) => a.self && a.responseStatus === 'declined')) return [];
  const base = { tipo: 'evento', id: ev.id, titulo: ev.summary || '(sem título)', link: ev.htmlLink || '', cor: agenda.cor || '', agenda: agenda.nome || '' };
  if (ev.start?.date) {
    const itens = [];
    const fim = ev.end?.date || somarDias(ev.start.date, 1); // o fim do Google é exclusivo
    for (let d = ev.start.date, n = 0; d < fim && n < limiteDias; d = somarDias(d, 1), n += 1) itens.push({ ...base, id: `${ev.id}:${d}`, data: d, diaInteiro: true, hora: '' });
    return itens;
  }
  if (!ev.start?.dateTime) return [];
  const ini = new Date(ev.start.dateTime);
  const fim = ev.end?.dateTime ? new Date(ev.end.dateTime) : null;
  return [{ ...base, data: hojeLocalStr(ini), diaInteiro: false, hora: hhmm(ini), horaFim: fim ? hhmm(fim) : '' }];
}

// Tarefa do Google Tasks -> item (só as que têm data; o Google guarda a data como meia-noite UTC)
export function itemDaTarefa(t, lista = '') {
  if (!t || !t.due || t.status === 'completed') return null;
  return { tipo: 'tarefa', id: t.id, titulo: t.title || '(sem título)', data: String(t.due).slice(0, 10), diaInteiro: true, hora: '', link: t.webViewLink || '', cor: '', agenda: lista };
}

const chaveDoDia = (i) => `${i.diaInteiro ? '0' : '1'}${i.tipo === 'tarefa' ? '0' : '1'}${i.hora}`;
const compararNoDia = (a, b) => (chaveDoDia(a) < chaveDoDia(b) ? -1 : chaveDoDia(a) > chaveDoDia(b) ? 1 : a.titulo.localeCompare(b.titulo, 'pt-BR'));

// { atrasadas (tarefas antes de hoje), hoje, proximas: [{ data, itens }] até "dias" dias à frente }
export function organizarAgenda(itens, hoje, dias = 14) {
  const limite = somarDias(hoje, dias);
  const atrasadas = itens.filter((i) => i.tipo === 'tarefa' && i.data < hoje).sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : compararNoDia(a, b)));
  const doDia = (d) => itens.filter((i) => i.data === d).sort(compararNoDia);
  const datas = Array.from(new Set(itens.filter((i) => i.data > hoje && i.data <= limite).map((i) => i.data))).sort();
  return { atrasadas, hoje: doDia(hoje), proximas: datas.map((data) => ({ data, itens: doDia(data) })) };
}

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export function rotuloDoDia(data, hoje) {
  const [y, m, d] = data.split('-').map(Number);
  const base = `${DIAS[new Date(y, m - 1, d).getDay()]}, ${d} ${MESES[m - 1]}`;
  if (data === hoje) return `Hoje · ${base}`;
  if (data === somarDias(hoje, 1)) return `Amanhã · ${base}`;
  return base;
}

// Link que abre o app do Google no Android (com volta para o site se o app não existir); no resto, o próprio link.
export function linkParaApp(url, agente = '') {
  if (!url) return url;
  if (!/Android/i.test(agente)) return url;
  try {
    const u = new URL(url);
    const pacote = u.host.startsWith('tasks.') ? 'com.google.android.apps.tasks' : 'com.google.android.calendar';
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${pacote};S.browser_fallback_url=${encodeURIComponent(url)};end`;
  } catch { return url; }
}
