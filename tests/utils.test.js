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

const cursosPlanilha = [{ nome: 'ADS', periodos: [
  { nome: '1º período', disciplinas: [
    { nome: 'Cálculo & <1>', professor: 'Hernan Roberto', status: 'Cursando', cargaHoraria: '60', avaliacoes: [
      { nome: 'P1', max: '30', obtida: '25', data: '2026-03-10', hora: '19:00' },
      { nome: 'P2', max: '30', obtida: '', data: '2026-05-02' },
    ] },
    { nome: 'Lógica', status: 'Concluída', avaliacoes: [] },
  ] },
  { nome: '2º período', disciplinas: [] },
] }];

test('planilha de notas: uma aba por período, com a estrutura pedida', () => {
  const abas = montarAbasNotas(cursosPlanilha);
  assert.deepEqual(abas.map((a) => a.nome), ['ADS - 1º período', 'ADS - 2º período']);
  const t = abas[0].linhas.map((l) => l.c.map((c) => c.v));
  assert.equal(t[0][0], 'ADS — 1º período');
  assert.deepEqual(t[1].slice(0, 4), ['Disciplina', 'Distribuídos', 'Obtido', '%']);
  assert.deepEqual(t[2].slice(0, 4), ['Cálculo & <1> (60h)\nHernan Roberto', 30, 25, 83.33]);
  assert.deepEqual(abas[0].linhas[2].c.slice(0, 4).map((c) => c.e), ['pretoTexto', 'pretoNum', 'pretoNum', 'pretoPct']);
  assert.deepEqual(t[3], ['P1', 30, 25, 83.33, '10/03/2026 19:00']);
  assert.deepEqual(t[4], ['P2', 30, null, null, '02/05/2026']); // sem nota: nota e % vazios
  // depois das avaliações, volta o cabeçalho para a próxima disciplina
  assert.equal(t[5][0], 'Disciplina');
  assert.equal(t[6][0], 'Lógica'); // sem carga nem professor: uma linha só
  assert.deepEqual(t[6].slice(1, 4), [0, 0, null]);
  assert.equal(abas[0].linhas[6].alt, 20);
  assert.equal(abas[0].linhas[2].alt, 32);
  assert.equal(abas[1].linhas[1].c[0].v, 'Nenhuma disciplina neste período.');
});

