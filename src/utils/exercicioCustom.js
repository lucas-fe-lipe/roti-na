// Exercícios criados pelo usuário: validação e uso. Funções puras, testadas em tests/.
import { MUSCULOS, CATEGORIAS, P, S, L } from '../data/exercicios.js';

export const NIVEIS = [0, L, S, P]; // desligado, leve, auxiliar, principal
export const rotuloNivel = (w) => (w >= P ? 'Principal' : w >= S ? 'Auxiliar' : w >= L ? 'Leve' : '—');
// Próximo nível ao tocar no músculo: — → leve → auxiliar → principal → —
export const proximoNivel = (w = 0) => NIVEIS[(NIVEIS.indexOf(w) + 1) % NIVEIS.length] ?? L;

export const LIMITE_CUSTOM = 100;

// form: { nome, cat, m: { musculo: peso } }; outros: lista de exercícios existentes (para nome repetido)
export function validarExercicio(form, outros = [], idAtual = null) {
  const nome = String(form?.nome ?? '').trim().replace(/\s+/g, ' ');
  if (!nome) return { ok: false, erro: 'Dê um nome ao exercício.' };
  if (nome.length > 50) return { ok: false, erro: 'O nome pode ter até 50 caracteres.' };
  if (!CATEGORIAS.includes(form?.cat)) return { ok: false, erro: 'Escolha a categoria.' };
  const m = {};
  Object.entries(form?.m || {}).forEach(([g, w]) => {
    if (MUSCULOS[g] && [L, S, P].includes(Number(w))) m[g] = Number(w);
  });
  if (Object.keys(m).length === 0) return { ok: false, erro: 'Marque pelo menos um músculo trabalhado.' };
  const chave = nome.toLocaleLowerCase('pt-BR');
  if (outros.some((e) => e.id !== idAtual && String(e.nome).toLocaleLowerCase('pt-BR') === chave)) return { ok: false, erro: 'Já existe um exercício com esse nome.' };
  return { ok: true, exercicio: { nome, cat: form.cat, m } };
}

// Quantos treinos e sessões usam o exercício (para avisar antes de excluir)
export function usoDoExercicio(id, treinos = [], sessoes = []) {
  return {
    treinos: treinos.filter((t) => (t.itens || []).some((i) => i.exercicioId === id)).length,
    sessoes: sessoes.filter((s) => (s.itens || []).some((i) => i.exercicioId === id)).length,
  };
}
