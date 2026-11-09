// Gera um arquivo .ics (iCalendar) para importar no Google Agenda (ou Apple/Outlook).
// Sem React/Firebase: função pura, testada em tests/.
import { montarItens } from './agendaItens.js';

const doisDigitos = (n) => String(n).padStart(2, '0');
const fmtData = (d) => `${d.getFullYear()}${doisDigitos(d.getMonth() + 1)}${doisDigitos(d.getDate())}`;
const fmtDataHora = (d) => `${fmtData(d)}T${doisDigitos(d.getHours())}${doisDigitos(d.getMinutes())}00`;
const fmtUTC = (d) => {
  const u = new Date(d.getTime());
  return `${u.getUTCFullYear()}${doisDigitos(u.getUTCMonth() + 1)}${doisDigitos(u.getUTCDate())}T${doisDigitos(u.getUTCHours())}${doisDigitos(u.getUTCMinutes())}${doisDigitos(u.getUTCSeconds())}Z`;
};

function escapar(texto) {
  return String(texto ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Linhas do iCalendar têm no máximo 75 bytes; as maiores são "dobradas" com CRLF + espaço.
function dobrar(linha) {
  const codificador = new TextEncoder();
  const partes = [];
  let atual = '';
  let bytes = 0;
  for (const ch of linha) {
    const tam = codificador.encode(ch).length;
    if (bytes + tam > 75) {
      partes.push(atual);
      atual = ' ';
      bytes = 1;
    }
    atual += ch;
    bytes += tam;
  }
  partes.push(atual);
  return partes.join('\r\n');
}

// Evento de dia inteiro: um lembrete na véspera às 09:00 (15 h antes da meia-noite do dia).
function alarmes(lembretes, diaInteiro) {
  const lista = Array.isArray(lembretes) ? lembretes : [];
  if (lista.length === 0) return [];
  const gatilhos = diaInteiro ? ['-PT15H'] : lista.map((m) => `-PT${Number(m)}M`);
  return gatilhos.flatMap((g) => ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', `TRIGGER:${g}`, 'END:VALARM']);
}

export function montarICS({
  exportados = {},
  soNovos = false,
  agora = new Date(),
  fusoHorario = 'America/Sao_Paulo',
  ...opcoes
}) {
  const { itens, semData } = montarItens(opcoes);
  const linhas = [];
  const registros = {};
  const contagem = { atividades: 0, avaliacoes: 0, semData, jaExportados: 0 };
  const carimbo = fmtUTC(agora);

  itens.forEach((it) => {
    if (soNovos && exportados[it.chave] === it.assinatura) {
      contagem.jaExportados += 1;
      return;
    }
    registros[it.chave] = it.assinatura;

    const uid = `roti-na-${it.chave.replace(/^(atv|tar):/, '').replace(/:/g, '-')}@roti-na`;
    linhas.push('BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${carimbo}`);
    if (it.diaInteiro) {
      linhas.push(`DTSTART;VALUE=DATE:${fmtData(it.dtIni)}`, `DTEND;VALUE=DATE:${fmtData(it.dtFim)}`);
    } else {
      linhas.push(`DTSTART;TZID=${fusoHorario}:${fmtDataHora(it.dtIni)}`, `DTEND;TZID=${fusoHorario}:${fmtDataHora(it.dtFim)}`);
    }
    if (it.semanal) linhas.push(`RRULE:FREQ=WEEKLY;BYDAY=${it.semanal.byday};UNTIL=${fmtUTC(it.semanal.ate)}`);
    linhas.push(`SUMMARY:${escapar(it.titulo)}`);
    if (it.descricao) linhas.push(`DESCRIPTION:${escapar(it.descricao)}`);
    linhas.push(...alarmes(it.lembretes, it.diaInteiro), 'END:VEVENT');

    if (it.categoria === 'atividade') contagem.atividades += 1;
    else contagem.avaliacoes += 1;
  });

  const cabecalho = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//roti-na//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:roti-na',
    `X-WR-TIMEZONE:${fusoHorario}`,
  ];
  const texto = [...cabecalho, ...linhas, 'END:VCALENDAR'].map(dobrar).join('\r\n') + '\r\n';
  return { texto, contagem, registros, total: contagem.atividades + contagem.avaliacoes };
}