test('planilha de notas: nomes de aba válidos e únicos; sem períodos gera aba de aviso; .xlsx é um zip', () => {
  const longo = 'x'.repeat(40);
  const abas = montarAbasNotas([{ nome: 'A/B', periodos: [{ nome: 'P:1', disciplinas: [] }, { nome: 'P:1', disciplinas: [] }, { nome: longo, disciplinas: [] }] }]);
  assert.equal(abas[0].nome, 'A B - P 1');
  assert.equal(abas[2].nome, 'A B - ' + 'x'.repeat(20));
  assert.equal(abas[1].nome, 'A B - P 1 (2)');
  assert.ok(abas.every((a) => a.nome.length <= 31 && !/[[\]:*?/\\]/.test(a.nome)));
  assert.equal(montarAbasNotas([]).length, 1);
  const bytes = gerarXlsx(montarAbasNotas(cursosPlanilha));
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

import { normalizarLayout, moverPagina, moverSecao, paginasVisiveis, secoesAtivasDaPagina, LAYOUT_PADRAO } from '../src/utils/layout.js';

test('layout: normalizar completa, remove repetidos e ids desconhecidos', () => {
  assert.deepEqual(normalizarLayout(undefined), LAYOUT_PADRAO);
  const l = normalizarLayout({ paginas: ['Notas', 'X', 'Notas'], secoes: { Grade: ['metas', 'metas', 'lixo'], Notas: ['grade'] } });
  assert.deepEqual(l.paginas, ['Notas', 'Grade']);
  assert.deepEqual(l.secoes.Grade, ['metas', 'agenda']);
  assert.deepEqual(l.secoes.Notas, ['grade', 'cursos']); // "cursos" ausente volta para a página de origem
});

test('layout: mover página e mover bloco entre páginas', () => {
  assert.deepEqual(moverPagina(LAYOUT_PADRAO, 'Notas', 0).paginas, ['Notas', 'Grade']);
  assert.deepEqual(moverPagina(LAYOUT_PADRAO, 'Grade', 5).paginas, ['Notas', 'Grade']);
  assert.deepEqual(normalizarLayout({ paginas: ['Treinos', 'Notas'] }).paginas, ['Notas', 'Grade']); // página removida é ignorada
  const m = moverSecao(LAYOUT_PADRAO, 'cursos', 'Grade', 1);
  assert.deepEqual(m.secoes.Grade, ['grade', 'cursos', 'metas', 'agenda']);
  assert.deepEqual(m.secoes.Notas, []);
  const reord = moverSecao(LAYOUT_PADRAO, 'agenda', 'Grade', 0);
  assert.deepEqual(reord.secoes.Grade, ['agenda', 'grade', 'metas']);
});

test('layout: página vazia some do menu e a ordem define a primeira página', () => {
  const base = { paginas: { grade: true, notas: true }, blocos: { grade: true, metas: true, cursos: true, agendaGoogle: false }, layout: LAYOUT_PADRAO };
  assert.deepEqual(paginasVisiveis(base), ['Grade', 'Notas']);
  assert.deepEqual(paginasVisiveis({ ...base, layout: moverPagina(LAYOUT_PADRAO, 'Notas', 0) }), ['Notas', 'Grade']);
  // "cursos" arrastado para a Rotina: Notas fica vazia e desativada
  const movido = { ...base, layout: moverSecao(LAYOUT_PADRAO, 'cursos', 'Grade', 3) };
  assert.deepEqual(paginasVisiveis(movido), ['Grade']);
  assert.deepEqual(secoesAtivasDaPagina(movido, 'Grade'), ['grade', 'metas', 'cursos']);
  // agenda só conta com a integração Google configurada
  const comAgenda = { ...base, blocos: { ...base.blocos, agendaGoogle: true } };
  assert.deepEqual(secoesAtivasDaPagina(comAgenda, 'Grade', true), ['grade', 'metas', 'agenda']);
  assert.deepEqual(secoesAtivasDaPagina(comAgenda, 'Grade', false), ['grade', 'metas']);
  // página desligada
  assert.deepEqual(paginasVisiveis({ ...base, paginas: { grade: false, notas: true } }), ['Notas']);
});

test('barra de notas: pontos distribuídos e obtidos sobre o total', () => {
  const disc = { pontosTotais: 100, avaliacoes: [{ max: '30', obtida: '24' }, { max: '30', obtida: '' }] };
  const r = resumoDisciplina(disc, undefined);
  assert.equal(r.distribuido, 30);
  assert.equal(r.preenchimento, 24);
});

// ---------- medidas simplificadas (altura, peso, barriga) ----------
// ---------- treinos: avatar, intensidade e mídia ----------
// ---------- metas diárias: ordem e linhas ----------
import { linhasDe, ordenarMetas, distribuirMetas, moverMeta, posicaoNovaMeta } from '../src/utils/metasLayout.js';
import { criarVoltar } from '../src/utils/voltar.js';

const M = (id, extra = {}) => ({ id, titulo: id, meta: 1, ...extra });

test('metas: linhasDe aceita só 1 ou 2; metas antigas (sem ordem) mantêm a ordem em que vieram', () => {
  assert.equal(linhasDe({}), 1);
  assert.equal(linhasDe({ metas: { linhas: 2 } }), 2);
  assert.equal(linhasDe({ metas: { linhas: 5 } }), 1);
  assert.deepEqual(ordenarMetas([M('a'), M('b'), M('c', { ordem: 0 })]).map((m) => m.id), ['c', 'a', 'b']);
});

test('metas: com 1 linha tudo fica na primeira; com 2, separa por "linha" (padrão 1)', () => {
  const ms = [M('a', { ordem: 0, linha: 2 }), M('b', { ordem: 1 }), M('c', { ordem: 2, linha: 2 })];
  assert.deepEqual(distribuirMetas(ms, 1).map((l) => l.map((m) => m.id)), [['a', 'b', 'c'], []]);
  assert.deepEqual(distribuirMetas(ms, 2).map((l) => l.map((m) => m.id)), [['b'], ['a', 'c']]);
});

test('metas: mover dentro da mesma linha e para a outra linha; devolve só o que mudou', () => {
  const ms = [M('a', { ordem: 0, linha: 1 }), M('b', { ordem: 1, linha: 1 }), M('c', { ordem: 2, linha: 2 })];
  assert.deepEqual(moverMeta(ms, 2, 'b', 1, 0), [{ id: 'b', ordem: 0, linha: 1 }, { id: 'a', ordem: 1, linha: 1 }]);
  const noutra = moverMeta(ms, 2, 'a', 2, 0);
  assert.deepEqual(noutra.map((x) => x.id).sort(), ['a', 'b', 'c'].filter((id) => noutra.some((x) => x.id === id)));
  assert.equal(noutra.find((x) => x.id === 'a').linha, 2);
  assert.equal(noutra.find((x) => x.id === 'a').ordem, 1);
  assert.equal(moverMeta(ms, 2, 'nao-existe', 1, 0).length, 0);
  // com 1 linha não grava "linha"
  assert.ok(moverMeta([M('a', { ordem: 0 }), M('b', { ordem: 1 })], 1, 'b', 1, 0).every((x) => !('linha' in x)));
});

test('metas: meta nova vai para o fim (e para a linha 2 quando há duas)', () => {
  assert.deepEqual(posicaoNovaMeta([], 1), { ordem: 0 });
  assert.deepEqual(posicaoNovaMeta([M('a', { ordem: 0 }), M('b', { ordem: 4 })], 2), { ordem: 5, linha: 2 });
  assert.deepEqual(posicaoNovaMeta([M('a'), M('b')], 1), { ordem: 2 }); // antigas, sem ordem
});

// ---------- botão voltar do celular ----------
function janelaFalsa() {
  const h = [{ state: null }];
  let i = 0;
  const ouvintes = [];
  const emitir = () => ouvintes.forEach((f) => f({ state: h[i].state }));
  const win = {
    saiu: false,
    get tamanho() { return h.length; },
    get posicao() { return i; },
    history: {
      get state() { return h[i].state; },
      pushState(s) { h.splice(i + 1); h.push({ state: s }); i += 1; },
      back() { if (i > 0) { i -= 1; emitir(); } else win.saiu = true; },
      go(n) { i = Math.max(0, i + n); emitir(); },
    },
    addEventListener: (_t, f) => ouvintes.push(f),
  };
  return win;
}
const sync = (f) => f();

test('voltar: fecha a camada do topo, uma por vez, e não sai do app', () => {
  const win = janelaFalsa();
  const v = criarVoltar(win, sync);
  const fechadas = [];
  v.registrar(() => fechadas.push('pagina'));
  v.registrar(() => fechadas.push('popup'));
  assert.equal(win.tamanho, 3); // uma entrada por camada, criada ao abrir (com o toque do usuário)
  win.history.back();
  assert.deepEqual(fechadas, ['popup']);
  assert.equal(win.saiu, false);
  win.history.back();
  assert.deepEqual(fechadas, ['popup', 'pagina']);
  assert.equal(win.saiu, false);
  assert.equal(v.abertas(), 0);
  assert.equal(win.posicao, 0);
  win.history.back(); // agora sim: sai do app
  assert.equal(win.saiu, true);
});

test('voltar: camada fechada pelo botão do app não deixa entrada sobrando', () => {
  const win = janelaFalsa();
  const v = criarVoltar(win, sync);
  const remover = v.registrar(() => { throw new Error('não deveria fechar'); });
  remover(); // o pop-up foi fechado pelo próprio botão
  assert.equal(win.posicao, 0);
  win.history.back();
  assert.equal(win.saiu, true);
});

test('voltar: menu esquerdo → Dados → Exportar: cada voltar fecha uma camada e o último sai', () => {
  const win = janelaFalsa();
  const v = criarVoltar(win, sync);
  const fechadas = [];
  v.registrar(() => fechadas.push('menu'));
  const removerDados = v.registrar(() => fechadas.push('dados'));
  removerDados(); // Exportar fecha "Dados" pelo botão e abre o próprio modal
  v.registrar(() => fechadas.push('exportar'));
  win.history.back();
  win.history.back();
  assert.deepEqual(fechadas, ['exportar', 'menu']);
  assert.equal(win.saiu, false);
  win.history.back();
  assert.equal(win.saiu, true);
});

test('voltar: depois de fechar uma camada, a próxima também é capturada', () => {
  const win = janelaFalsa();
  const v = criarVoltar(win, sync);
  let n = 0;
  v.registrar(() => { n += 1; });
  win.history.back();
  v.registrar(() => { n += 10; });
  win.history.back();
  assert.equal(n, 11);
  assert.equal(win.saiu, false);
});

// ---------- treinos montados (modelos) ----------
// ---------- sessões de treino (registro do que foi feito) ----------
const treinoA = { id: 't1', nome: 'A', itens: [{ id: 'i1', exercicioId: 'supino-reto', series: 3, reps: '8-12', carga: 60 }, { id: 'i2', exercicioId: 'crucifixo', series: 2, reps: '12', carga: null }] };

// ---------- treino ligado à atividade da grade ----------
const atvsTreino = [
  { id: 'a1', nome: 'Treino A', treinoId: 't1', horarios: [{ dia: 'QUA', inicio: '19:00', fim: '20:00' }, { dia: 'SEG', inicio: '07:00', fim: '08:00' }] },
  { id: 'a2', nome: 'Outro', horarios: [{ dia: 'TER', inicio: '10:00', fim: '11:00' }] },
  { id: 'a3', nome: 'Treino A (sábado)', treinoId: 't1', horarios: [{ dia: 'SÁB', inicio: '09:00', fim: '10:00' }] },
];

test('ICS: inclui VTIMEZONE quando há horário e separa por agenda', () => {
  const base = {
    atividades: [{ id: 'a1', nome: 'Capoeira', horarios: [{ dia: 'SEG', inicio: '19:00', fim: '20:30' }] }],
    tarefas: [{ id: 't1', nome: 'Prova', tipo: 'avaliacao', data: '2026-11-20', hora: '19:00' }],
    incluirAtividades: true, incluirAvaliacoes: true, inicio: '2026-11-09', fim: '2026-12-14', agora: agoraFixo,
  };
  const todos = montarICS(base);
  assert.match(todos.texto, /BEGIN:VTIMEZONE\r\nTZID:America\/Sao_Paulo\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:-0300\r\nTZOFFSETTO:-0300/);
  const at = montarICS({ ...base, soAgenda: 'atividades' });
  assert.equal(at.contagem.atividades, 1);
  assert.equal(at.contagem.avaliacoes, 0);
  assert.match(at.texto, /X-WR-CALNAME:roti-na\r\n/);
  const av = montarICS({ ...base, soAgenda: 'avaliacoes' });
  assert.equal(av.contagem.atividades, 0);
  assert.match(av.texto, /X-WR-CALNAME:roti-na avaliações/);
});

test('planilha de notas: notas abaixo da aprovação ficam vermelhas, como no app', () => {
  const abas = montarAbasNotas([{ nome: 'C', periodos: [{ nome: 'P', disciplinas: [
    { nome: 'D', percentualAprovacao: 60, avaliacoes: [{ nome: 'A', max: '10', obtida: '3' }, { nome: 'B', max: '10', obtida: '9' }] },
    { nome: 'E', percentualAprovacao: 60, avaliacoes: [{ nome: 'A', max: '10', obtida: '8' }] },
  ] }] }]);
  const est = (i) => abas[0].linhas[i].c.map((c) => c.e);
  assert.deepEqual(est(2).slice(1, 4), ['pretoNum', 'pretoNum', 'pretoPct']); // D: 60% = aprovada
  assert.deepEqual(est(3).slice(2, 4), ['numVerm', 'pctVerm']); // 30% < 60%
  assert.deepEqual(est(4).slice(2, 4), ['num', 'pct']);
  assert.deepEqual(est(6).slice(1, 4), ['pretoNum', 'pretoNum', 'pretoPct']);
  const verm = montarAbasNotas([{ nome: 'C', periodos: [{ nome: 'P', disciplinas: [{ nome: 'D', percentualAprovacao: 70, avaliacoes: [{ nome: 'A', max: '10', obtida: '5' }] }] }] }]);
  assert.deepEqual(verm[0].linhas[2].c.slice(2, 4).map((c) => c.e), ['pretoNumVerm', 'pretoPctVerm']);
});

import { itensDoEvento, itemDaTarefa, organizarAgenda, rotuloDoDia, linkParaApp } from '../src/utils/agendaWidget.js';
test('widget: eventos com horário, dia inteiro (vários dias) e recusados', () => {
  const t = itensDoEvento({ id: 'e1', summary: 'Aula', start: { dateTime: '2026-11-27T13:30:00-03:00' }, end: { dateTime: '2026-11-27T15:00:00-03:00' }, htmlLink: 'https://x' }, { nome: 'Pessoal' });
  assert.equal(t.length, 1);
  assert.equal(t[0].hora, '13:30'); assert.equal(t[0].horaFim, '15:00'); assert.equal(t[0].data, '2026-11-27');
  const d = itensDoEvento({ id: 'e2', summary: 'Viagem', start: { date: '2026-11-28' }, end: { date: '2026-11-31'.replace('31', '30') } });
  assert.deepEqual(d.map((i) => i.data), ['2026-11-28', '2026-11-29']);
  assert.deepEqual(itensDoEvento({ id: 'e3', status: 'cancelled' }), []);
  assert.deepEqual(itensDoEvento({ id: 'e4', summary: 'x', start: { dateTime: '2026-11-27T10:00:00-03:00' }, attendees: [{ self: true, responseStatus: 'declined' }] }), []);
});
test('widget: tarefa só com data e não concluída; atrasadas, hoje e próximas em ordem', () => {
  assert.equal(itemDaTarefa({ id: 't', title: 'x' }), null);
  assert.equal(itemDaTarefa({ id: 't', title: 'x', due: '2026-11-20T00:00:00.000Z', status: 'completed' }), null);
  const tar = (id, due, title) => itemDaTarefa({ id, title, due: `${due}T00:00:00.000Z`, status: 'needsAction' });
  const ev = (id, data, hora, diaInteiro = false) => ({ tipo: 'evento', id, titulo: id, data, hora, diaInteiro });
  const itens = [tar('velha', '2026-11-20', 'Velha'), tar('hoje-t', '2026-11-27', 'Tarefa hoje'), ev('tarde', '2026-11-27', '15:00'), ev('manha', '2026-11-27', '08:00'), ev('dia', '2026-11-27', '', true), tar('amanha', '2026-11-28', 'Amanhã'), ev('longe', '2026-12-30', '10:00'), ev('ontem', '2026-11-26', '10:00')];
  const o = organizarAgenda(itens, '2026-11-27', 14);
  assert.deepEqual(o.atrasadas.map((i) => i.id), ['velha']); // evento passado não é "atrasado"
  assert.deepEqual(o.hoje.map((i) => i.id), ['hoje-t', 'dia', 'manha', 'tarde']);
  assert.deepEqual(o.proximas.map((p) => p.data), ['2026-11-28']);
});
test('widget: rótulos de dia e link para o app do Google', () => {
  assert.equal(rotuloDoDia('2026-11-27', '2026-11-27'), 'Hoje · sex, 27 nov');
  assert.equal(rotuloDoDia('2026-11-28', '2026-11-27'), 'Amanhã · sáb, 28 nov');
  assert.equal(rotuloDoDia('2026-12-02', '2026-11-27'), 'qua, 2 dez');
  const a = linkParaApp('https://www.google.com/calendar/event?eid=abc', 'Mozilla/5.0 (Linux; Android 14)');
  assert.ok(a.startsWith('intent://www.google.com/calendar/event?eid=abc#Intent;scheme=https;package=com.google.android.calendar;'));
  assert.ok(linkParaApp('https://tasks.google.com/task/xyz', 'Android').includes('com.google.android.apps.tasks'));
  assert.equal(linkParaApp('https://x.com/a', 'iPhone'), 'https://x.com/a');
});

import { ordenarDisciplinas } from '../src/utils/notasStatus.js';
import { linkAbrirAppAgenda } from '../src/utils/agendaWidget.js';
test('disciplinas: cursando, reprovadas, a cursar, concluídas; ordem de cadastro dentro do grupo', () => {
  const d = (id, status) => ({ id, status });
  const o = ordenarDisciplinas([d('a', 'Concluída'), d('b', 'A Cursar'), d('c', 'Reprovado por falta'), d('d', 'Cursando'), d('e', 'Concluída'), d('f', 'Reprovado'), d('g', 'Cursando'), d('h', undefined)]);
  assert.deepEqual(o.map((x) => x.id), ['d', 'g', 'c', 'f', 'b', 'h', 'a', 'e']);
  assert.deepEqual(ordenarDisciplinas(undefined), []);
});
test('abrir o app do Google Agenda: Android por pacote, iPhone por esquema, resto o site', () => {
  const site = 'https://calendar.google.com/calendar/u/0/r/agenda';
  const a = linkAbrirAppAgenda(site, 'Mozilla/5.0 (Linux; Android 14)');
  assert.ok(a.startsWith('intent:#Intent;') && a.includes('package=com.google.android.calendar') && a.includes(encodeURIComponent(site)));
  assert.equal(linkAbrirAppAgenda(site, 'iPhone'), 'googlecalendar://');
  assert.equal(linkAbrirAppAgenda(site, 'Windows'), site);
});

import { avatarSeguro } from '../src/utils/defaultAvatars.js';
test('avatar: só imagem do app, https ou JPEG em base64 pequeno', () => {
  assert.ok(avatarSeguro('/roti-na/avatar1.png'));
  assert.ok(avatarSeguro('https://exemplo.com/a.png'));
  assert.ok(avatarSeguro('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ=='));
  assert.ok(!avatarSeguro('data:image/svg+xml;base64,PHN2Zz4='));
  assert.ok(!avatarSeguro('data:text/html;base64,PGI+'));
  assert.ok(!avatarSeguro('javascript:alert(1)'));
  assert.ok(!avatarSeguro(`data:image/jpeg;base64,${'A'.repeat(200000)}`));
  assert.ok(!avatarSeguro(null));
});
