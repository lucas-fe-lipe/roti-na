// Ordem e linhas das metas diárias (funções puras, testadas em tests/).
// Cada meta pode ter "ordem" (número) e "linha" (1 ou 2). Metas antigas, sem esses campos, mantêm a ordem em que vieram.

export const linhasDe = (config) => (config?.metas?.linhas === 2 ? 2 : 1);

const ordemDe = (m, i) => (Number.isFinite(Number(m.ordem)) && m.ordem !== '' && m.ordem !== null ? Number(m.ordem) : 1e6 + i);

// Todas as metas na ordem escolhida
export function ordenarMetas(metas = []) {
  return metas
    .map((m, i) => ({ m, k: ordemDe(m, i), i }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map((x) => x.m);
}

// [linha1, linha2]. Com 1 linha, tudo fica na primeira.
export function distribuirMetas(metas = [], linhas = 1) {
  const todas = ordenarMetas(metas);
  if (linhas !== 2) return [todas, []];
  return [todas.filter((m) => m.linha !== 2), todas.filter((m) => m.linha === 2)];
}

// Move a meta "id" para a linha "linhaDestino", na posição "indice" (contada sem ela na lista).
// Devolve só as metas que mudaram: [{ id, ordem, linha? }] (linha só vem quando há 2 linhas).
export function moverMeta(metas = [], linhas = 1, id, linhaDestino = 1, indice = 0) {
  const existente = metas.find((m) => m.id === id);
  if (!existente) return [];
  const [l1, l2] = distribuirMetas(metas, linhas).map((l) => l.filter((m) => m.id !== id));
  const destino = linhas === 2 && linhaDestino === 2 ? l2 : l1;
  const i = Math.max(0, Math.min(destino.length, indice));
  destino.splice(i, 0, existente);
  const sequencia = linhas === 2 ? [...l1.map((m) => ({ m, linha: 1 })), ...l2.map((m) => ({ m, linha: 2 }))] : l1.map((m) => ({ m, linha: m.linha }));
  const mudancas = [];
  sequencia.forEach(({ m, linha }, ordem) => {
    const novo = { id: m.id, ordem };
    if (linhas === 2) novo.linha = linha;
    const mudou = Number(m.ordem) !== ordem || m.ordem === undefined || (linhas === 2 && m.linha !== linha);
    if (mudou) mudancas.push(novo);
  });
  return mudancas;
}

// Posição de uma meta nova: no fim da lista (e na última linha, quando há 2).
export function posicaoNovaMeta(metas = [], linhas = 1) {
  const ordens = metas.map((m, i) => ordemDe(m, i));
  const ordem = ordens.length ? Math.max(...ordens.map((o) => (o >= 1e6 ? o - 1e6 : o))) + 1 : 0;
  return linhas === 2 ? { ordem, linha: 2 } : { ordem };
}
