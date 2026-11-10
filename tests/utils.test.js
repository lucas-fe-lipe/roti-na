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
    incluirAtividades: true, inicio: '2026-11-09', fim: '2026-12-14', lembretes: [10], agora: agoraFixo,
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

test('ICS: avaliações com/sem horário e sem data; tarefas comuns, concluídas e marcadores ficam de fora', () => {
  const tarefas = [
    { id: 't1', nome: 'Tarefa comum', data: '2026-11-10', horario: '16:50' },
    { id: 'atv-task-x-2026-11-10-08:00', data: '2026-11-10', concluida: true },
    { id: 'av_1', texto: 'P2 - Cálculo', data: '2026-11-12', hora: '19:00', tipo: 'avaliacao' },
    { id: 'av_2', texto: 'P1 - Física', data: '2026-11-18', tipo: 'avaliacao' },
    { id: 'av_3', texto: 'Sem data', tipo: 'avaliacao' },
    { id: 'av_4', texto: 'Feita', data: '2026-11-10', tipo: 'avaliacao', concluida: true },
  ];
  const r = montarICS({ tarefas, incluirAvaliacoes: true, lembretes: [30], agora: agoraFixo });
  assert.equal(r.contagem.avaliacoes, 2);
  assert.equal(r.contagem.semData, 1);
  assert.match(r.texto, /DTSTART;TZID=America\/Sao_Paulo:20261112T190000/);
  assert.match(r.texto, /DTSTART;VALUE=DATE:20261118/);
  assert.match(r.texto, /TRIGGER:-PT30M/);
  assert.match(r.texto, /TRIGGER:-PT15H/);
  assert.match(r.texto, /SUMMARY:P2 - Cálculo/);
  assert.doesNotMatch(r.texto, /Tarefa comum/);
});

test('ICS: vários lembretes geram vários alarmes (evento com horário)', () => {
  const { texto } = montarICS({
    atividades: [{ id: 'a1', nome: 'Capoeira', horarios: [{ dia: 'SEG', inicio: '19:00', fim: '20:30' }] }],
    incluirAtividades: true, inicio: '2026-11-09', fim: '2026-11-30', lembretes: [60, 30, 10, 5], agora: agoraFixo,
  });
  assert.equal((texto.match(/BEGIN:VALARM/g) || []).length, 3); // no máximo 3
  assert.match(texto, /TRIGGER:-PT5M/);
  assert.match(texto, /TRIGGER:-PT10M/);
  assert.match(texto, /TRIGGER:-PT30M/);
  assert.doesNotMatch(texto, /TRIGGER:-PT60M/); // só os 3 menores entram
});

test('ICS: "só o que ainda não foi exportado" pula itens iguais e reenvia os alterados', () => {
  const tarefas = [{ id: 'av_1', texto: 'A', data: '2026-11-10', hora: '10:00', tipo: 'avaliacao' }];
  const primeira = montarICS({ tarefas, incluirAvaliacoes: true, agora: agoraFixo });
  const igual = montarICS({ tarefas, incluirAvaliacoes: true, soNovos: true, exportados: primeira.registros, agora: agoraFixo });
  assert.equal(igual.total, 0);
  assert.equal(igual.contagem.jaExportados, 1);
  const mudou = montarICS({ tarefas: [{ ...tarefas[0], hora: '11:00' }], incluirAvaliacoes: true, soNovos: true, exportados: primeira.registros, agora: agoraFixo });
  assert.equal(mudou.total, 1);
});

test('ICS: escapa vírgula/ponto e vírgula e dobra linhas longas (75 bytes)', () => {
  const longo = 'a'.repeat(200);
  const { texto } = montarICS({
    tarefas: [{ id: 'av_9', texto: 'Ler; resumir, revisar', data: '2026-11-10', detalhes: longo, tipo: 'avaliacao' }],
    incluirAvaliacoes: true, agora: agoraFixo,
  });
  assert.match(texto, /SUMMARY:Ler\\; resumir\\, revisar/);
  texto.split('\r\n').forEach((l) => assert.ok(new TextEncoder().encode(l).length <= 75, l));
});

import { montarItens, normalizarLembretes, agendaDaCategoria } from '../src/utils/agendaItens.js';
import { calcularPlano, paraEventoGoogle } from '../src/utils/agendaPlano.js';

