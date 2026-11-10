// Regras de "nota vermelha", pontos totais e percentual de aprovação por disciplina.
import { calcAvaliacoes } from './notas.js';

export const PONTOS_PADRAO = 100;
export const APROVACAO_PADRAO = 60;

// Tons de vermelho para diferenciar disciplinas que estão vermelhas ao mesmo tempo.
export const TONS_VERMELHOS = ['#dc2626', '#7f1d1d', '#f43f5e', '#be123c', '#991b1b', '#fb7185'];

const valido = (v, min, max) => {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export const pontosTotaisDe = (disc) => {
  const n = Number(disc?.pontosTotais);
  return Number.isFinite(n) && n > 0 ? n : PONTOS_PADRAO;
};

// percentual para passar: o da disciplina; senão o antigo do período (versões anteriores); senão 60
export const aprovacaoDe = (disc, periodo) =>
  valido(disc?.percentualAprovacao, 0, 100) ?? valido(periodo?.minimo, 0, 100) ?? APROVACAO_PADRAO;

export function resumoDisciplina(disc, periodo) {
  const { maxTotal, obtidaTotal, percentual } = calcAvaliacoes(disc?.avaliacoes || [], disc?.usarMedia);
  const aprovacao = aprovacaoDe(disc, periodo);
  const pontosTotais = pontosTotaisDe(disc);
  return {
    obtida: obtidaTotal,
    avaliado: maxTotal,
    percentual,
    aprovacao,
    pontosTotais,
    temNota: maxTotal > 0,
    vermelha: maxTotal > 0 && percentual < aprovacao,
    // parte da barra preenchida: pontos obtidos sobre os pontos totais da disciplina
    preenchimento: Math.max(0, Math.min(100, (obtidaTotal / pontosTotais) * 100)),
  };
}

// { [idDisciplina]: cor } só das disciplinas com nota vermelha, cada uma com um tom diferente
export function coresVermelhas(cursos = []) {
  const mapa = {};
  let i = 0;
  cursos.forEach((c) => (c.periodos || []).forEach((p) => (p.disciplinas || []).forEach((d) => {
    if (resumoDisciplina(d, p).vermelha) {
      mapa[d.id] = TONS_VERMELHOS[i % TONS_VERMELHOS.length];
      i += 1;
    }
  })));
  return mapa;
}

// Disciplina "Cursando" vinculada a uma atividade
export function disciplinaDaAtividade(cursos = [], atividadeId) {
  if (!atividadeId) return null;
  for (const c of cursos) {
    for (const p of c.periodos || []) {
      for (const d of p.disciplinas || []) {
        if (d.status === 'Cursando' && d.atividadeVinculada === atividadeId) return { curso: c, periodo: p, disc: d };
      }
    }
  }
  return null;
}
