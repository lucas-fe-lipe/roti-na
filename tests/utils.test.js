// Os testes de data usam sempre o fuso de São Paulo, para darem o mesmo resultado em qualquer computador (inclusive no GitHub, que roda em UTC).
process.env.TZ = 'America/Sao_Paulo';
import test from 'node:test';
import assert from 'node:assert/strict';
import { hojeLocalStr } from '../src/utils/date.js';
import { horaParaMinutos, ordenarPorHorario, horarioJaPassou } from '../src/utils/horario.js';
import { diaDaMeta, progressoAtual } from '../src/utils/metas.js';

test('hojeLocalStr usa a data local, não UTC', () => {
  assert.equal(hojeLocalStr(new Date(2026, 10, 8, 23, 30)), '2026-11-08');
  assert.equal(hojeLocalStr(new Date(2026, 0, 5, 0, 5)), '2026-01-05');
});

test('horaParaMinutos', () => {
  assert.equal(horaParaMinutos('08:30'), 510);
  assert.equal(horaParaMinutos('00:00'), 0);
  assert.equal(horaParaMinutos(''), Infinity);
  assert.equal(horaParaMinutos(undefined), Infinity);
  assert.equal(horaParaMinutos('abc'), Infinity);
});

test('ordenarPorHorario: por horário, sem horário no fim, estável em empates', () => {
  const itens = [
    { n: 'sem', min: Infinity },
    { n: 'b', min: 600 },
    { n: 'a1', min: 480 },
    { n: 'a2', min: 480 },
  ];
  assert.deepEqual(ordenarPorHorario(itens).map((i) => i.n), ['a1', 'a2', 'b', 'sem']);
});

test('horarioJaPassou', () => {
  const agora = new Date(2026, 10, 8, 10, 0);
  assert.equal(horarioJaPassou('09:59', agora), true);
  assert.equal(horarioJaPassou('10:00', agora), false);
  assert.equal(horarioJaPassou('10:01', agora), false);
  assert.equal(horarioJaPassou('', agora), false);
});

test('diaDaMeta respeita o horário de reset', () => {
  assert.equal(diaDaMeta(new Date(2026, 10, 9, 1, 30), '04:00'), '2026-11-08');
  assert.equal(diaDaMeta(new Date(2026, 10, 9, 4, 0), '04:00'), '2026-11-09');
  assert.equal(diaDaMeta(new Date(2026, 10, 9, 0, 10), '00:00'), '2026-11-09');
  assert.equal(diaDaMeta(new Date(2026, 10, 9, 3, 59), '04:00'), '2026-11-08');
});

test('progressoAtual zera quando o dia da meta virou', () => {
  const meta = { progresso: 2, horarioReset: '04:00', diaReferencia: '2026-11-08' };
  assert.equal(progressoAtual(meta, new Date(2026, 10, 9, 3, 0)), 2);
  assert.equal(progressoAtual(meta, new Date(2026, 10, 9, 4, 1)), 0);
  assert.equal(progressoAtual({ progresso: 3 }, new Date(2026, 10, 9, 12, 0)), 3); // meta antiga, sem dia de referência
});

import { montarICS } from '../src/utils/ics.js';

const agoraFixo = new Date(Date.UTC(2026, 10, 8, 12, 0, 0));

