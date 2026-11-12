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
  assert.deepEqual(l.paginas, ['Notas', 'Grade', 'Treinos']);
  assert.deepEqual(l.secoes.Grade, ['metas', 'agenda']);
  assert.deepEqual(l.secoes.Notas, ['grade', 'cursos']); // "cursos" ausente volta para a página de origem
});

test('layout: mover página e mover bloco entre páginas', () => {
  assert.deepEqual(moverPagina(LAYOUT_PADRAO, 'Notas', 0).paginas, ['Notas', 'Grade', 'Treinos']);
  assert.deepEqual(moverPagina(LAYOUT_PADRAO, 'Grade', 5).paginas, ['Notas', 'Treinos', 'Grade']);
  const m = moverSecao(LAYOUT_PADRAO, 'cursos', 'Grade', 1);
  assert.deepEqual(m.secoes.Grade, ['grade', 'cursos', 'metas', 'agenda']);
  assert.deepEqual(m.secoes.Notas, []);
  const reord = moverSecao(LAYOUT_PADRAO, 'agenda', 'Grade', 0);
  assert.deepEqual(reord.secoes.Grade, ['agenda', 'grade', 'metas']);
});

test('layout: página vazia some do menu e a ordem define a primeira página', () => {
  const base = { paginas: { grade: true, notas: true }, blocos: { grade: true, metas: true, cursos: true, agendaGoogle: false }, layout: LAYOUT_PADRAO };
  assert.deepEqual(paginasVisiveis(base), ['Grade', 'Notas', 'Treinos']);
  assert.deepEqual(paginasVisiveis({ ...base, layout: moverPagina(LAYOUT_PADRAO, 'Notas', 0) }), ['Notas', 'Grade', 'Treinos']);
  // "cursos" arrastado para a Rotina: Notas fica vazia e desativada
  const movido = { ...base, layout: moverSecao(LAYOUT_PADRAO, 'cursos', 'Grade', 3) };
  assert.deepEqual(paginasVisiveis(movido), ['Grade', 'Treinos']);
  assert.deepEqual(secoesAtivasDaPagina(movido, 'Grade'), ['grade', 'metas', 'cursos']);
  // agenda só conta com a integração Google configurada
  const comAgenda = { ...base, blocos: { ...base.blocos, agendaGoogle: true } };
  assert.deepEqual(secoesAtivasDaPagina(comAgenda, 'Grade', true), ['grade', 'metas', 'agenda']);
  assert.deepEqual(secoesAtivasDaPagina(comAgenda, 'Grade', false), ['grade', 'metas']);
  // página desligada
  assert.deepEqual(paginasVisiveis({ ...base, paginas: { grade: false, notas: true } }), ['Notas', 'Treinos']);
});

test('barra de notas: pontos distribuídos e obtidos sobre o total', () => {
  const disc = { pontosTotais: 100, avaliacoes: [{ max: '30', obtida: '24' }, { max: '30', obtida: '' }] };
  const r = resumoDisciplina(disc, undefined);
  assert.equal(r.distribuido, 30);
  assert.equal(r.preenchimento, 24);
});

import { numero, calcIMC, classificarIMC, validarMedida, enriquecer, montarSeries, variacao, estimarGordura, estimarMusculo } from '../src/utils/medidas.js';
import { intensidadeDoTreino, corDoMusculo, midiaDoLink, idDoDrive, linkValido, podeSerAdmin, modoAdminAtivo, COR_MUSCULO_PARADO } from '../src/utils/treino.js';
import { EXERCICIOS, MUSCULOS } from '../src/data/exercicios.js';
import { CORPOS } from '../src/data/corpoSvg.js';

test('medidas: números com vírgula, IMC e classificação', () => {
  assert.equal(numero('72,5'), 72.5);
  assert.equal(numero(''), null);
  assert.ok(Number.isNaN(numero('abc')));
  assert.ok(Math.abs(calcIMC(80, 180) - 24.691) < 0.001);
  assert.equal(calcIMC(0, 180), null);
  assert.equal(calcIMC(80, ''), null);
  assert.equal(classificarIMC(17), 'Abaixo do peso');
  assert.equal(classificarIMC(24.9), 'Peso normal');
  assert.equal(classificarIMC(27), 'Sobrepeso');
  assert.equal(classificarIMC(31), 'Obesidade grau I');
  assert.equal(classificarIMC(null), '');
});

