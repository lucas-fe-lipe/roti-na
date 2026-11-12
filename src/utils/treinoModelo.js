// Treinos montados pelo usuário (modelos): validação, resumo e intensidade dos músculos. Funções puras, testadas em tests/.
import { intensidadeDoTreino } from './treino.js';

export const LIMITE_ITENS = 40;

let seq = 0;
export const novoItem = (exercicioId) => ({ id: `${Date.now().toString(36)}${(seq++).toString(36)}`, exercicioId, series: '3', reps: '10', carga: '' });

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
    saida.push({ id: it.id, exercicioId: it.exercicioId, series, reps, carga });
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
