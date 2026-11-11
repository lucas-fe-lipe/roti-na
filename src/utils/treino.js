// Cálculos da página Treinos: intensidade dos músculos, cor do avatar e links de mídia. Funções puras, testadas em tests/.

export const COR_PADRAO = '#f97316';
export const COR_MUSCULO_PARADO = '#4b4b4b';
// séries "equivalentes" em um músculo que deixam a cor 100% (acima disso não passa)
export const SERIES_PARA_CHEIO = 10;

const limitar = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

// Intensidade (0 a 1) de um único exercício: é o próprio peso do músculo naquele exercício.
export function intensidadeDoExercicio(exercicio) {
  const r = {};
  Object.entries(exercicio?.m || {}).forEach(([g, w]) => { r[g] = limitar(w); });
  return r;
}

// Intensidade (0 a 1) de cada músculo num treino. itens: [{ exercicioId, series }].
// Cada série soma o peso do músculo naquele exercício. Modo 'absoluto': 10 séries equivalentes = 100% (treino leve fica fraco).
// Modo 'relativo': o músculo mais exigido do treino fica 100%.
export function intensidadeDoTreino(itens, achar, modo = 'absoluto') {
  const soma = {};
  (itens || []).forEach((it) => {
    const ex = achar(it.exercicioId);
    const series = Number(it.series);
    if (!ex || !Number.isFinite(series) || series <= 0) return;
    Object.entries(ex.m).forEach(([g, w]) => { soma[g] = (soma[g] || 0) + w * series; });
  });
  const maximo = Math.max(0, ...Object.values(soma));
  const r = {};
  Object.entries(soma).forEach(([g, v]) => { r[g] = limitar(modo === 'relativo' ? (maximo ? v / maximo : 0) : v / SERIES_PARA_CHEIO); });
  return r;
}

const hex = (c) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const paraHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

// Mistura o cinza do músculo parado com a cor escolhida. Qualquer intensidade > 0 já aparece (mínimo de 30%).
export function corDoMusculo(intensidade, cor = COR_PADRAO) {
  const i = Number(intensidade);
  const a = hex(COR_MUSCULO_PARADO);
  const b = hex(cor) || hex(COR_PADRAO);
  if (!Number.isFinite(i) || i <= 0) return COR_MUSCULO_PARADO;
  const t = 0.3 + 0.7 * limitar(i);
  return paraHex(a.map((v, k) => v + (b[k] - v) * t));
}

// ---------- links de mídia (GIF/imagem/vídeo curto) ----------
// Aceita link do Google Drive (compartilhado como "qualquer pessoa com o link") ou um endereço direto de imagem.
export function idDoDrive(url) {
  const s = String(url || '').trim();
  let m = /drive\.google\.com\/file\/d\/([\w-]{10,})/.exec(s);
  if (!m) m = /drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*\bid=([\w-]{10,})/.exec(s);
  if (!m) m = /(?:docs|drive)\.google\.com\/.*\/d\/([\w-]{10,})/.exec(s);
  if (!m) m = /lh3\.googleusercontent\.com\/d\/([\w-]{10,})/.exec(s);
  return m ? m[1] : null;
}

export function linkValido(url) {
  const s = String(url || '').trim();
  if (!s) return true; // vazio = remover
  return /^https:\/\/\S+$/i.test(s);
}

// Devolve { img, iframe } com os endereços a tentar: primeiro como imagem, depois como visualização incorporada.
export function midiaDoLink(url) {
  const s = String(url || '').trim();
  if (!s || !linkValido(s)) return null;
  const id = idDoDrive(s);
  if (id) return { img: `https://lh3.googleusercontent.com/d/${id}`, iframe: `https://drive.google.com/file/d/${id}/preview` };
  return { img: s, iframe: null };
}

// E-mail que pode editar a biblioteca. As regras do Firestore (firestore.rules) são quem realmente bloqueia os demais.
export const EMAIL_ADMIN = 'lucasfelipe.np@gmail.com';
export const podeSerAdmin = (user) => !!user?.email && user.email.trim().toLowerCase() === EMAIL_ADMIN;
export const modoAdminAtivo = (user, config) => podeSerAdmin(user) && !!config?.admin?.ativo;