const base = {
  atividades: [
    { id: 'a1', nome: 'Capoeira', categoria: 'Treinos', horarios: [{ dia: 'SEG', inicio: '19:00', fim: '20:30' }] },
  ],
  tarefas: [
    { id: 't1', nome: 'Tarefa antiga', data: '2026-11-10', horario: '16:50' }, // não existe mais no app: ignorada
    { id: 'av1', texto: 'P2', data: '2026-11-12', tipo: 'avaliacao' },
    { id: 'av2', texto: 'P1', data: '2026-11-13', hora: '08:00', tipo: 'avaliacao' },
  ],
  incluirAtividades: true, inicio: '2026-11-09', fim: '2026-12-14',
  incluirAvaliacoes: true, lembretes: [10],
};
const TODAS = ['atividade', 'avaliacao'];
const mapaDe = (itens) => ({
  agendas: { atividades: 'cal1', avaliacoes: 'cal2' },
  itens: Object.fromEntries(itens.map((i, n) => [i.chave, { eventId: `e${n}`, assinatura: i.assinatura, categoria: i.categoria, agenda: i.agenda }])),
});

test('lembretes: normaliza (texto, repetidos, inválidos, ordem e máximo de 3)', () => {
  assert.deepEqual(normalizarLembretes('30'), [30]);
  assert.deepEqual(normalizarLembretes(''), []);
  assert.deepEqual(normalizarLembretes([60, '30', 30, -5, 'x', 10, 5]), [5, 10, 30]);
  assert.deepEqual(normalizarLembretes(undefined), []);
});

test('itens: atividades vão para a agenda "atividades" e avaliações para "avaliacoes"', () => {
  const { itens } = montarItens(base);
  assert.equal(itens.length, 3);
  assert.deepEqual(itens.map((i) => i.agenda), ['atividades', 'avaliacoes', 'avaliacoes']);
  assert.equal(agendaDaCategoria('avaliacao'), 'avaliacoes');
  assert.equal(agendaDaCategoria('atividade'), 'atividades');
});

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

test('plano: avaliação alterada atualiza, avaliação com nota/excluída remove, nova cria', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  const novo = montarItens({
    ...base,
    tarefas: [
      { id: 'av1', texto: 'P2', data: '2026-11-12', hora: '17:00', tipo: 'avaliacao' }, // mudou
      { id: 'av3', texto: 'P3', data: '2026-11-20', tipo: 'avaliacao' }, // nova
    ], // av2 sumiu (ganhou nota)
  }).itens;
  const p = calcularPlano(novo, mapa, { categorias: TODAS });
  assert.deepEqual(p.atualizar.map((x) => x.item.chave), ['tar:av1']);
  assert.deepEqual(p.remover.map((x) => x.chave), ['tar:av2']);
  assert.equal(p.remover[0].agenda, 'avaliacoes');
  assert.deepEqual(p.criar.map((x) => x.chave), ['tar:av3']);
  assert.equal(p.iguais, 1);
});

test('plano: não remove categorias desmarcadas nem quando "remover" está desligado', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  const semAvaliacoes = montarItens({ ...base, incluirAvaliacoes: false }).itens;
  const p1 = calcularPlano(semAvaliacoes, mapa, { categorias: ['atividade'] });
  assert.equal(p1.remover.length, 0);
  const p2 = calcularPlano([], mapa, { categorias: TODAS, remover: false });
  assert.equal(p2.remover.length, 0);
  const p3 = calcularPlano([], mapa, { categorias: TODAS });
  assert.equal(p3.remover.length, 3);
});

test('plano: eventos "tarefa" antigos sempre são removidos', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  mapa.itens['tar:velha'] = { eventId: 'x', assinatura: 's', categoria: 'tarefa' };
  const p = calcularPlano(itens, mapa, { categorias: TODAS });
  assert.deepEqual(p.remover.map((x) => x.chave), ['tar:velha']);
  assert.equal(p.remover[0].agenda, 'atividades');
});

test('plano: avaliação que estava na agenda única antiga é movida para a agenda de avaliações', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  // mapa antigo: sem campo "agenda" -> tudo na agenda de atividades
  Object.values(mapa.itens).forEach((g) => { delete g.agenda; });
  const p = calcularPlano(itens, mapa, { categorias: TODAS });
  assert.deepEqual(p.remover.map((x) => x.chave).sort(), ['tar:av1', 'tar:av2']);
  assert.ok(p.remover.every((x) => x.mover && x.agenda === 'atividades'));
  assert.deepEqual(p.criar.map((x) => x.chave).sort(), ['tar:av1', 'tar:av2']);
  assert.equal(p.iguais, 1); // a atividade continua onde estava
});