test('medidas: validação do formulário', () => {
  const hoje = '2026-11-10';
  assert.equal(validarMedida({ data: '', peso: '70' }, hoje).ok, false);
  assert.equal(validarMedida({ data: '2026-11-11', peso: '70' }, hoje).ok, false); // futuro
  assert.equal(validarMedida({ data: hoje }, hoje).ok, false); // nada preenchido
  assert.equal(validarMedida({ data: hoje, peso: '10' }, hoje).ok, false); // fora do limite
  assert.equal(validarMedida({ data: hoje, peso: '70', musculo: '80' }, hoje).ok, false); // músculo > peso
  assert.equal(validarMedida({ data: hoje, peso: 'x' }, hoje).ok, false);
  const r = validarMedida({ data: hoje, peso: '72,5', altura: '178', gordura: '18', extras: { cintura: '80', peito: '' }, obs: ' ok ' }, hoje);
  assert.equal(r.ok, true);
  assert.deepEqual(r.medida, { data: hoje, extras: { cintura: 80 }, peso: 72.5, altura: 178, abdomen: null, gordura: 18, musculo: null, obs: 'ok' });
  assert.equal(validarMedida({ data: hoje, extras: { cintura: '80' } }, hoje).ok, true); // só uma circunferência já vale
});

test('medidas: altura vale daí em diante; séries do gráfico só com valores existentes', () => {
  const regs = [
    { id: 'b', data: '2026-02-01', peso: 75, altura: null, gordura: 20, musculo: 30 },
    { id: 'a', data: '2026-01-01', peso: 80, altura: 180, gordura: null, musculo: null },
    { id: 'c', data: '2026-03-01', peso: 70, altura: null, gordura: null, musculo: null },
  ];
  const e = enriquecer(regs);
  assert.deepEqual(e.map((r) => r.id), ['a', 'b', 'c']);
  assert.ok(Math.abs(e[1].imc - 75 / 1.8 ** 2) < 1e-9);
  assert.ok(Math.abs(e[1].musculoPct - 40) < 1e-9);
  const s = montarSeries(e);
  assert.deepEqual(s.map((x) => x.pontos.length), [3, 1, 1]);
  assert.equal(variacao(s[0].pontos) < 0, true);
  assert.equal(variacao(s[1].pontos), null);
  // sem nenhuma altura: sem IMC
  assert.equal(enriquecer([{ id: 'x', data: '2026-01-01', peso: 70 }])[0].imc, null);
});

// ---------- medidas simplificadas (altura, peso, barriga) ----------
test('estimarGordura: RFM com altura e barriga; mulher soma 12; limita 3–60', () => {
  assert.ok(Math.abs(estimarGordura('m', 175, 85) - (64 - 20 * (175 / 85))) < 1e-9);
  assert.ok(Math.abs(estimarGordura('f', 165, 80) - (64 - 20 * (165 / 80) + 12)) < 1e-9);
  assert.equal(estimarGordura('m', 180, 40), 3);
  assert.equal(estimarGordura('m', 150, 250) >= 3, true);
  assert.equal(estimarGordura('m', '', 80), null);
  assert.equal(estimarGordura('m', 175, null), null);
});

test('estimarMusculo: fração da massa magra; precisa de peso e gordura', () => {
  assert.ok(Math.abs(estimarMusculo('m', 80, 20) - 80 * 0.8 * 0.54) < 1e-9);
  assert.ok(Math.abs(estimarMusculo('f', 60, 30) - 60 * 0.7 * 0.46) < 1e-9);
  assert.equal(estimarMusculo('m', 80, null), null);
  assert.equal(estimarMusculo('m', '', 20), null);
});

