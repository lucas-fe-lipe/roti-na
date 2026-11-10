// Medidas corporais: validação, IMC e séries para o gráfico (funções puras, testadas em tests/).

export const EXTRAS = [
  { id: 'pescoco', rotulo: 'Pescoço' },
  { id: 'ombros', rotulo: 'Ombros' },
  { id: 'peito', rotulo: 'Peito' },
  { id: 'bracoD', rotulo: 'Braço direito' },
  { id: 'bracoE', rotulo: 'Braço esquerdo' },
  { id: 'antebraco', rotulo: 'Antebraço' },
  { id: 'cintura', rotulo: 'Cintura' },
  { id: 'abdomen', rotulo: 'Abdômen' },
  { id: 'quadril', rotulo: 'Quadril' },
  { id: 'coxaD', rotulo: 'Coxa direita' },
  { id: 'coxaE', rotulo: 'Coxa esquerda' },
  { id: 'panturrilha', rotulo: 'Panturrilha' },
];

// Aceita "72,5" ou "72.5"; vazio vira null; texto inválido vira NaN
export function numero(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : NaN;
  const t = String(v).trim().replace(',', '.');
  if (t === '') return null;
  return /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export const calcIMC = (pesoKg, alturaCm) => {
  const p = numero(pesoKg), a = numero(alturaCm);
  if (!p || !a || p <= 0 || a <= 0) return null;
  const m = a / 100;
  return p / (m * m);
};

export function classificarIMC(imc) {
  if (imc === null || imc === undefined || !Number.isFinite(imc)) return '';
  if (imc < 18.5) return 'Abaixo do peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  if (imc < 35) return 'Obesidade grau I';
  if (imc < 40) return 'Obesidade grau II';
  return 'Obesidade grau III';
}

export const musculoPercentual = (musculoKg, pesoKg) => {
  const m = numero(musculoKg), p = numero(pesoKg);
  return m && p && p > 0 ? (m / p) * 100 : null;
};

const LIMITES = {
  peso: [20, 400, 'Peso', 'kg'],
  altura: [80, 250, 'Altura', 'cm'],
  gordura: [1, 70, '% de gordura', '%'],
  musculo: [5, 200, 'Massa muscular', 'kg'],
};
const LIMITE_EXTRA = [5, 300];

// Recebe o formulário (textos) e devolve { ok, erro } ou { ok, medida } com números.
export function validarMedida(form, hoje) {
  if (!form?.data || !/^\d{4}-\d{2}-\d{2}$/.test(form.data)) return { ok: false, erro: 'Informe a data da medição.' };
  if (hoje && form.data > hoje) return { ok: false, erro: 'A data não pode ser no futuro.' };

  const medida = { data: form.data, extras: {} };
  for (const [campo, [min, max, nome, un]] of Object.entries(LIMITES)) {
    const n = numero(form[campo]);
    if (Number.isNaN(n)) return { ok: false, erro: `${nome}: digite só números.` };
    if (n !== null && (n < min || n > max)) return { ok: false, erro: `${nome} deve ficar entre ${min} e ${max} ${un}.` };
    medida[campo] = n;
  }
  for (const e of EXTRAS) {
    const n = numero(form.extras?.[e.id]);
    if (Number.isNaN(n)) return { ok: false, erro: `${e.rotulo}: digite só números.` };
    if (n !== null && (n < LIMITE_EXTRA[0] || n > LIMITE_EXTRA[1])) return { ok: false, erro: `${e.rotulo} deve ficar entre ${LIMITE_EXTRA[0]} e ${LIMITE_EXTRA[1]} cm.` };
    if (n !== null) medida.extras[e.id] = n;
  }
  if (medida.peso !== null && medida.musculo !== null && medida.musculo >= medida.peso) {
    return { ok: false, erro: 'A massa muscular não pode ser maior que o peso.' };
  }
  const algo = medida.peso !== null || medida.gordura !== null || medida.musculo !== null || Object.keys(medida.extras).length > 0;
  if (!algo) return { ok: false, erro: 'Preencha pelo menos uma medida.' };
  if (form.obs && String(form.obs).trim()) medida.obs = String(form.obs).trim().slice(0, 300);
  return { ok: true, medida };
}

// Ordena por data (mais antiga primeiro) e calcula IMC e % de músculo; a altura "vale" daí em diante
// (se uma medição não tem altura, usa a última informada antes dela, ou a primeira depois).
export function enriquecer(registros = []) {
  const lista = [...registros].sort((a, b) => (a.data + (a.id || '')).localeCompare(b.data + (b.id || '')));
  let alturaAtual = null;
  const primeiraAltura = lista.find((r) => numero(r.altura) > 0)?.altura ?? null;
  return lista.map((r) => {
    if (numero(r.altura) > 0) alturaAtual = numero(r.altura);
    const altura = alturaAtual ?? numero(primeiraAltura);
    return {
      ...r,
      alturaUsada: altura,
      imc: calcIMC(r.peso, altura),
      musculoPct: musculoPercentual(r.musculo, r.peso),
    };
  });
}

// Linhas do gráfico: IMC, % de gordura e % de massa muscular (todas numa escala parecida, ~10 a 45)
export const SERIES = [
  { id: 'imc', rotulo: 'IMC', unidade: '', cor: '#60a5fa', pegar: (r) => r.imc },
  { id: 'gordura', rotulo: '% de gordura', unidade: '%', cor: '#fbbf24', pegar: (r) => r.gordura },
  { id: 'musculo', rotulo: '% de músculo', unidade: '%', cor: '#34d399', pegar: (r) => r.musculoPct },
];

export function montarSeries(enriquecidos = []) {
  return SERIES.map((s) => ({
    ...s,
    pontos: enriquecidos
      .map((r) => ({ data: r.data, valor: s.pegar(r) }))
      .filter((p) => p.valor !== null && p.valor !== undefined && Number.isFinite(p.valor)),
  }));
}

// Diferença entre os dois últimos valores existentes de uma série (null se só há um)
export function variacao(pontos) {
  if (!pontos || pontos.length < 2) return null;
  return pontos[pontos.length - 1].valor - pontos[pontos.length - 2].valor;
}