test('ICS: atividade semanal com recorrência, fuso e lembrete', () => {
  const { texto, contagem } = montarICS({
    atividades: [{ id: 'a1', nome: 'Capoeira', horarios: [{ dia: 'SEG', inicio: '19:00', fim: '20:30' }] }],
    incluirAtividades: true, inicio: '2026-11-09', fim: '2026-12-14', lembreteMin: 10, agora: agoraFixo,
  });
  assert.equal(contagem.atividades, 1);
  assert.match(texto, /DTSTART;TZID=America\/Sao_Paulo:20261109T190000/);
  assert.match(texto, /DTEND;TZID=America\/Sao_Paulo:20261109T203000/);
  assert.match(texto, /RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261215T025959Z/);
  assert.match(texto, /TRIGGER:-PT10M/);
  assert.ok(texto.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(texto.endsWith('END:VCALENDAR\r\n'));
});

test('ICS: primeira ocorrência cai no dia da semana certo (SÁB com acento)', () => {
  const { texto } = montarICS({
    atividades: [{ id: 'a2', nome: 'Explorar', horarios: [{ dia: 'SÁB', inicio: '07:00', fim: '09:00' }] }],
    incluirAtividades: true, inicio: '2026-11-09', fim: '2026-12-31', agora: agoraFixo,
  });
  assert.match(texto, /DTSTART;TZID=America\/Sao_Paulo:20261114T070000/);
  assert.match(texto, /BYDAY=SA/);
});

test('ICS: atividade que passa da meia-noite termina no dia seguinte', () => {
  const { texto } = montarICS({
    atividades: [{ id: 'a3', nome: 'Plantão', horarios: [{ dia: 'SEX', inicio: '22:00', fim: '02:00' }] }],
    incluirAtividades: true, inicio: '2026-11-09', fim: '2026-11-30', agora: agoraFixo,
  });
  assert.match(texto, /DTSTART;TZID=America\/Sao_Paulo:20261113T220000/);
  assert.match(texto, /DTEND;TZID=America\/Sao_Paulo:20261114T020000/);
});

test('ICS: tarefas com horário, sem horário, sem data, concluídas e marcadores', () => {
  const tarefas = [
    { id: 't1', nome: 'Estudar', data: '2026-11-10', horario: '16:50' },
    { id: 't2', nome: 'Nomes', data: '2026-11-18' },
    { id: 't3', nome: 'Sem data' },
    { id: 't4', nome: 'Feita', data: '2026-11-10', concluida: true },
    { id: 'atv-task-x-2026-11-10-08:00', data: '2026-11-10', concluida: true },
    { id: 'av_1', texto: 'P2 - Cálculo', data: '2026-11-12', hora: '19:00', tipo: 'avaliacao' },
  ];
  const r = montarICS({ tarefas, incluirTarefas: true, incluirAvaliacoes: true, lembreteMin: 30, agora: agoraFixo });
  assert.equal(r.contagem.tarefas, 2);
  assert.equal(r.contagem.avaliacoes, 1);
  assert.equal(r.contagem.semData, 1);
  assert.match(r.texto, /DTSTART;TZID=America\/Sao_Paulo:20261110T165000/);
  assert.match(r.texto, /DTSTART;VALUE=DATE:20261118/);
  assert.match(r.texto, /TRIGGER:-PT15H/);
  assert.match(r.texto, /SUMMARY:P2 - Cálculo/);
});

test('ICS: "só o que ainda não foi exportado" pula itens iguais e reenvia os alterados', () => {
  const tarefas = [{ id: 't1', nome: 'A', data: '2026-11-10', horario: '10:00' }];
  const primeira = montarICS({ tarefas, incluirTarefas: true, agora: agoraFixo });
  const igual = montarICS({ tarefas, incluirTarefas: true, soNovos: true, exportados: primeira.registros, agora: agoraFixo });
  assert.equal(igual.total, 0);
  assert.equal(igual.contagem.jaExportados, 1);
  const mudou = montarICS({ tarefas: [{ ...tarefas[0], horario: '11:00' }], incluirTarefas: true, soNovos: true, exportados: primeira.registros, agora: agoraFixo });
  assert.equal(mudou.total, 1);
});

test('ICS: escapa vírgula/ponto e vírgula e dobra linhas longas (75 bytes)', () => {
  const longo = 'a'.repeat(200);
  const { texto } = montarICS({
    tarefas: [{ id: 't9', nome: 'Ler; resumir, revisar', data: '2026-11-10', detalhes: longo }],
    incluirTarefas: true, agora: agoraFixo,
  });
  assert.match(texto, /SUMMARY:Ler\; resumir\\, revisar/);
  texto.split('\r\n').forEach((l) => assert.ok(new TextEncoder().encode(l).length <= 75, l));
});

import { montarItens } from '../src/utils/agendaItens.js';
import { calcularPlano, paraEventoGoogle } from '../src/utils/agendaPlano.js';

const base = {
  atividades: [{ id: 'a1', nome: 'Capoeira', horarios: [{ dia: 'SEG', inicio: '19:00', fim: '20:30' }] }],
  tarefas: [
    { id: 't1', nome: 'Estudar', data: '2026-11-10', horario: '16:50' },
    { id: 'av1', texto: 'P2', data: '2026-11-12', tipo: 'avaliacao' },
  ],
  incluirAtividades: true, inicio: '2026-11-09', fim: '2026-12-14',
  incluirTarefas: true, incluirAvaliacoes: true, lembreteMin: 10,
};
const TODAS = ['atividade', 'tarefa', 'avaliacao'];
const mapaDe = (itens) => ({ calendarId: 'cal', itens: Object.fromEntries(itens.map((i, n) => [i.chave, { eventId: `e${n}`, assinatura: i.assinatura, categoria: i.categoria }])) });

test('plano: primeira sincronização cria tudo', () => {
  const { itens } = montarItens(base);
  const p = calcularPlano(itens, { itens: {} }, { categorias: TODAS });
  assert.equal(p.criar.length, 3);
  assert.equal(p.atualizar.length + p.remover.length + p.iguais, 0);
});

test('plano: nada mudou -> tudo igual', () => {
  const { itens } = montarItens(base);
  const p = calcularPlano(itens, mapaDe(itens), { categorias: TODAS });
  assert.equal(p.iguais, 3);
  assert.equal(p.criar.length + p.atualizar.length + p.remover.length, 0);
});

test('plano: tarefa alterada atualiza, tarefa excluída ou concluída remove, nova cria', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  const novo = montarItens({
    ...base,
    tarefas: [
      { id: 't1', nome: 'Estudar', data: '2026-11-10', horario: '17:00' }, // mudou
      { id: 'av1', texto: 'P2', data: '2026-11-12', tipo: 'avaliacao', concluida: true }, // concluída
      { id: 't2', nome: 'Nova', data: '2026-11-11' }, // nova
    ],
  }).itens;
  const p = calcularPlano(novo, mapa, { categorias: TODAS });
  assert.deepEqual(p.atualizar.map((x) => x.item.chave), ['tar:t1']);
  assert.deepEqual(p.remover.map((x) => x.chave), ['tar:av1']);
  assert.deepEqual(p.criar.map((x) => x.chave), ['tar:t2']);
  assert.equal(p.iguais, 1);
});