test('enriquecer: estima gordura/músculo; valores digitados têm prioridade; abdômen antigo em extras', () => {
  const [a, b, c] = enriquecer([
    { id: '1', data: '2026-01-01', peso: 80, altura: 175, abdomen: 85 },
    { id: '2', data: '2026-02-01', peso: 79, abdomen: 84, gordura: 18, musculo: 35 },
    { id: '3', data: '2026-03-01', peso: 78, extras: { abdomen: 83 } },
  ], 'm');
  assert.equal(a.gorduraEstimada, true);
  assert.equal(a.musculoEstimado, true);
  assert.ok(Math.abs(a.gorduraUsada - (64 - 20 * (175 / 85))) < 1e-9);
  assert.equal(b.gorduraUsada, 18);
  assert.equal(b.gorduraEstimada, false);
  assert.equal(b.musculoUsado, 35);
  assert.equal(b.musculoEstimado, false);
  assert.equal(c.abdomen, 83); // altura herdada da primeira medição
  assert.equal(c.gorduraEstimada, true);
  const s = montarSeries([a, b, c]).find((x) => x.id === 'gordura');
  assert.equal(s.pontos.length, 3);
});

test('enriquecer: sem barriga não estima; peso+abdômen sozinhos já bastam para validar', () => {
  const [a] = enriquecer([{ id: '1', data: '2026-01-01', peso: 80, altura: 175 }], 'm');
  assert.equal(a.gorduraUsada, null);
  assert.equal(a.musculoUsado, null);
  const r = validarMedida({ data: '2026-01-01', abdomen: '85', extras: {} }, '2026-02-01');
  assert.equal(r.ok, true);
  assert.equal(r.medida.abdomen, 85);
  assert.equal(validarMedida({ data: '2026-01-01', abdomen: '5', extras: {} }, '2026-02-01').ok, false);
});

// ---------- treinos: avatar, intensidade e mídia ----------
test('intensidadeDoTreino: soma séries × peso do músculo; modo absoluto e relativo', () => {
  const achar = (id) => EXERCICIOS.find((e) => e.id === id);
  const itens = [{ exercicioId: 'supino-reto', series: 4 }];
  const abs = intensidadeDoTreino(itens, achar, 'absoluto');
  assert.ok(Math.abs(abs.chest - 0.4) < 1e-9);
  assert.ok(Math.abs(abs.triceps - 0.2) < 1e-9);
  const rel = intensidadeDoTreino(itens, achar, 'relativo');
  assert.equal(rel.chest, 1);
  assert.ok(Math.abs(rel.triceps - 0.5) < 1e-9);
  const cheio = intensidadeDoTreino([{ exercicioId: 'supino-reto', series: 40 }], achar);
  assert.equal(cheio.chest, 1); // satura em 100%
  assert.deepEqual(intensidadeDoTreino([{ exercicioId: 'nao-existe', series: 3 }, { exercicioId: 'supino-reto', series: 0 }], achar), {});
});

test('corDoMusculo: parado = cinza; qualquer intensidade aparece; 1 = cor escolhida', () => {
  assert.equal(corDoMusculo(0), COR_MUSCULO_PARADO);
  assert.equal(corDoMusculo(1, '#ff0000'), '#ff0000');
  assert.notEqual(corDoMusculo(0.05, '#ff0000'), COR_MUSCULO_PARADO);
  assert.equal(corDoMusculo(0.5, 'invalida').length, 7); // cor inválida cai no padrão
});

test('mídia: link do Drive vira imagem direta; link comum é mantido; só https', () => {
  const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz';
  assert.equal(idDoDrive(`https://drive.google.com/file/d/${id}/view?usp=sharing`), id);
  assert.equal(idDoDrive(`https://drive.google.com/open?id=${id}`), id);
  assert.equal(midiaDoLink(`https://drive.google.com/file/d/${id}/view`).img, `https://lh3.googleusercontent.com/d/${id}`);
  assert.equal(midiaDoLink('https://exemplo.com/a.gif').img, 'https://exemplo.com/a.gif');
  assert.equal(midiaDoLink('http://exemplo.com/a.gif'), null);
  assert.equal(linkValido(''), true);
  assert.equal(linkValido('javascript:alert(1)'), false);
});

test('administrador: só a conta autorizada, e só com o modo ligado', () => {
  const lucas = { email: 'Lucasfelipe.NP@gmail.com ' };
  assert.equal(podeSerAdmin(lucas), true);
  assert.equal(podeSerAdmin({ email: 'outra@gmail.com' }), false);
  assert.equal(podeSerAdmin(null), false);
  assert.equal(modoAdminAtivo(lucas, { admin: { ativo: true } }), true);
  assert.equal(modoAdminAtivo(lucas, { admin: { ativo: false } }), false);
  assert.equal(modoAdminAtivo({ email: 'outra@gmail.com' }, { admin: { ativo: true } }), false);
});

