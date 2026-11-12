// Cálculos de notas (usados na página Notas e na exportação da planilha).

const temNota = (v) => v !== '' && v !== undefined && v !== null && !Number.isNaN(Number(v));

// Soma (ou média dos percentuais, se "usarMedia") das avaliações que já têm nota.
export function calcAvaliacoes(avaliacoes = [], usarMedia = false) {
  let maxTotal = 0, obtidaTotal = 0, percentual = 0;

  if (usarMedia && avaliacoes.length > 0) {
    let somaPercentuais = 0;
    let count = 0;
    avaliacoes.forEach((a) => {
      if (temNota(a.obtida) && temNota(a.max) && Number(a.max) > 0) {
        somaPercentuais += (Number(a.obtida) / Number(a.max)) * 100;
        count++;
      }
    });
    percentual = count > 0 ? somaPercentuais / count : 0;
    maxTotal = 100;
    obtidaTotal = percentual;
  } else {
    avaliacoes.forEach((a) => {
      if (temNota(a.obtida)) {
        maxTotal += Number(a.max) || 0;
        obtidaTotal += Number(a.obtida) || 0;
      }
    });
    percentual = maxTotal > 0 ? (obtidaTotal / maxTotal) * 100 : 0;
  }

  const cappedMax = Math.min(100, maxTotal);
  const cappedObtida = Math.min(100, obtidaTotal);
  const notaBase = cappedMax > 0 ? (cappedObtida / cappedMax) * 100 : 0;

  return { maxTotal, obtidaTotal, percentual, notaBase };
}

// Média (ponderada pela carga horária ou simples) de uma lista de disciplinas.
export function calcCRA(disciplinas = [], tipoMedia, isGeral = false) {
  let somaNotas = 0, somaPesos = 0, hasNotas = false;
  disciplinas.forEach((d) => {
    if (isGeral && (d.status === 'A Cursar' || d.status === 'Cursando')) return;

    const { maxTotal, notaBase } = calcAvaliacoes(d.avaliacoes, d.usarMedia);
    if (!isGeral && maxTotal === 0 && (d.status === 'A Cursar' || d.status === 'Cursando')) return;

    if (maxTotal > 0) hasNotas = true;
    const peso = tipoMedia === 'ponderada' ? (Number(d.cargaHoraria) || 1) : 1;
    somaNotas += notaBase * peso;
    somaPesos += peso;
  });
  return { cra: somaPesos > 0 ? somaNotas / somaPesos : 0, hasNotas };
}

// Nota mínima do período (padrão 60%).
export function minimoDoPeriodo(periodo) {
  const n = Number(periodo?.minimo);
  return periodo?.minimo !== undefined && periodo?.minimo !== '' && Number.isFinite(n) ? n : 60;
}
