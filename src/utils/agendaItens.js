// Converte atividades, tarefas e avaliações em "itens de agenda" neutros.
// Usado tanto pelo arquivo .ics quanto pela sincronização com o Google Agenda.
import { horaParaMinutos } from './horario.js';

const CODIGOS_DIA = { DOM: 'SU', SEG: 'MO', TER: 'TU', QUA: 'WE', QUI: 'TH', SEX: 'FR', SAB: 'SA' };
const INDICE_DIA = { DOM: 0, SEG: 1, TER: 2, QUA: 3, QUI: 4, SEX: 5, SAB: 6 };

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

export const ehMarcadorDeAtividade = (t) => String(t?.id || '').startsWith('atv-task-');

export function paraData(str) {
  const [a, m, d] = String(str).split('-').map(Number);
  return new Date(a, m - 1, d);
}

// Cores de evento do Google Agenda (colorId 1 a 11). O Google só oferece estas 11 para eventos.
export const CORES_GOOGLE = [
  { id: '1', nome: 'Lavanda', hex: '#7986cb' },
  { id: '2', nome: 'Sálvia', hex: '#33b679' },
  { id: '3', nome: 'Uva', hex: '#8e24aa' },
  { id: '4', nome: 'Flamingo', hex: '#e67c73' },
  { id: '5', nome: 'Banana', hex: '#f6bf26' },
  { id: '6', nome: 'Tangerina', hex: '#f4511e' },
  { id: '7', nome: 'Pavão', hex: '#039be5' },
  { id: '8', nome: 'Grafite', hex: '#616161' },
  { id: '9', nome: 'Mirtilo', hex: '#3f51b5' },
  { id: '10', nome: 'Manjericão', hex: '#0b8043' },
  { id: '11', nome: 'Tomate', hex: '#d50000' },
];

export const MAX_LEMBRETES = 3;

// Aceita número, texto ou lista; devolve a lista de minutos, sem repetições, em ordem, no máximo 3.
export function normalizarLembretes(entrada) {
  const lista = Array.isArray(entrada) ? entrada : (entrada === '' || entrada === null || entrada === undefined ? [] : [entrada]);
  const minutos = lista
    .filter((m) => m !== '' && m !== null && m !== undefined && !Number.isNaN(Number(m)) && Number(m) >= 0)
    .map((m) => Math.round(Number(m)));
  return Array.from(new Set(minutos)).sort((a, b) => a - b).slice(0, MAX_LEMBRETES);
}

// Em qual agenda do Google cada categoria fica.
export const agendaDaCategoria = (categoria) => (categoria === 'avaliacao' ? 'avaliacoes' : 'atividades');

/**
 * Retorna { itens, semData }.
 * Cada item: { chave, categoria: 'atividade'|'avaliacao', agenda: 'atividades'|'avaliacoes', assinatura, titulo, descricao,
 *              dtIni: Date, dtFim: Date, diaInteiro: boolean, semanal: { byday, ate: Date } | null,
 *              lembretes: number[] (minutos), colorId: string }
 * O app não tem mais tarefas: só entram atividades da grade e avaliações da página Notas.
 * coresAtividade: { [categoria da atividade]: colorId }; corAvaliacao: colorId.
 */
export function montarItens({
  atividades = [],
  tarefas = [],
  incluirAtividades = false,
  inicio = '',
  fim = '',
  incluirAvaliacoes = false,
  lembretes,
  lembreteMin = 10, // compatibilidade: um único lembrete
  coresAtividade = {},
  corAvaliacao = '',
}) {
  const itens = [];
  let semData = 0;
  const lista = normalizarLembretes(lembretes !== undefined ? lembretes : lembreteMin);

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

        const [hi, mi] = h.inicio.split(':').map(Number);
        const [hf, mf] = h.fim.split(':').map(Number);
        const dtIni = new Date(primeira.getFullYear(), primeira.getMonth(), primeira.getDate(), hi, mi);
        const dtFim = new Date(primeira.getFullYear(), primeira.getMonth(), primeira.getDate(), hf, mf);
        if (horaParaMinutos(h.fim) <= horaParaMinutos(h.inicio)) dtFim.setDate(dtFim.getDate() + 1); // passa da meia-noite

        const cor = coresAtividade?.[atv.categoria] || '';
        itens.push({
          chave: `atv:${atv.id}:${i}`,
          categoria: 'atividade',
          agenda: 'atividades',
          colorId: cor,
          assinatura: JSON.stringify([atv.nome, atv.apelido, atv.detalhes, h.dia, h.inicio, h.fim, inicio, fim, lista, cor]),
          titulo: atv.apelido || atv.nome || 'Atividade',
          descricao: atv.detalhes || '',
          dtIni,
          dtFim,
          diaInteiro: false,
          semanal: { byday: CODIGOS_DIA[chaveDia], ate },
          lembretes: lista,
        });
      });
    });
  }

  tarefas.forEach((t) => {
    if (ehMarcadorDeAtividade(t) || t.concluida) return;
    if (t.tipo !== 'avaliacao' || !incluirAvaliacoes) return; // tarefas comuns não existem mais no app
    const ehAvaliacao = true;
    if (!t.data) {
      semData += 1;
      return;
    }
    const titulo = t.nome || t.texto || (ehAvaliacao ? 'Avaliação' : 'Tarefa');
    const horario = t.horario || t.hora || '';
    const dia = paraData(t.data);
    let dtIni;
    let dtFim;
    if (horario) {
      const [hh, mm] = horario.split(':').map(Number);
      dtIni = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hh, mm);
      dtFim = new Date(dtIni.getTime() + 30 * 60000);
    } else {
      dtIni = dia;
      dtFim = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1);
    }
    itens.push({
      chave: `tar:${t.id}`,
      categoria: ehAvaliacao ? 'avaliacao' : 'tarefa',
      agenda: 'avaliacoes',
      colorId: corAvaliacao || '',
      assinatura: JSON.stringify([titulo, t.data, horario, t.detalhes || '', lista, corAvaliacao || '']),
      titulo,
      descricao: t.detalhes || '',
      dtIni,
      dtFim,
      diaInteiro: !horario,
      semanal: null,
      lembretes: lista,
    });
  });

  return { itens, semData };
}
