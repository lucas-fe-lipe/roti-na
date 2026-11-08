// Gera um arquivo .ics (iCalendar) com atividades, tarefas e avaliações, para importar no Google Agenda.
// Sem React/Firebase: função pura, testada em tests/.
import { horaParaMinutos } from './horario.js';

const CODIGOS_DIA = { DOM: 'SU', SEG: 'MO', TER: 'TU', QUA: 'WE', QUI: 'TH', SEX: 'FR', SAB: 'SA' };
const INDICE_DIA = { DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, SAB: 6 };

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const doisDigitos = (n) => String(n).padStart(2, '0');

export const ehMarcadorDeAtividade = (t) => String(t?.id || '').startsWith('atv-task-');

function paraData(str) {
  const [a, m, d] = String(str).split('-').map(Number);
  return new Date(a, m - 1, d);
}
const fmtData = (d) => `${d.getFullYear()}${doisDigitos(d.getMonth() + 1)}${doisDigitos(d.getDate())}`;
const fmtDataHora = (d) => `${fmtData(d)}T${doisDigitos(d.getHours())}${doisDigitos(d.getMinutes())}00`;
const fmtUTC = (d) => {
  const u = new Date(d.getTime());
  return `${u.getUTCFullYear()}${doisDigitos(u.getUTCMonth() + 1)}${doisDigitos(u.getUTCDate())}T${doisDigitos(u.getUTCHours())}${doisDigitos(u.getUTCMinutes())}${doisDigitos(u.getUTCSeconds())}Z`;
};

