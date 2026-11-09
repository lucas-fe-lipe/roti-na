// Plano de sincronização com o Google Agenda (funções puras, testadas em tests/).

const dois = (n) => String(n).padStart(2, '0');
const fmtLocal = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}:00`;
const fmtDia = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const fmtUTC = (d) => {
  const u = new Date(d.getTime());
  return `${u.getUTCFullYear()}${dois(u.getUTCMonth() + 1)}${dois(u.getUTCDate())}T${dois(u.getUTCHours())}${dois(u.getUTCMinutes())}${dois(u.getUTCSeconds())}Z`;
};

/**
 * mapa = { calendarId, itens: { [chave]: { eventId, assinatura, categoria } } }
 * opcoes = { categorias: ['atividade','tarefa','avaliacao'] (as marcadas), atualizar: bool, remover: bool }
 */
export function calcularPlano(itens, mapa, { categorias = [], atualizar = true, remover = true } = {}) {
  const guardados = mapa?.itens || {};
  const desejadas = new Set(itens.map((i) => i.chave));
  const plano = { criar: [], atualizar: [], remover: [], iguais: 0 };

  itens.forEach((item) => {
    const g = guardados[item.chave];
    if (!g) plano.criar.push(item);
    else if (g.assinatura !== item.assinatura && atualizar) plano.atualizar.push({ item, eventId: g.eventId });
    else plano.iguais += 1;
  });

  if (remover) {
    Object.entries(guardados).forEach(([chave, g]) => {
      // só remove de categorias que estão marcadas nesta sincronização
      if (categorias.includes(g.categoria) && !desejadas.has(chave)) plano.remover.push({ chave, eventId: g.eventId });
    });
  }
  return plano;
}

// Converte um item neutro no recurso "event" da API do Google Calendar.
export function paraEventoGoogle(item, fusoHorario = 'America/Sao_Paulo') {
  const evento = {
    summary: item.titulo,
    description: item.descricao || '',
    extendedProperties: { private: { rotiNaChave: item.chave } },
  };
  if (item.diaInteiro) {
    evento.start = { date: fmtDia(item.dtIni) };
    evento.end = { date: fmtDia(item.dtFim) };
  } else {
    evento.start = { dateTime: fmtLocal(item.dtIni), timeZone: fusoHorario };
    evento.end = { dateTime: fmtLocal(item.dtFim), timeZone: fusoHorario };
  }
  if (item.semanal) evento.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${item.semanal.byday};UNTIL=${fmtUTC(item.semanal.ate)}`];

  if (item.lembreteMin === null || item.lembreteMin === undefined) {
    evento.reminders = { useDefault: false, overrides: [] };
  } else {
    // dia inteiro: 900 min antes da meia-noite = véspera às 09:00
    const minutos = item.diaInteiro ? 900 : Number(item.lembreteMin);
    evento.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: minutos }] };
  }
  return evento;
}