test('plano: "atualizar" desligado só cria o que é novo', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  const alterados = montarItens({ ...base, lembretes: [30] }).itens;
  const p = calcularPlano(alterados, mapa, { categorias: TODAS, atualizar: false });
  assert.equal(p.atualizar.length, 0);
  assert.equal(p.iguais, 3);
});

test('plano: mudar lembretes ou cor atualiza; reabrir com as mesmas opções não muda nada', () => {
  const { itens } = montarItens(base);
  const mapa = mapaDe(itens);
  const igual = montarItens({ ...base, lembretes: normalizarLembretes([10]) }).itens;
  assert.equal(calcularPlano(igual, mapa, { categorias: TODAS }).iguais, 3);
  const doisLembretes = montarItens({ ...base, lembretes: [10, 30] }).itens;
  assert.equal(calcularPlano(doisLembretes, mapa, { categorias: TODAS }).atualizar.length, 3);
  const comCor = montarItens({ ...base, coresAtividade: { Treinos: '8' } }).itens;
  assert.deepEqual(calcularPlano(comCor, mapa, { categorias: TODAS }).atualizar.map((x) => x.item.chave), ['atv:a1:0']);
});

test('evento Google: atividade semanal com cor e 3 lembretes; avaliação com horário e dia inteiro', () => {
  const { itens } = montarItens({ ...base, lembretes: [30, 10, 60], coresAtividade: { Treinos: '8' }, corAvaliacao: '11' });
  const [atv, avHora, avDia] = [itens[0], itens.find((i) => i.chave === 'tar:av2'), itens.find((i) => i.chave === 'tar:av1')];
  const ea = paraEventoGoogle(atv);
  assert.equal(ea.start.dateTime, '2026-11-09T19:00:00');
  assert.equal(ea.end.dateTime, '2026-11-09T20:30:00');
  assert.equal(ea.start.timeZone, 'America/Sao_Paulo');
  assert.deepEqual(ea.recurrence, ['RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261215T025959Z']);
  assert.deepEqual(ea.reminders.overrides, [{ method: 'popup', minutes: 10 }, { method: 'popup', minutes: 30 }, { method: 'popup', minutes: 60 }]);
  assert.equal(ea.colorId, '8');
  assert.equal(ea.extendedProperties.private.rotiNaChave, 'atv:a1:0');
  const eh = paraEventoGoogle(avHora);
  assert.equal(eh.start.dateTime, '2026-11-13T08:00:00');
  assert.equal(eh.end.dateTime, '2026-11-13T08:30:00');
  assert.equal(eh.recurrence, undefined);
  assert.equal(eh.colorId, '11');
  const ev = paraEventoGoogle(avDia);
  assert.deepEqual(ev.start, { date: '2026-11-12' });
  assert.deepEqual(ev.end, { date: '2026-11-13' });
  assert.deepEqual(ev.reminders.overrides, [{ method: 'popup', minutes: 900 }]);
  const sem = paraEventoGoogle({ ...avHora, lembretes: [] });
  assert.deepEqual(sem.reminders, { useDefault: false, overrides: [] });
  const semCor = paraEventoGoogle(montarItens(base).itens[0]);
  assert.equal(semCor.colorId, undefined);
});

import { textoParaFundo } from '../src/utils/cores.js';
import { calcAvaliacoes, calcCRA, minimoDoPeriodo } from '../src/utils/notas.js';
import { montarAbasNotas, gerarXlsx } from '../src/utils/notasPlanilha.js';

test('textoParaFundo: preto em fundo claro, branco em fundo escuro', () => {
  assert.equal(textoParaFundo('#ffffff'), '#000000');
  assert.equal(textoParaFundo('#f6bf26'), '#000000'); // banana
  assert.equal(textoParaFundo('#000000'), '#ffffff');
  assert.equal(textoParaFundo('#3f51b5'), '#ffffff'); // mirtilo
  assert.equal(textoParaFundo('#fff'), '#000000');
  assert.equal(textoParaFundo('inválida'), '#ffffff');
});