test('biblioteca: todo músculo dos exercícios existe no desenho e tem nome; ids únicos', () => {
  const ids = new Set();
  const nosDesenhos = new Set();
  Object.values(CORPOS).forEach((c) => Object.values(c).forEach((v) => v.musculos.forEach((m) => nosDesenhos.add(m.g))));
  EXERCICIOS.forEach((e) => {
    assert.equal(ids.has(e.id), false, `id repetido: ${e.id}`);
    ids.add(e.id);
    assert.ok(Object.keys(e.m).length > 0, `${e.id} sem músculos`);
    Object.entries(e.m).forEach(([g, w]) => {
      assert.ok(MUSCULOS[g], `${e.id}: músculo sem nome ${g}`);
      assert.ok(nosDesenhos.has(g), `${e.id}: músculo ${g} não existe no desenho`);
      assert.ok(w > 0 && w <= 1);
    });
  });
  assert.ok(EXERCICIOS.length >= 50);
  ['m', 'f'].forEach((s) => ['frente', 'costas'].forEach((v) => assert.ok(CORPOS[s][v].musculos.length >= 15)));
});

test('layout: biblioteca de exercícios fica na página Treinos por padrão e liga/desliga', () => {
  const l = normalizarLayout(null);
  assert.deepEqual(l.secoes.Treinos, ['treinos', 'exercicios', 'medidas']);
  assert.equal(secoesAtivasDaPagina({ blocos: { treinos: false } }, 'Treinos', false).includes('treinos'), false);
  assert.equal(secoesAtivasDaPagina({ blocos: { exercicios: false, medidas: true } }, 'Treinos', false).includes('exercicios'), false);
});

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
  const win = {
    saiu: false,
    get tamanho() { return h.length; },
    history: {
      get state() { return h[i].state; },
      pushState(s) { h.splice(i + 1); h.push({ state: s }); i += 1; },
      back() { if (i > 0) { i -= 1; ouvintes.forEach((f) => f({ state: h[i].state })); } else win.saiu = true; },
    },
    addEventListener: (_t, f) => ouvintes.push(f),
  };
  return win;
}

test('voltar: fecha a camada do topo, uma por vez, e não sai do app', () => {
  const win = janelaFalsa();
  const v = criarVoltar(win);
  const fechadas = [];
  v.registrar(() => fechadas.push('pagina'));
  v.registrar(() => fechadas.push('popup'));
  assert.equal(win.tamanho, 2); // uma entrada extra, não uma por camada
  win.history.back();
  assert.deepEqual(fechadas, ['popup']);
  assert.equal(win.saiu, false);
  win.history.back();
  assert.deepEqual(fechadas, ['popup', 'pagina']);
  assert.equal(win.saiu, false);
  assert.equal(v.abertas(), 0);
});

test('voltar: sem camadas abertas (ou fechadas pelo botão do app), voltar sai do app', () => {
  const win = janelaFalsa();
  const v = criarVoltar(win);
  const remover = v.registrar(() => { throw new Error('não deveria fechar'); });
  remover(); // o pop-up foi fechado pelo próprio botão
  win.history.back();
  assert.equal(win.saiu, true);
});

test('voltar: depois de fechar uma camada, a próxima também é capturada', () => {
  const win = janelaFalsa();
  const v = criarVoltar(win);
  let n = 0;
  v.registrar(() => { n += 1; });
  win.history.back();
  v.registrar(() => { n += 10; });
  win.history.back();
  assert.equal(n, 11);
  assert.equal(win.saiu, false);
});

// ---------- treinos montados (modelos) ----------
import { novoItem, validarTreino, resumoTreino, intensidadesDoTreino, musculosMaisTrabalhados, moverItem, ordenarTreinos } from '../src/utils/treinoModelo.js';

