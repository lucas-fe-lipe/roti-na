// Tipos de treino (força, cardio, outro): faixas, validação, resumo e estimativa de calorias.
// Funções puras, testadas em tests/.
import { validarTreino, setsDoItem } from './treinoModelo.js';

export const TIPOS = {
  forca: { nome: 'Força', desc: 'Musculação, calistenia, crossfit, funcional…' },
  cardio: { nome: 'Cardio', desc: 'Caminhada, corrida, pedal, nado…' },
  outro: { nome: 'Outro', desc: 'Pilates, fisioterapia, basquete…' },
};
export const tipoDe = (t) => (TIPOS[t?.tipo] ? t.tipo : 'forca'); // treinos antigos não têm "tipo": são de força

// met = gasto de energia (MET) típico; kmh = velocidade média usada só quando falta a duração
export const MODALIDADES = {
  corrida: { nome: 'Corrida', met: 9.8, kmh: 9 },
  caminhada: { nome: 'Caminhada', met: 3.8, kmh: 5 },
  bike: { nome: 'Bike', met: 7.5, kmh: 16 },
  trilha: { nome: 'Trilha', met: 6, kmh: 4 },
  'trilha-bike': { nome: 'Trilha de bike', met: 8.5, kmh: 12 },
  nado: { nome: 'Nado', met: 6, kmh: 2 },
  outra: { nome: 'Outra', met: 6, kmh: 6 },
};
export const INTENSIDADES = { leve: { nome: 'Leve', met: 3 }, moderada: { nome: 'Moderada', met: 5 }, intensa: { nome: 'Intensa', met: 8 } };
export const UNIDADES_DIST = { km: 'km', m: 'm', mi: 'milhas' };
const MET_FORCA = 5;
const MIN_POR_SERIE = 2.5; // quando o treino de força não tem duração: tempo médio por série (com descanso)
export const PESO_PADRAO_KG = 70;

const num = (t) => {
  const s = String(t ?? '').trim().replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
};

// "45", "1,5" ou "5-7" (também "5 a 7", "5–7") -> { min, max }; vazio -> null; inválido -> undefined
export function lerFaixa(texto, { maximo = 100000 } = {}) {
  const t = String(texto ?? '').trim().replace(/\s*(a|–|—)\s*/g, '-').replace(/\s+/g, '');
  if (t === '') return null;
  const partes = t.split('-');
  if (partes.length > 2) return undefined;
  const nums = partes.map(num);
  if (nums.some((n) => Number.isNaN(n) || n <= 0 || n > maximo)) return undefined;
  const [min, max = min] = nums;
  return max < min ? undefined : { min, max };
}
export const faixaParaTexto = (f, sep = '-') => (!f ? '' : f.min === f.max ? String(f.min).replace('.', ',') : `${String(f.min).replace('.', ',')}${sep}${String(f.max).replace('.', ',')}`);
export const meio = (f) => (f ? (f.min + f.max) / 2 : null);

export function textoDuracao(f) {
  if (!f) return '';
  const um = (m) => {
    const h = Math.floor(m / 60);
    const r = Math.round(m % 60);
    return h === 0 ? `${r} min` : r === 0 ? `${h}h` : `${h}h${String(r).padStart(2, '0')}`;
  };
  return f.min === f.max ? um(f.min) : `${um(f.min)} a ${um(f.max)}`;
}
export const textoDistancia = (d) => (d ? `${faixaParaTexto(d.faixa || d, ' a ')} ${UNIDADES_DIST[d.unidade] || 'km'}` : '');

export const distanciaEmKm = (d) => {
  if (!d?.faixa) return null;
  const k = d.unidade === 'm' ? 0.001 : d.unidade === 'mi' ? 1.609344 : 1;
  return { min: d.faixa.min * k, max: d.faixa.max * k };
};

// Peso levantado (kg) = soma de repetições × carga de cada série; usa o meio das faixas
const meioTexto = (t) => { const v = String(t || '').split('-').map(Number).filter((n) => n > 0); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0; };
export function volumeKg(treino) {
  return (treino?.itens || []).reduce((s, i) => s + setsDoItem(i).reduce((t, x) => t + meioTexto(x.reps) * meioTexto(x.carga), 0), 0);
}

