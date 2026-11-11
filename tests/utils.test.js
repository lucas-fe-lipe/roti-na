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
  assert.ok(l.secoes.Treinos.includes('exercicios'));
  assert.equal(secoesAtivasDaPagina({ blocos: { exercicios: false, medidas: true } }, 'Treinos', false).includes('exercicios'), false);
});
