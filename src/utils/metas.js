import { hojeLocalStr } from './date';

// "Dia da meta": o dia só vira no horário de reset configurado (ex.: 04:00).
// Antes desse horário, ainda vale o dia anterior. Retorna YYYY-MM-DD.
export function diaDaMeta(agora, horarioReset = '00:00') {
  const [h, m] = String(horarioReset || '00:00').split(':').map(Number);
  const deslocado = new Date(agora.getTime() - ((h || 0) * 60 + (m || 0)) * 60000);
  return hojeLocalStr(deslocado);
}

// Progresso que deve aparecer agora: se o dia da meta já virou, é zero.
export function progressoAtual(meta, agora) {
  const chave = diaDaMeta(agora, meta.horarioReset);
  if (meta.diaReferencia && chave > meta.diaReferencia) return 0;
  return Number(meta.progresso) || 0;
}