test('notas: soma, média, CRA e mínimo do período', () => {
  const avs = [{ max: '30', obtida: '24' }, { max: '30', obtida: '' }, { max: '40', obtida: '20' }];
  const r = calcAvaliacoes(avs, false);
  assert.equal(r.maxTotal, 70);
  assert.equal(r.obtidaTotal, 44);
  assert.ok(Math.abs(r.percentual - 62.857) < 0.01);
  assert.equal(calcAvaliacoes(avs, true).percentual, (80 + 50) / 2);
  const discs = [
    { status: 'Concluída', cargaHoraria: '60', avaliacoes: [{ max: '100', obtida: '80' }] },
    { status: 'Concluída', cargaHoraria: '30', avaliacoes: [{ max: '100', obtida: '50' }] },
    { status: 'Cursando', cargaHoraria: '30', avaliacoes: [] },
  ];
  assert.ok(Math.abs(calcCRA(discs, 'ponderada', true).cra - 70) < 1e-9);
  assert.ok(Math.abs(calcCRA(discs, 'simples', true).cra - 65) < 1e-9);
  assert.equal(minimoDoPeriodo({}), 60);
  assert.equal(minimoDoPeriodo({ minimo: '70' }), 70);
  assert.equal(minimoDoPeriodo({ minimo: '' }), 60);
});

test('planilha de notas: abas, valores e arquivo .xlsx (zip) válido', () => {
  const cursos = [{ nome: 'ADS', periodos: [{ nome: '1º', tipoMedia: 'ponderada', disciplinas: [
    { nome: 'Cálculo & <1>', status: 'Cursando', cargaHoraria: '60', percentualAprovacao: 70, avaliacoes: [{ nome: 'P1', max: '30', obtida: '25' }, { nome: 'P2', max: '30', obtida: '' }] },
  ] }] }];
  const abas = montarAbasNotas(cursos);
  assert.deepEqual(abas.map((a) => a.nome), ['Disciplinas', 'Avaliações', 'Médias']);
  assert.equal(abas[0].linhas[0][9], 83.33);
  assert.equal(abas[0].linhas[0][11], 'Acima do mínimo');
  assert.equal(abas[1].linhas.length, 2);
  const bytes = gerarXlsx(abas);
  assert.equal(bytes[0], 0x50); // "PK"
  assert.equal(bytes[1], 0x4b);
});

import { aprovacaoDe, pontosTotaisDe, resumoDisciplina, coresVermelhas, disciplinaDaAtividade, TONS_VERMELHOS } from '../src/utils/notasStatus.js';

test('aprovação e pontos totais: padrões e valores da disciplina', () => {
  assert.equal(pontosTotaisDe({}), 100);
  assert.equal(pontosTotaisDe({ pontosTotais: 10 }), 10);
  assert.equal(pontosTotaisDe({ pontosTotais: 0 }), 100);
  assert.equal(aprovacaoDe({}, undefined), 60);
  assert.equal(aprovacaoDe({ percentualAprovacao: 70 }, { minimo: 50 }), 70);
  assert.equal(aprovacaoDe({}, { minimo: 50 }), 50); // períodos criados na v13 antiga
  assert.equal(aprovacaoDe({ percentualAprovacao: '' }, {}), 60);
});

test('nota vermelha: critério é o percentual para passar; cada disciplina vermelha ganha um tom', () => {
  const disc = (id, obtida, aprov) => ({ id, status: 'Cursando', percentualAprovacao: aprov, avaliacoes: [{ max: '100', obtida: String(obtida) }] });
  const cursos = [{ id: 'c', periodos: [{ id: 'p', disciplinas: [disc('a', 55, undefined), disc('b', 55, 50), disc('c', 40, 60), { id: 'd', status: 'Cursando', avaliacoes: [] }] }] }];
  const r = resumoDisciplina(cursos[0].periodos[0].disciplinas[0], cursos[0].periodos[0]);
  assert.equal(r.vermelha, true);
  assert.ok(Math.abs(r.preenchimento - 55) < 1e-9);
  const mapa = coresVermelhas(cursos);
  assert.deepEqual(Object.keys(mapa), ['a', 'c']); // b passa com 50%; d não tem notas
  assert.equal(mapa.a, TONS_VERMELHOS[0]);
  assert.equal(mapa.c, TONS_VERMELHOS[1]);
  assert.notEqual(mapa.a, mapa.c);
});

test('disciplinaDaAtividade só considera disciplinas Cursando', () => {
  const cursos = [{ id: 'c', periodos: [{ id: 'p', disciplinas: [
    { id: 'x', status: 'Concluída', atividadeVinculada: 'atv1' },
    { id: 'y', status: 'Cursando', atividadeVinculada: 'atv1' },
  ] }] }];
  assert.equal(disciplinaDaAtividade(cursos, 'atv1').disc.id, 'y');
  assert.equal(disciplinaDaAtividade(cursos, 'outra'), null);
  assert.equal(disciplinaDaAtividade(cursos, ''), null);
});