test('treino: validação de nome, exercícios, séries, repetições e carga', () => {
  const it = (o = {}) => ({ id: 'i1', exercicioId: 'supino-reto', series: '4', reps: '8-12', carga: '60,5', ...o });
  const ok = validarTreino({ nome: '  Peito  ', itens: [it()] });
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.treino, { nome: 'Peito', itens: [{ id: 'i1', exercicioId: 'supino-reto', series: 4, reps: '8-12', carga: 60.5 }] });
  assert.equal(validarTreino({ nome: '', itens: [it()] }).ok, false);
  assert.equal(validarTreino({ nome: 'X', itens: [] }).ok, false);
  assert.equal(validarTreino({ nome: 'X', itens: [it({ series: '0' })] }).ok, false);
  assert.equal(validarTreino({ nome: 'X', itens: [it({ series: '21' })] }).ok, false);
  assert.equal(validarTreino({ nome: 'X', itens: [it({ reps: 'abc' })] }).ok, false);
  assert.equal(validarTreino({ nome: 'X', itens: [it({ carga: '-5' })] }).ok, false);
  assert.equal(validarTreino({ nome: 'X', itens: [it({ carga: '' })] }).treino.itens[0].carga, null);
  assert.equal(validarTreino({ nome: 'X', itens: [it()] }, () => false).ok, false); // exercício removido da biblioteca
  assert.equal(validarTreino({ nome: 'x'.repeat(61), itens: [it()] }).ok, false);
});

test('treino: novoItem gera ids diferentes; resumo soma séries', () => {
  assert.notEqual(novoItem('a').id, novoItem('a').id);
  assert.deepEqual(resumoTreino({ itens: [{ series: 4 }, { series: 3 }] }), { exercicios: 2, series: 7 });
  assert.deepEqual(resumoTreino(undefined), { exercicios: 0, series: 0 });
});

test('treino: intensidade dos músculos pelo treino todo e ranking', () => {
  const achar = (id) => EXERCICIOS.find((e) => e.id === id);
  const t = { itens: [{ exercicioId: 'supino-reto', series: 4 }, { exercicioId: 'supino-inclinado', series: 4 }] };
  const inten = intensidadesDoTreino(t, achar);
  assert.ok(Math.abs(inten.chest - 0.8) < 1e-9);
  assert.ok(inten.deltoids > 0 && inten.triceps > 0);
  const rank = musculosMaisTrabalhados(inten, 2);
  assert.equal(rank[0][0], 'chest');
  assert.equal(rank.length, 2);
  assert.equal(intensidadesDoTreino(t, achar, 'relativo').chest, 1);
});

test('treino: mover item e ordenar lista', () => {
  const l = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(moverItem(l, 'b', -1).map((x) => x.id), ['b', 'a', 'c']);
  assert.deepEqual(moverItem(l, 'b', 1).map((x) => x.id), ['a', 'c', 'b']);
  assert.deepEqual(moverItem(l, 'a', -1), l); // já é o primeiro
  assert.deepEqual(moverItem(l, 'z', 1), l);
  assert.deepEqual(ordenarTreinos([{ nome: 'A', criadoEm: '2026-01-01' }, { nome: 'B', criadoEm: '2026-02-01' }, { nome: 'C' }]).map((t) => t.nome), ['B', 'A', 'C']);
});

// ---------- sessões de treino (registro do que foi feito) ----------
import { sessaoInicial, sessaoParaForm, validarSessao, volumeDaSerie, resumoSessao, intensidadesDaSessao, historicoDoTreino, evolucaoExercicio, variacaoEvolucao } from '../src/utils/sessoes.js';

const treinoA = { id: 't1', nome: 'A', itens: [{ id: 'i1', exercicioId: 'supino-reto', series: 3, reps: '8-12', carga: 60 }, { id: 'i2', exercicioId: 'crucifixo', series: 2, reps: '12', carga: null }] };