// Calorias estimadas: MET × peso (kg) × horas. Devolve { min, max } (kcal) ou null se faltar dado.
export function caloriasDoTreino(treino, pesoKg) {
  const kg = Number(pesoKg) > 0 ? Number(pesoKg) : PESO_PADRAO_KG;
  const tipo = tipoDe(treino);
  let met;
  if (tipo === 'forca') met = MET_FORCA;
  else if (tipo === 'cardio') met = (MODALIDADES[treino.modalidade] || MODALIDADES.outra).met;
  else met = (INTENSIDADES[treino.intensidade] || INTENSIDADES.moderada).met;

  let dur = treino.duracao || null; // minutos
  if (!dur && tipo === 'forca') {
    const series = (treino.itens || []).reduce((s, i) => s + (Number(i.series) || 0), 0);
    if (series > 0) dur = { min: series * MIN_POR_SERIE, max: series * MIN_POR_SERIE };
  }
  if (!dur && tipo === 'cardio') {
    const km = distanciaEmKm(treino.distancia);
    const v = (MODALIDADES[treino.modalidade] || MODALIDADES.outra).kmh;
    if (km) dur = { min: (km.min / v) * 60, max: (km.max / v) * 60 };
  }
  if (!dur) return null;
  const kcal = (min) => Math.round((met * kg * min) / 60);
  return { min: kcal(dur.min), max: kcal(dur.max) };
}
export const textoCalorias = (c) => (!c ? '' : c.min === c.max ? `~${c.min} kcal` : `~${c.min}–${c.max} kcal`);

export const nomeDaModalidade = (t) => (t.modalidade === 'outra' && t.modalidadeNome ? t.modalidadeNome : (MODALIDADES[t.modalidade] || MODALIDADES.outra).nome);

// Linhas de resumo para o cartão e o detalhe: [{ rotulo, valor }]
export function resumoDoTreino(treino, pesoKg) {
  const tipo = tipoDe(treino);
  const l = [];
  if (tipo === 'forca') {
    const itens = treino.itens || [];
    const series = itens.reduce((s, i) => s + (Number(i.series) || 0), 0);
    l.push({ rotulo: 'Exercícios', valor: `${itens.length} · ${series} séries` });
    const reps = itens.reduce((s, i) => s + setsDoItem(i).reduce((t, x) => t + (Number(String(x.reps).split('-')[0]) || 0), 0), 0);
    if (reps) l.push({ rotulo: 'Repetições', valor: `${reps}+` });
    const v = Math.round(volumeKg(treino));
    if (v) l.push({ rotulo: 'Peso levantado', valor: `${v.toLocaleString('pt-BR')} kg` });
  } else if (tipo === 'cardio') {
    l.push({ rotulo: 'Tipo', valor: nomeDaModalidade(treino) });
    if (treino.distancia) l.push({ rotulo: 'Distância', valor: textoDistancia(treino.distancia) });
  } else {
    l.push({ rotulo: 'Intensidade', valor: (INTENSIDADES[treino.intensidade] || INTENSIDADES.moderada).nome });
  }
  if (treino.duracao) l.push({ rotulo: 'Duração', valor: textoDuracao(treino.duracao) });
  const c = caloriasDoTreino(treino, pesoKg);
  if (c) l.push({ rotulo: 'Calorias', valor: textoCalorias(c) });
  return l;
}

// form (textos) -> { ok, treino } | { ok:false, erro }. Cada tipo tem seus campos.
export function validarTreinoGeral(form, existe = () => true) {
  const tipo = tipoDe(form);
  const nome = String(form?.nome ?? '').trim();
  if (!nome) return { ok: false, erro: 'Dê um nome ao treino.' };
  if (nome.length > 60) return { ok: false, erro: 'O nome do treino pode ter até 60 caracteres.' };

  const dur = lerFaixa(form.duracaoTexto ?? faixaParaTexto(form.duracao), { maximo: 1440 });
  if (dur === undefined) return { ok: false, erro: 'Duração inválida: use minutos, como 45, ou uma faixa, como 60-90.' };

  let base;
  if (tipo === 'forca') {
    const r = validarTreino(form, existe);
    if (!r.ok) return r;
    base = { ...r.treino, tipo };
  } else if (tipo === 'cardio') {
    if (!dur) return { ok: false, erro: 'Informe a duração do treino.' };
    const modalidade = MODALIDADES[form.modalidade] ? form.modalidade : 'corrida';
    base = { nome, tipo, modalidade, itens: [] };
    const nomeMod = String(form.modalidadeNome ?? '').trim().slice(0, 30);
    if (modalidade === 'outra') { if (!nomeMod) return { ok: false, erro: 'Dê um nome ao tipo de cardio.' }; base.modalidadeNome = nomeMod; }
    const unidade = UNIDADES_DIST[form.distanciaUnidade] ? form.distanciaUnidade : 'km';
    const d = lerFaixa(form.distanciaTexto ?? faixaParaTexto(form.distancia?.faixa), { maximo: 100000 });
    if (d === undefined) return { ok: false, erro: 'Distância inválida: use um número (ex.: 5) ou uma faixa (ex.: 5-7).' };
    if (d) base.distancia = { faixa: d, unidade };
  } else {
    if (!dur) return { ok: false, erro: 'Informe a duração do treino.' };
    const intensidade = INTENSIDADES[form.intensidade] ? form.intensidade : 'moderada';
    base = { nome, tipo, intensidade, itens: [] };
  }
  if (dur) base.duracao = dur;
  // vínculo com atividade da grade (opcional, qualquer tipo)
  return { ok: true, treino: base };
}
