// Organização das páginas do menu e dos blocos dentro delas (funções puras, testadas em tests/).
// IDs de página: 'Grade' (Rotina), 'Notas' e 'Treinos'. IDs de bloco: 'grade', 'metas', 'agenda', 'cursos', 'medidas', 'exercicios'.

export const PAGINAS = {
  Grade: { rotulo: 'Rotina' },
  Notas: { rotulo: 'Notas' },
  Treinos: { rotulo: 'Treinos' },
};

export const SECOES = {
  grade: { rotulo: 'Grade horária', origem: 'Grade' },
  metas: { rotulo: 'Metas diárias', origem: 'Grade' },
  agenda: { rotulo: 'Agenda (Google)', origem: 'Grade' },
  cursos: { rotulo: 'Cursos', origem: 'Notas' },
  exercicios: { rotulo: 'Biblioteca de exercícios', origem: 'Treinos' },
  medidas: { rotulo: 'Medidas corporais', origem: 'Treinos' },
};

export const LAYOUT_PADRAO = {
  paginas: ['Grade', 'Notas', 'Treinos'],
  secoes: { Grade: ['grade', 'metas', 'agenda'], Notas: ['cursos'], Treinos: ['exercicios', 'medidas'] },
};

const unico = (lista) => Array.from(new Set(lista));

// Aceita qualquer coisa guardada e devolve um layout completo e válido:
// cada página e cada bloco aparece exatamente uma vez; ids desconhecidos são descartados.
export function normalizarLayout(salvo) {
  const idsPaginas = Object.keys(PAGINAS);
  const idsSecoes = Object.keys(SECOES);

  const paginas = unico([...(Array.isArray(salvo?.paginas) ? salvo.paginas : []).filter((p) => idsPaginas.includes(p)), ...LAYOUT_PADRAO.paginas]);

  const secoes = {};
  paginas.forEach((p) => { secoes[p] = []; });
  const usadas = new Set();
  paginas.forEach((p) => {
    const lista = Array.isArray(salvo?.secoes?.[p]) ? salvo.secoes[p] : [];
    lista.forEach((s) => {
      if (idsSecoes.includes(s) && !usadas.has(s)) { secoes[p].push(s); usadas.add(s); }
    });
  });
  idsSecoes.filter((s) => !usadas.has(s)).forEach((s) => secoes[SECOES[s].origem].push(s));

  return { paginas, secoes };
}

// Move a página para a posição "indice" (contada sem ela na lista).
export function moverPagina(layout, id, indice) {
  const base = normalizarLayout(layout);
  if (!base.paginas.includes(id)) return base;
  const resto = base.paginas.filter((p) => p !== id);
  const i = Math.max(0, Math.min(resto.length, indice));
  resto.splice(i, 0, id);
  return { ...base, paginas: resto };
}

// Move o bloco para a página "paginaDestino", na posição "indice" (contada sem ele na lista).
export function moverSecao(layout, secaoId, paginaDestino, indice) {
  const base = normalizarLayout(layout);
  if (!SECOES[secaoId] || !base.secoes[paginaDestino]) return base;
  const secoes = {};
  base.paginas.forEach((p) => { secoes[p] = base.secoes[p].filter((s) => s !== secaoId); });
  const i = Math.max(0, Math.min(secoes[paginaDestino].length, indice));
  secoes[paginaDestino].splice(i, 0, secaoId);
  return { ...base, secoes };
}

// ---------- o que está ligado ----------
// googleOk: a integração com o Google está configurada neste app (senão o bloco "agenda" não existe)
export function secaoAtiva(config, id, googleOk = true) {
  const b = config?.blocos || {};
  if (id === 'grade') return b.grade !== false;
  if (id === 'metas') return b.metas !== false;
  if (id === 'agenda') return googleOk && !!b.agendaGoogle;
  if (id === 'cursos') return b.cursos !== false;
  if (id === 'medidas') return b.medidas !== false;
  if (id === 'exercicios') return b.exercicios !== false;
  return false;
}

export function paginaLigada(config, id) {
  const p = config?.paginas || {};
  if (id === 'Grade') return p.grade !== false;
  if (id === 'Notas') return p.notas !== false;
  if (id === 'Treinos') return p.treinos !== false;
  return false;
}

export const secoesAtivasDaPagina = (config, id, googleOk = true) =>
  (normalizarLayout(config?.layout).secoes[id] || []).filter((s) => secaoAtiva(config, s, googleOk));

// Página aparece no menu se estiver ligada e tiver ao menos um bloco ativo (página vazia fica desativada).
export const paginaVisivel = (config, id, googleOk = true) =>
  paginaLigada(config, id) && secoesAtivasDaPagina(config, id, googleOk).length > 0;

// Páginas do menu, na ordem escolhida: a primeira é a que abre com o app.
export const paginasVisiveis = (config, googleOk = true) =>
  normalizarLayout(config?.layout).paginas.filter((p) => paginaVisivel(config, p, googleOk));