test('sessão: formulário inicial segue o plano; com histórico segue a última sessão', () => {
  const f = sessaoInicial(treinoA, null, '2026-11-11');
  assert.equal(f.itens[0].series.length, 3);
  assert.deepEqual(f.itens[0].series.map((s) => [s.reps, s.carga]), [['8', '60'], ['8', '60'], ['8', '60']]);
  assert.deepEqual(f.itens[1].series.map((s) => [s.reps, s.carga]), [['12', ''], ['12', '']]);
  const ultima = { itens: [{ exercicioId: 'supino-reto', series: [{ reps: 10, carga: 65 }, { reps: 8, carga: 65 }] }] };
  const g = sessaoInicial(treinoA, ultima, '2026-11-12');
  assert.deepEqual(g.itens[0].series.map((s) => [s.reps, s.carga]), [['10', '65'], ['8', '65']]);
  assert.equal(g.itens[1].series.length, 2); // sem histórico desse exercício: volta ao plano
  assert.equal(new Set(f.itens[0].series.map((s) => s.id)).size, 3); // ids únicos
});

test('sessão: validar ignora séries em branco, converte números e barra erros', () => {
  const base = { treinoId: 't1', treinoNome: 'A', data: '2026-11-11', obs: ' boa ', itens: [
    { exercicioId: 'supino-reto', series: [{ reps: '10', carga: '62,5' }, { reps: '', carga: '' }, { reps: '8', carga: '' }] },
    { exercicioId: 'crucifixo', series: [{ reps: '', carga: '' }] },
  ] };
  const r = validarSessao(base, '2026-11-11');
  assert.equal(r.ok, true);
  assert.deepEqual(r.sessao.itens, [{ exercicioId: 'supino-reto', series: [{ reps: 10, carga: 62.5 }, { reps: 8, carga: null }] }]);
  assert.equal(r.sessao.obs, 'boa');
  assert.equal(validarSessao({ ...base, data: '2026-11-12' }, '2026-11-11').ok, false); // futuro
  assert.equal(validarSessao({ ...base, data: '' }, '2026-11-11').ok, false);
  assert.equal(validarSessao({ ...base, itens: [{ exercicioId: 'supino-reto', series: [{ reps: 'x', carga: '' }] }] }, '2026-11-11').ok, false);
  assert.equal(validarSessao({ ...base, itens: [{ exercicioId: 'supino-reto', series: [{ reps: '10', carga: '-3' }] }] }, '2026-11-11').ok, false);
  assert.equal(validarSessao({ ...base, itens: [{ exercicioId: 'supino-reto', series: [{ reps: '', carga: '' }] }] }, '2026-11-11').ok, false); // nada feito
  assert.equal(validarSessao(base, '2026-11-11', () => false).ok, false); // exercício que não existe mais
});

test('sessão: volume, resumo e conversão de volta para o formulário', () => {
  const s = { id: 'x', treinoId: 't1', treinoNome: 'A', data: '2026-11-11', itens: [{ exercicioId: 'supino-reto', series: [{ reps: 10, carga: 60 }, { reps: 8, carga: 60 }] }, { exercicioId: 'flexao', series: [{ reps: 20, carga: null }] }] };
  assert.equal(volumeDaSerie({ reps: 10, carga: 60 }), 600);
  assert.equal(volumeDaSerie({ reps: 20, carga: null }), 0);
  assert.deepEqual(resumoSessao(s), { exercicios: 2, series: 3, volume: 1080 });
  const f = sessaoParaForm(s);
  assert.equal(f.itens[0].series[0].reps, '10');
  assert.equal(f.itens[1].series[0].carga, '');
  assert.equal(validarSessao(f, '2026-11-11').ok, true);
});

test('sessão: avatar pelo que foi feito (séries feitas por exercício)', () => {
  const achar = (id) => EXERCICIOS.find((e) => e.id === id);
  const s = { itens: [{ exercicioId: 'supino-reto', series: [{ reps: 10 }, { reps: 10 }, { reps: 10 }, { reps: 10 }] }] };
  assert.ok(Math.abs(intensidadesDaSessao(s, achar).chest - 0.4) < 1e-9);
});

