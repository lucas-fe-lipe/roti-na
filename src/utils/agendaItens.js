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

/**
 * Retorna { itens, semData }.
 * Cada item: { chave, categoria: 'atividade'|'tarefa'|'avaliacao', assinatura, titulo, descricao,
 *              dtIni: Date, dtFim: Date, diaInteiro: boolean, semanal: { byday, ate: Date } | null, lembreteMin }
 */
export function montarItens({
  atividades = [],
  tarefas = [],
  incluirAtividades = false,
  inicio = '',
  fim = '',
  incluirTarefas = false,
  incluirAvaliacoes = false,
  lembreteMin = 10,
}) {
  const itens = [];
  let semData = 0;
  const lembrete = lembreteMin === '' || lembreteMin === undefined ? null : lembreteMin;

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

        itens.push({
          chave: `atv:${atv.id}:${i}`,
          categoria: 'atividade',
          assinatura: JSON.stringify([atv.nome, atv.apelido, atv.detalhes, h.dia, h.inicio, h.fim, inicio, fim, lembrete]),
          titulo: atv.apelido || atv.nome || 'Atividade',
          descricao: atv.detalhes || '',
          dtIni,
          dtFim,
          diaInteiro: false,
          semanal: { byday: CODIGOS_DIA[chaveDia], ate },
          lembreteMin: lembrete,
        });
      });
    });
  }

  tarefas.forEach((t) => {
    if (ehMarcadorDeAtividade(t) || t.concluida) return;
    const ehAvaliacao = t.tipo === 'avaliacao';
    if (ehAvaliacao ? !incluirAvaliacoes : !incluirTarefas) return;
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
      assinatura: JSON.stringify([titulo, t.data, horario, t.detalhes || '', lembrete]),
      titulo,
      descricao: t.detalhes || '',
      dtIni,
      dtFim,
      diaInteiro: !horario,
      semanal: null,
      lembreteMin: lembrete,
    });
  });

  return { itens, semData };
}