test('plano: não remove categorias desmarcadas nem quando "remover" está desligado', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  const semTarefas = montarItens({ ...base, incluirTarefas: false, incluirAvaliacoes: false }).itens;
  const p1 = calcularPlano(semTarefas, mapa, { categorias: ['atividade'] });
  assert.equal(p1.remover.length, 0);
  const p2 = calcularPlano([], mapa, { categorias: TODAS, remover: false });
  assert.equal(p2.remover.length, 0);
  const p3 = calcularPlano([], mapa, { categorias: TODAS });
  assert.equal(p3.remover.length, 3);
});

test('plano: "atualizar" desligado só cria o que é novo', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  const alterados = montarItens({ ...base, lembreteMin: 30 }).itens;
  const p = calcularPlano(alterados, mapa, { categorias: TODAS, atualizar: false });
  assert.equal(p.atualizar.length, 0);
  assert.equal(p.iguais, 3);
});

test('evento Google: atividade semanal, tarefa com horário e dia inteiro', () => {
  const { itens } = montarItens(base);
  const [atv, tar, av] = itens;
  const ea = paraEventoGoogle(atv);
  assert.equal(ea.start.dateTime, '2026-11-09T19:00:00');
  assert.equal(ea.end.dateTime, '2026-11-09T20:30:00');
  assert.equal(ea.start.timeZone, 'America/Sao_Paulo');
  assert.deepEqual(ea.recurrence, ['RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261215T025959Z']);
  assert.deepEqual(ea.reminders.overrides, [{ method: 'popup', minutes: 10 }]);
  assert.equal(ea.extendedProperties.private.rotiNaChave, 'atv:a1:0');
  const et = paraEventoGoogle(tar);
  assert.equal(et.start.dateTime, '2026-11-10T16:50:00');
  assert.equal(et.end.dateTime, '2026-11-10T17:20:00');
  assert.equal(et.recurrence, undefined);
  const ev = paraEventoGoogle(av);
  assert.deepEqual(ev.start, { date: '2026-11-12' });
  assert.deepEqual(ev.end, { date: '2026-11-13' });
  assert.deepEqual(ev.reminders.overrides, [{ method: 'popup', minutes: 900 }]);
  const sem = paraEventoGoogle({ ...tar, lembreteMin: null });
  assert.deepEqual(sem.reminders, { useDefault: false, overrides: [] });
});
