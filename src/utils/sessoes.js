// Sessões de treino (o que foi realmente feito): preencher, validar, volume, histórico e evolução.
// Funções puras, testadas em tests/. Uma sessão: { id, treinoId, treinoNome, data, itens: [{ exercicioId, series: [{ reps, carga }] }], obs }.
import { intensidadeDoTreino } from './treino.js';
import { extrasDoItem, setsDoItem } from './treinoModelo.js';

const texto = (v) => (v === null || v === undefined ? '' : String(v));
const primeiroNumero = (reps) => { const m = /^\d{1,3}/.exec(texto(reps).trim()); return m ? m[0] : ''; };
let seq = 0;
const idLinha = () => `s${Date.now().toString(36)}${(seq++).toString(36)}`;

// Formulário de uma nova sessão. Parte da última sessão do mesmo treino (repetições e cargas que você fez);
// sem histórico, usa o que foi planejado no treino (séries × repetições × carga).
export function sessaoInicial(treino, ultima, data) {
  const feitos = new Map((ultima?.itens || []).map((i) => [i.exercicioId, i.series || []]));
  return {
    treinoId: treino.id,
    treinoNome: treino.nome,
    data,
    obs: '',
    itens: (treino.itens || []).map((it) => {
      const anteriores = feitos.get(it.exercicioId);
      const series = anteriores && anteriores.length
        ? anteriores.map((s) => ({ id: idLinha(), reps: texto(s.reps), carga: texto(s.carga) }))
        : (setsDoItem(it).length ? setsDoItem(it) : [{ reps: it.reps, carga: it.carga }]).map((x) => ({ id: idLinha(), reps: primeiroNumero(x.reps), carga: texto(x.carga).split('-')[0] }));
      return { exercicioId: it.exercicioId, series, ...extrasDoItem(it) };
    }),
  };
}

// Converte uma sessão salva de volta para o formulário (textos)
export const sessaoParaForm = (s) => ({
  id: s.id, treinoId: s.treinoId, treinoNome: s.treinoNome, data: s.data, obs: s.obs || '', criadoEm: s.criadoEm,
  itens: (s.itens || []).map((i) => ({ exercicioId: i.exercicioId, ...extrasDoItem(i), series: (i.series || []).map((x) => ({ id: idLinha(), reps: texto(x.reps), carga: texto(x.carga) })) })),
});

// Série sem repetições = não feita (é ignorada). Devolve { ok, erro } ou { ok, sessao }.
export function validarSessao(form, hoje, existe = () => true) {
  if (!form?.data || !/^\d{4}-\d{2}-\d{2}$/.test(form.data)) return { ok: false, erro: 'Informe a data do treino.' };
  if (hoje && form.data > hoje) return { ok: false, erro: 'A data não pode ser no futuro.' };
  const itens = [];
  for (const it of form.itens || []) {
    const series = [];
    for (const s of it.series || []) {
      const r = texto(s.reps).trim();
      const c = texto(s.carga).trim().replace(',', '.');
      if (r === '' && c === '') continue;
      if (!/^\d{1,3}$/.test(r) || Number(r) < 1) return { ok: false, erro: 'As repetições de cada série devem ser um número de 1 a 999 (deixe a série em branco se não fez).' };
      let carga = null;
      if (c !== '') {
        if (!/^\d+(\.\d+)?$/.test(c) || Number(c) > 1000) return { ok: false, erro: 'A carga deve ser um número em kg (até 1000), ou ficar em branco.' };
        carga = Number(c);
      }
      series.push({ reps: Number(r), carga });
    }
    if (series.length && existe(it.exercicioId)) itens.push({ exercicioId: it.exercicioId, series, ...extrasDoItem(it) });
  }
  if (itens.length === 0) return { ok: false, erro: 'Registre pelo menos uma série feita.' };
  const sessao = { treinoId: form.treinoId, treinoNome: form.treinoNome, data: form.data, itens };
  const obs = texto(form.obs).trim().slice(0, 300);
  if (obs) sessao.obs = obs;
  return { ok: true, sessao };
}

// Volume = repetições × carga (kg) somadas. Séries sem carga (peso do corpo) não entram no volume.
export const volumeDaSerie = (s) => (Number(s?.carga) > 0 ? (Number(s.reps) || 0) * Number(s.carga) : 0);
export const volumeDoItem = (item) => (item?.series || []).reduce((t, s) => t + volumeDaSerie(s), 0);
export function resumoSessao(sessao) {
  const itens = sessao?.itens || [];
  return {
    exercicios: itens.length,
    series: itens.reduce((t, i) => t + (i.series || []).length, 0),
    volume: itens.reduce((t, i) => t + volumeDoItem(i), 0),
  };
}

// Avatar do que foi feito de verdade: cada série feita soma o peso do músculo.
export const intensidadesDaSessao = (sessao, achar, modo = 'absoluto') =>
  intensidadeDoTreino((sessao?.itens || []).map((i) => ({ exercicioId: i.exercicioId, series: (i.series || []).length })), achar, modo);

// Sessões de um treino, da mais recente para a mais antiga
export const historicoDoTreino = (sessoes = [], treinoId) =>
  sessoes.filter((s) => s.treinoId === treinoId).sort((a, b) => (b.data + (b.criadoEm || '')).localeCompare(a.data + (a.criadoEm || '')));

// Evolução de um exercício ao longo das sessões (mais antiga primeiro): carga máxima e volume por dia
// Com "variacao" (texto), conta só as sessões feitas nessa variação; sem ela, todas.
export function evolucaoExercicio(sessoes = [], exercicioId, variacao) {
  const porDia = new Map();
  sessoes.forEach((s) => {
    const item = (s.itens || []).find((i) => i.exercicioId === exercicioId && (variacao === undefined || (i.variacao || '') === variacao));
    if (!item || !(item.series || []).length) return;
    const cargas = item.series.map((x) => Number(x.carga) || 0);
    const atual = porDia.get(s.data) || { data: s.data, cargaMax: 0, volume: 0, series: 0 };
    atual.cargaMax = Math.max(atual.cargaMax, ...cargas);
    atual.volume += volumeDoItem(item);
    atual.series += item.series.length;
    porDia.set(s.data, atual);
  });
  return [...porDia.values()].sort((a, b) => a.data.localeCompare(b.data));
}

// Diferença entre os dois últimos pontos (null se só há um)
export function variacaoEvolucao(pontos = [], campo = 'cargaMax') {
  if (pontos.length < 2) return null;
  return pontos[pontos.length - 1][campo] - pontos[pontos.length - 2][campo];
}
