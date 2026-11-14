// Treinos montados pelo usuário (modelos): validação, resumo e intensidade dos músculos. Funções puras, testadas em tests/.
import { intensidadeDoTreino } from './treino.js';

export const LIMITE_ITENS = 40;

let seq = 0;
const idItem = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;
export const novoItem = (exercicioId) => ({ id: idItem(), exercicioId, series: '3', reps: '10', carga: '' });
// Item com séries próprias: sets = [{ reps: '5-7', carga: '20-25' }, ...] (repetições e carga em número ou faixa)
export const novoItemComSets = (exercicioId, sets, extras = {}) => ({ id: idItem(), exercicioId, series: String(sets.length), reps: String(sets[0]?.reps ?? ''), carga: String(sets[0]?.carga ?? ''), sets: sets.map((x) => ({ reps: String(x.reps ?? ''), carga: String(x.carga ?? '') })), ...extras });

const texto = (v) => (v === null || v === undefined ? '' : String(v));
// Séries do item como lista [{ reps, carga }] (textos): usa "sets" se houver; senão repete reps/carga "series" vezes
export const setsDoItem = (it) => (Array.isArray(it?.sets) && it.sets.length
  ? it.sets.map((x) => ({ reps: texto(x.reps), carga: texto(x.carga) }))
  : Array.from({ length: Number(it?.series) || 0 }, () => ({ reps: texto(it?.reps), carga: texto(it?.carga) })));

const comVirgula = (t) => texto(t).replace('.', ',');
// "3 × 10 · 20 kg" (séries iguais agrupadas); séries diferentes ficam separadas por " | "
export function textoSeries(it) {
  const sets = setsDoItem(it);
  const grupos = [];
  sets.forEach((x) => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.reps === x.reps && ultimo.carga === x.carga) ultimo.n += 1;
    else grupos.push({ n: 1, reps: x.reps, carga: x.carga });
  });
  return grupos.map((g) => `${g.n} × ${g.reps}${g.carga ? ` · ${comVirgula(g.carga)} kg` : ''}`).join(' | ');
}

// Valida e normaliza uma série: { ok, set } | { ok:false, erro }
export function validarSet(x) {
  const reps = texto(x?.reps).trim();
  const m = /^(\d{1,3})(?:-(\d{1,3}))?$/.exec(reps);
  if (!m || Number(m[1]) < 1 || (m[2] !== undefined && Number(m[2]) < Number(m[1]))) return { ok: false, erro: 'As repetições devem ser um número (ex.: 10) ou uma faixa (ex.: 5-7).' };
  const c = texto(x?.carga).trim().replace(/,/g, '.').replace(/\s+/g, '');
  if (c === '') return { ok: true, set: { reps, carga: '' } };
  const n = /^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?$/.exec(c);
  if (!n || Number(n[1]) > 1000 || (n[2] !== undefined && (Number(n[2]) > 1000 || Number(n[2]) < Number(n[1])))) return { ok: false, erro: 'O peso deve ser um número em kg (ex.: 20) ou uma faixa (ex.: 20-25), até 1000.' };
  return { ok: true, set: { reps, carga: c } };
}

// Variação (equipamento/execução) e unilateral: só entram no item quando escolhidos
export const extrasDoItem = (it) => {
  const x = {};
  const v = String(it?.variacao ?? '').trim().slice(0, 40);
  if (v) x.variacao = v;
  if (it?.unilateral === true) x.unilateral = true;
  return x;
};

const inteiro = (v) => {
  const t = String(v ?? '').trim();
  return /^\d{1,3}$/.test(t) ? Number(t) : NaN;
};

// Recebe o formulário (textos) e devolve { ok, erro } ou { ok, treino } com números.
export function validarTreino(form, existe = () => true) {
  const nome = String(form?.nome ?? '').trim();
  if (!nome) return { ok: false, erro: 'Dê um nome ao treino.' };
  if (nome.length > 60) return { ok: false, erro: 'O nome do treino pode ter até 60 caracteres.' };
  const itens = Array.isArray(form?.itens) ? form.itens : [];
  if (itens.length === 0) return { ok: false, erro: 'Adicione pelo menos um exercício.' };
  if (itens.length > LIMITE_ITENS) return { ok: false, erro: `Um treino pode ter até ${LIMITE_ITENS} exercícios.` };

  const saida = [];
  for (const it of itens) {
    if (Array.isArray(it.sets) && it.sets.length) {
      if (!existe(it.exercicioId)) return { ok: false, erro: 'Há um exercício que não existe mais na biblioteca. Remova-o e salve de novo.' };
      if (it.sets.length > 20) return { ok: false, erro: 'Cada exercício pode ter até 20 séries.' };
      const sets = [];
      for (const x of it.sets) {
        const r = validarSet(x);
        if (!r.ok) return r;
        sets.push(r.set);
      }
      const primeira = Number(String(sets[0].carga).split('-')[0]);
      saida.push({ id: it.id, exercicioId: it.exercicioId, series: sets.length, reps: sets[0].reps, carga: sets[0].carga === '' ? null : primeira, sets, ...extrasDoItem(it) });
      continue;
    }
    if (!existe(it.exercicioId)) return { ok: false, erro: 'Há um exercício que não existe mais na biblioteca. Remova-o e salve de novo.' };
    const series = inteiro(it.series);
    if (!(series >= 1 && series <= 20)) return { ok: false, erro: 'As séries de cada exercício devem ser de 1 a 20.' };
    const reps = String(it.reps ?? '').trim();
    if (!/^\d{1,3}(-\d{1,3})?$/.test(reps) || Number(reps.split('-')[0]) < 1) return { ok: false, erro: 'As repetições devem ser um número (ex.: 10) ou uma faixa (ex.: 8-12).' };
    const c = String(it.carga ?? '').trim().replace(',', '.');
    let carga = null;
    if (c !== '') {
      carga = Number(c);
      if (!/^\d+(\.\d+)?$/.test(c) || carga > 1000) return { ok: false, erro: 'A carga deve ser um número em kg (até 1000), ou ficar em branco.' };
    }
    saida.push({ id: it.id, exercicioId: it.exercicioId, series, reps, carga, ...extrasDoItem(it) });
  }
  return { ok: true, treino: { nome, itens: saida } };
}

export const resumoTreino = (treino) => {
  const itens = treino?.itens || [];
  return { exercicios: itens.length, series: itens.reduce((s, i) => s + (Number(i.series) || 0), 0) };
};

// Intensidade (0 a 1) de cada músculo no treino. Cada série soma o peso do músculo no exercício.
export function intensidadesDoTreino(treino, achar, modo = 'absoluto') {
  return intensidadeDoTreino((treino?.itens || []).map((i) => ({ exercicioId: i.exercicioId, series: i.series })), achar, modo);
}

// Músculos mais exigidos, do maior para o menor: [[idMusculo, intensidade], ...]
export const musculosMaisTrabalhados = (intensidades, quantos = 4) =>
  Object.entries(intensidades || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, quantos);

// Move o item uma posição para cima (-1) ou para baixo (+1)
export function moverItem(itens = [], id, delta) {
  const i = itens.findIndex((x) => x.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= itens.length) return itens;
  const nova = [...itens];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

// Ordem de exibição: mais recentes primeiro
export const ordenarTreinos = (treinos = []) => [...treinos].sort((a, b) => String(b.criadoEm || '').localeCompare(String(a.criadoEm || '')) || String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
