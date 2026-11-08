// Funções puras de horário (sem React/Firebase), para poderem ser testadas.

// "08:30" -> 510. Sem horário, retorna Infinity (vai para o fim das listas).
export function horaParaMinutos(h) {
  if (!h) return Infinity;
  const [hh, mm] = String(h).split(':');
  const total = Number(hh) * 60 + Number(mm || 0);
  return Number.isNaN(total) ? Infinity : total;
}

// Ordena por horário (campo .min), mantendo a ordem original em empates e itens sem horário no fim.
export function ordenarPorHorario(itens) {
  return itens
    .map((item, indice) => ({ item, indice }))
    .sort((a, b) => {
      const ma = a.item.min;
      const mb = b.item.min;
      if (ma === mb) return a.indice - b.indice;
      if (ma === Infinity) return 1;
      if (mb === Infinity) return -1;
      return ma - mb;
    })
    .map((x) => x.item);
}

// O horário de hoje já passou?
export function horarioJaPassou(horario, agora = new Date()) {
  const min = horaParaMinutos(horario);
  if (min === Infinity) return false;
  const [hh, mm] = String(horario).split(':').map(Number);
  const limite = new Date(agora);
  limite.setHours(hh, mm || 0, 0, 0);
  return limite < agora;
}
