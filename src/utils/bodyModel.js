// Regras do corpo: IMC, medidas padrão e conversões. Nada de React aqui.

export const MEDIDAS = [
  { chave: 'ombro', grupo: 'Ombro', lado: '', dica: 'Contorno em volta dos ombros, na parte mais larga dos deltoides.' },
  { chave: 'peito', grupo: 'Peito', lado: '', dica: 'Contorno na altura dos mamilos.' },
  { chave: 'cintura', grupo: 'Cintura', lado: '', dica: 'Contorno na altura do umbigo.' },
  { chave: 'quadril', grupo: 'Quadril', lado: '', dica: 'Contorno na parte mais alta dos glúteos.' },
  { chave: 'pescoco', grupo: 'Pescoço', lado: '', dica: 'Contorno logo abaixo do pomo de adão.' },
  { chave: 'bracoD', grupo: 'Braço', lado: 'D', dica: 'Contorno no meio do braço (bíceps), relaxado.' },
  { chave: 'bracoE', grupo: 'Braço', lado: 'E', dica: 'Contorno no meio do braço (bíceps), relaxado.' },
  { chave: 'antebracoD', grupo: 'Antebraço', lado: 'D', dica: 'Contorno na parte mais grossa do antebraço.' },
  { chave: 'antebracoE', grupo: 'Antebraço', lado: 'E', dica: 'Contorno na parte mais grossa do antebraço.' },
  { chave: 'coxaD', grupo: 'Coxa', lado: 'D', dica: 'Contorno na parte mais grossa da coxa.' },
  { chave: 'coxaE', grupo: 'Coxa', lado: 'E', dica: 'Contorno na parte mais grossa da coxa.' },
  { chave: 'panturrilhaD', grupo: 'Perna (panturrilha)', lado: 'D', dica: 'Contorno na parte mais grossa da panturrilha.' },
  { chave: 'panturrilhaE', grupo: 'Perna (panturrilha)', lado: 'E', dica: 'Contorno na parte mais grossa da panturrilha.' },
];

export const CHAVES_MEDIDAS = MEDIDAS.map(m => m.chave);

// Medidas (cm) de uma pessoa de 1,75 m com IMC 22. Usadas quando o usuário não preencheu a medida.
const BASE = {
  M: { ombro: 115, peito: 98, cintura: 82, quadril: 97, pescoco: 38, coxa: 56, panturrilha: 37, braco: 31, antebraco: 27 },
  F: { ombro: 100, peito: 90, cintura: 70, quadril: 99, pescoco: 32, coxa: 57, panturrilha: 36, braco: 26, antebraco: 23 },
};
const ALTURA_BASE_CM = 175;
const IMC_BASE = 22;

// Quanto cada parte engorda/emagrece conforme o IMC (expoente aplicado em IMC/22).
const EXPOENTE = { ombro: 0.3, peito: 0.55, cintura: 0.75, quadril: 0.55, pescoco: 0.4, coxa: 0.5, panturrilha: 0.35, braco: 0.5, antebraco: 0.3 };

const PARES = ['braco', 'antebraco', 'coxa', 'panturrilha'];

/**
 * Devolve todas as medidas (cm) que o desenho usa.
 * `informadas` = { ombro: 112, coxaD: 55, ... } (só o que o usuário preencheu).
 * `imc` pode ser null: nesse caso o corpo fica com IMC 22.
 */
export function resolverMedidas(sexo, alturaCm, imc, informadas = {}) {
  const base = BASE[sexo] || BASE.M;
  const imcOk = imc ? Math.min(60, Math.max(12, imc)) : IMC_BASE;
  const padrao = (nome) => base[nome] * (alturaCm / ALTURA_BASE_CM) * Math.pow(imcOk / IMC_BASE, EXPOENTE[nome]);
  const out = {};
  ['ombro', 'peito', 'cintura', 'quadril', 'pescoco'].forEach(n => {
    out[n] = informadas[n] ?? padrao(n);
  });
  PARES.forEach(n => {
    const d = informadas[n + 'D'];
    const e = informadas[n + 'E'];
    // se só um lado foi preenchido, o outro copia (melhor que cair no padrão)
    out[n + 'D'] = d ?? e ?? padrao(n);
    out[n + 'E'] = e ?? d ?? padrao(n);
  });
  return out;
}

// ---------- números ----------
export function formatarNumero(n, casas = 1) {
  return Number(n).toFixed(casas).replace('.', ',');
}

export function parseAltura(txt) {
  let n = Number(String(txt).trim().replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  if (n >= 30) n = n / 100; // "170" vira 1,70 m
  return n >= 0.3 && n <= 3 ? Math.round(n * 1000) / 1000 : null;
}
export const parsePeso = (t) => { const n = Number(String(t).replace(',', '.')); return n >= 2 && n <= 500 ? n : null; };
export const parseMedida = (t) => { const n = Number(String(t).replace(',', '.')); return n >= 5 && n <= 300 ? n : null; };

// último registro por data (empate: o adicionado por último)
export function ultimo(lista) {
  if (!lista || lista.length === 0) return null;
  return lista.reduce((a, b) => (b.data >= a.data ? b : a));
}

// ---------- IMC ----------
export function calcIMC(pesoKg, alturaM) {
  if (!pesoKg || !alturaM) return null;
  return pesoKg / (alturaM * alturaM);
}

// cor: 'green' (ok), 'yellow' (um pouco ruim), 'red' (muito ruim)
export const FAIXAS_IMC = [
  { ate: 16, nome: 'Magreza grave', cor: 'red', faixa: 'abaixo de 16' },
  { ate: 17, nome: 'Magreza moderada', cor: 'red', faixa: '16 a 16,9' },
  { ate: 18.5, nome: 'Magreza leve', cor: 'yellow', faixa: '17 a 18,4' },
  { ate: 25, nome: 'Peso normal', cor: 'green', faixa: '18,5 a 24,9' },
  { ate: 30, nome: 'Sobrepeso', cor: 'yellow', faixa: '25 a 29,9' },
  { ate: 35, nome: 'Obesidade grau I', cor: 'red', faixa: '30 a 34,9' },
  { ate: 40, nome: 'Obesidade grau II', cor: 'red', faixa: '35 a 39,9' },
  { ate: Infinity, nome: 'Obesidade grau III', cor: 'red', faixa: '40 ou mais' },
];

export function faixaIMC(imc) {
  return FAIXAS_IMC.find(f => imc < f.ate);
}