function escapar(texto) {
  return String(texto ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Linhas do iCalendar têm no máximo 75 bytes; as maiores são "dobradas" com CRLF + espaço.
function dobrar(linha) {
  const codificador = new TextEncoder();
  const partes = [];
  let atual = '';
  let bytes = 0;
  let limite = 75;
  for (const ch of linha) {
    const tam = codificador.encode(ch).length;
    if (bytes + tam > limite) {
      partes.push(atual);
      atual = ' ';
      bytes = 1;
      limite = 75;
    }
    atual += ch;
    bytes += tam;
  }
  partes.push(atual);
  return partes.join('\r\n');
}

function alarme(minutos, diaInteiro) {
  if (minutos === null || minutos === undefined || minutos === '' || Number(minutos) < 0) return [];
  const gatilho = diaInteiro ? 'PT9H' : `-PT${Number(minutos)}M`; // evento de dia inteiro: avisa às 09:00
  return ['BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:Lembrete', `TRIGGER:${gatilho}`, 'END:VALARM'];
}

export function montarICS({
  atividades = [],
  tarefas = [],
  incluirAtividades = false,
  inicio = '',
  fim = '',
  incluirTarefas = false,
  incluirAvaliacoes = false,
  lembreteMin = 10,
  exportados = {},
  soNovos = false,
  agora = new Date(),
  fusoHorario = 'America/Sao_Paulo',
}) {
  const linhas = [];
  const registros = {};
  const contagem = { atividades: 0, tarefas: 0, avaliacoes: 0, semData: 0, jaExportados: 0 };
  const carimbo = fmtUTC(agora);

  const decidir = (chave, assinatura) => {
    if (soNovos && exportados[chave] === assinatura) {
      contagem.jaExportados += 1;
      return false;
    }
    registros[chave] = assinatura;
    return true;
  };

  // ---- atividades: eventos semanais repetidos entre início e fim ----
  if (incluirAtividades && inicio && fim) {
    const dIni = paraData(inicio);
    const dFim = paraData(fim);
    const ate = new Date(dFim.getFullYear(), dFim.getMonth(), dFim.getDate(), 23, 59, 59);
    atividades.forEach((atv) => {
      (atv.horarios || []).forEach((h, i) => {
        if (!h.inicio || !h.fim) return;
        const chaveDia = semAcento(h.dia);
        if (!(chaveDia in INDICE_DIA)) return;
        const primeira = new Date(dIni);
        while (primeira.getDay() !== INDICE_DIA[chaveDia]) primeira.setDate(primeira.getDate() + 1);
        if (primeira > dFim) return;

        const chave = `atv:${atv.id}:${i}`;
        const assinatura = JSON.stringify([atv.nome, atv.apelido, atv.detalhes, h.dia, h.inicio, h.fim, inicio, fim]);
        if (!decidir(chave, assinatura)) return;

        const [hi, mi] = h.inicio.split(':').map(Number);
        const [hf, mf] = h.fim.split(':').map(Number);
        const dtIni = new Date(primeira.getFullYear(), primeira.getMonth(), primeira.getDate(), hi, mi);
        const dtFim = new Date(primeira.getFullYear(), primeira.getMonth(), primeira.getDate(), hf, mf);
        if (horaParaMinutos(h.fim) <= horaParaMinutos(h.inicio)) dtFim.setDate(dtFim.getDate() + 1); // passa da meia-noite

        linhas.push(
          'BEGIN:VEVENT',
          `UID:roti-na-${atv.id}-${i}@roti-na`,
          `DTSTAMP:${carimbo}`,
          `DTSTART;TZID=${fusoHorario}:${fmtDataHora(dtIni)}`,
          `DTEND;TZID=${fusoHorario}:${fmtDataHora(dtFim)}`,
          `RRULE:FREQ=WEEKLY;BYDAY=${CODIGOS_DIA[chaveDia]};UNTIL=${fmtUTC(ate)}`,
          `SUMMARY:${escapar(atv.apelido || atv.nome || 'Atividade')}`
        );
        if (atv.detalhes) linhas.push(`DESCRIPTION:${escapar(atv.detalhes)}`);
        linhas.push(...alarme(lembreteMin, false), 'END:VEVENT');
        contagem.atividades += 1;
      });
    });
  }

  // ---- tarefas e avaliações com data ----
  tarefas.forEach((t) => {
    if (ehMarcadorDeAtividade(t) || t.concluida) return;
    const ehAvaliacao = t.tipo === 'avaliacao';
    if (ehAvaliacao ? !incluirAvaliacoes : !incluirTarefas) return;
    if (!t.data) {
      contagem.semData += 1;
      return;
    }
    const titulo = t.nome || t.texto || (ehAvaliacao ? 'Avaliação' : 'Tarefa');
    const horario = t.horario || t.hora || '';
    const chave = `tar:${t.id}`;
    const assinatura = JSON.stringify([titulo, t.data, horario, t.detalhes || '']);
    if (!decidir(chave, assinatura)) return;

    const dia = paraData(t.data);
    linhas.push('BEGIN:VEVENT', `UID:roti-na-${t.id}@roti-na`, `DTSTAMP:${carimbo}`);
    if (horario) {
      const [hh, mm] = horario.split(':').map(Number);
      const dtIni = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hh, mm);
      const dtFim = new Date(dtIni.getTime() + 30 * 60000);
      linhas.push(`DTSTART;TZID=${fusoHorario}:${fmtDataHora(dtIni)}`, `DTEND;TZID=${fusoHorario}:${fmtDataHora(dtFim)}`);
    } else {
      const seguinte = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
      linhas.push(`DTSTART;VALUE=DATE:${fmtData(dia)}`, `DTEND;VALUE=DATE:${fmtData(seguinte)}`);
    }
    linhas.push(`SUMMARY:${escapar(titulo)}`);
    if (t.detalhes) linhas.push(`DESCRIPTION:${escapar(t.detalhes)}`);
    linhas.push(...alarme(lembreteMin, !horario), 'END:VEVENT');
    if (ehAvaliacao) contagem.avaliacoes += 1;
    else contagem.tarefas += 1;
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
  return { texto, contagem, registros, total: contagem.atividades + contagem.tarefas + contagem.avaliacoes };
}
