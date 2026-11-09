// Plano de sincronização com o Google Agenda (funções puras, testadas em tests/).

const dois = (n) => String(n).padStart(2, '0');
const fmtLocal = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}:00`;
const fmtDia = (d) => `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}`;
const fmtUTC = (d) => {
  const u = new Date(d.getTime());
  return `${u.getUTCFullYear()}${dois(u.getUTCMonth() + 1)}${dois(u.getUTCDate())}T${dois(u.getUTCHours())}${dois(u.getUTCMinutes())}${dois(u.getUTCSeconds())}Z`;
};

/**
 * mapa = { itens: { [chave]: { eventId, assinatura, categoria, agenda } } }  (agenda: 'atividades' | 'avaliacoes'; ausente = 'atividades')
 * opcoes = { categorias: ['atividade','avaliacao'] (as marcadas), atualizar: bool, remover: bool }
 * Itens guardados na agenda errada (ex.: avaliações que ficavam na agenda única antiga) são movidos:
 * removidos da agenda antiga e criados na nova.
 */
export function calcularPlano(itens, mapa, { categorias = [], atualizar = true, remover = true } = {}) {
  const guardados = mapa?.itens || {};
  const desejadas = new Set(itens.map((i) => i.chave));
  const plano = { criar: [], atualizar: [], remover: [], iguais: 0 };

  itens.forEach((item) => {
    const g = guardados[item.chave];
    if (!g) plano.criar.push(item);
    else if ((g.agenda || 'atividades') !== (item.agenda || 'atividades')) {
      plano.remover.push({ chave: item.chave, eventId: g.eventId, agenda: g.agenda || 'atividades', mover: true });
      plano.criar.push(item);
    } else if (g.assinatura !== item.assinatura && atualizar) plano.atualizar.push({ item, eventId: g.eventId });
    else plano.iguais += 1;
  });

  if (remover) {
    Object.entries(guardados).forEach(([chave, g]) => {
      // só remove de categorias que estão marcadas nesta sincronização
      // 'tarefa' (já não existe no app) sempre sai da agenda
      const limpavel = categorias.includes(g.categoria) || g.categoria === 'tarefa';
      if (limpavel && !desejadas.has(chave)) plano.remover.push({ chave, eventId: g.eventId, agenda: g.agenda || 'atividades' });
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

  const lembretes = Array.isArray(item.lembretes) ? item.lembretes : (item.lembreteMin === null || item.lembreteMin === undefined ? [] : [item.lembreteMin]);
  if (lembretes.length === 0) {
    evento.reminders = { useDefault: false, overrides: [] };
  } else if (item.diaInteiro) {
    // dia inteiro: 900 min antes da meia-noite = véspera às 09:00 (um único aviso)
    evento.reminders = { useDefault: false, overrides: [{ method: 'popup', minutes: 900 }] };
  } else {
    evento.reminders = { useDefault: false, overrides: lembretes.map((m) => ({ method: 'popup', minutes: Number(m) })) };
  }
  if (item.colorId) evento.colorId = String(item.colorId);
  return evento;
}