test('sessão: histórico do treino (mais recente primeiro) e evolução do exercício', () => {
  const sessoes = [
    { id: '1', treinoId: 't1', data: '2026-10-01', itens: [{ exercicioId: 'supino-reto', series: [{ reps: 10, carga: 50 }, { reps: 8, carga: 55 }] }] },
    { id: '2', treinoId: 't2', data: '2026-10-05', itens: [{ exercicioId: 'agachamento', series: [{ reps: 10, carga: 80 }] }] },
    { id: '3', treinoId: 't1', data: '2026-10-15', itens: [{ exercicioId: 'supino-reto', series: [{ reps: 10, carga: 60 }] }] },
  ];
  assert.deepEqual(historicoDoTreino(sessoes, 't1').map((s) => s.id), ['3', '1']);
  const ev = evolucaoExercicio(sessoes, 'supino-reto');
  assert.deepEqual(ev, [{ data: '2026-10-01', cargaMax: 55, volume: 940, series: 2 }, { data: '2026-10-15', cargaMax: 60, volume: 600, series: 1 }]);
  assert.equal(variacaoEvolucao(ev, 'cargaMax'), 5);
  assert.equal(variacaoEvolucao(ev, 'volume'), -340);
  assert.equal(variacaoEvolucao([ev[0]]), null);
  assert.deepEqual(evolucaoExercicio(sessoes, 'nao-existe'), []);
});

// ---------- treino ligado à atividade da grade ----------
import { treinoDaAtividade, modeloAtividadeDoTreino, horariosDoTreino, proximoHorarioDoTreino, rotuloProximo } from '../src/utils/treinoAtividade.js';

const atvsTreino = [
  { id: 'a1', nome: 'Treino A', treinoId: 't1', horarios: [{ dia: 'QUA', inicio: '19:00', fim: '20:00' }, { dia: 'SEG', inicio: '07:00', fim: '08:00' }] },
  { id: 'a2', nome: 'Outro', horarios: [{ dia: 'TER', inicio: '10:00', fim: '11:00' }] },
  { id: 'a3', nome: 'Treino A (sábado)', treinoId: 't1', horarios: [{ dia: 'SÁB', inicio: '09:00', fim: '10:00' }] },
];

test('treino x atividade: encontra o treino ligado e monta o modelo da atividade nova', () => {
  const ts = [{ id: 't1', nome: 'A', itens: [{}, {}] }];
  assert.equal(treinoDaAtividade(ts, atvsTreino[0]).id, 't1');
  assert.equal(treinoDaAtividade(ts, atvsTreino[1]), null);
  assert.equal(treinoDaAtividade(ts, { treinoId: 'apagado' }), null);
  assert.deepEqual(modeloAtividadeDoTreino(ts[0]), { nome: 'A', categoria: 'Treinos', treinoId: 't1', detalhes: '2 exercícios' });
  assert.equal(modeloAtividadeDoTreino({ id: 'x', nome: 'B', itens: [{}] }).detalhes, '1 exercício');
});

test('treino x atividade: horários do treino em ordem de semana; só as atividades ligadas a ele', () => {
  assert.deepEqual(horariosDoTreino(atvsTreino, 't1').map((h) => `${h.dia} ${h.inicio}`), ['SEG 07:00', 'QUA 19:00', 'SÁB 09:00']);
  assert.deepEqual(horariosDoTreino(atvsTreino, 'nenhum'), []);
});

test('treino x atividade: próximo horário (hoje se ainda não começou, senão o seguinte)', () => {
  const quarta1800 = new Date(2026, 10, 11, 18, 0); // 11/11/2026 é quarta-feira
  assert.equal(quarta1800.getDay(), 3);
  const p = proximoHorarioDoTreino(atvsTreino, 't1', quarta1800);
  assert.deepEqual([p.dia, p.inicio, p.emDias], ['QUA', '19:00', 0]);
  assert.equal(rotuloProximo(p), 'hoje às 19:00');
  const quarta2000 = new Date(2026, 10, 11, 20, 0);
  const q = proximoHorarioDoTreino(atvsTreino, 't1', quarta2000);
  assert.deepEqual([q.dia, q.emDias], ['SÁB', 3]);
  assert.equal(rotuloProximo(q), 'SÁB às 09:00');
  const domingo = new Date(2026, 10, 15, 12, 0);
  const r = proximoHorarioDoTreino(atvsTreino, 't1', domingo);
  assert.deepEqual([r.dia, r.emDias], ['SEG', 1]);
  assert.equal(rotuloProximo(r), 'amanhã às 07:00');
  assert.equal(proximoHorarioDoTreino(atvsTreino, 'nenhum', domingo), null);
  assert.equal(rotuloProximo(null), '');
});
