// Gera as formas (paths SVG) do corpo em tons de cinza.
//
// Sistema de coordenadas do desenho ("unidades"):
//   y = 0 é o topo da cabeça e y = 1000 é a sola do pé, ou seja, o corpo SEMPRE tem 1000 unidades de altura.
//   x = 0 é o centro do corpo.
// A conversão para pixels (altura x 2,5 m) é feita no BodyFigure.jsx.
//
// REGRA DE 3 das medidas:   largura_em_unidades = medida_cm / altura_cm * 1000
// As medidas são contornos (circunferências); para virar largura no desenho:
//   tronco (peito/cintura/quadril): largura = contorno / 2,75 e profundidade = contorno / 3,66
//   membros e pescoço (quase redondos): diâmetro = contorno / π
//   ombro: largura entre as pontas dos deltoides = contorno / 2,6

export const FIG_H = 1000;

export const PAL = {
  white: '#fafafa', l1: '#d4d4d8', l2: '#a1a1aa', l3: '#71717a',
  l4: '#52525b', l5: '#3f3f46', dark: '#27272a', black: '#09090b',
};

// ---------- utilidades de desenho ----------
const r1 = (n) => Math.round(n * 10) / 10;
const pt = (p) => `${r1(p[0])} ${r1(p[1])}`;
const lerp = (a, b, t) => a + (b - a) * t;

// curva suave (Catmull-Rom -> Bézier) passando por todos os pontos
function smooth(points) {
  const n = points.length;
  let d = `M${pt(points[0])}`;
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n], p1 = points[i], p2 = points[(i + 1) % n], p3 = points[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + 'Z';
}
const poly = (points) => 'M' + points.map(pt).join('L') + 'Z';
const polyline = (points) => 'M' + points.map(pt).join('L');
const ell = (cx, cy, rx, ry) => `M${r1(cx - rx)} ${r1(cy)}a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(2 * rx)} 0a${r1(rx)} ${r1(ry)} 0 1 0 ${r1(-2 * rx)} 0Z`;
const rrect = (x, y, w, h, r) =>
  `M${r1(x + r)} ${r1(y)}h${r1(w - 2 * r)}a${r} ${r} 0 0 1 ${r} ${r}v${r1(h - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${r}h${r1(-(w - 2 * r))}a${r} ${r} 0 0 1 ${-r} ${-r}v${r1(-(h - 2 * r))}a${r} ${r} 0 0 1 ${r} ${-r}Z`;

// interpola uma propriedade de uma lista de chaves [{y, ...}] na altura y
function at(keys, y, prop) {
  if (y <= keys[0].y) return keys[0][prop];
  for (let i = 1; i < keys.length; i++) {
    if (y <= keys[i].y) {
      const t = (y - keys[i - 1].y) / (keys[i].y - keys[i - 1].y);
      return lerp(keys[i - 1][prop], keys[i][prop], t);
    }
  }
  return keys[keys.length - 1][prop];
}

// contorno de um membro a partir de chaves {y, cx, w}
function limb(keys) {
  const left = keys.map(k => [k.cx - k.w / 2, k.y]);
  const right = keys.map(k => [k.cx + k.w / 2, k.y]).reverse();
  return smooth([...left, ...right]);
}
// trecho de um membro entre y0 e y1, com largura multiplicada por `scale`
function band(keys, y0, y1, scale = 1, shift = 0, n = 6) {
  const ys = Array.from({ length: n }, (_, i) => lerp(y0, y1, i / (n - 1)));
  const left = ys.map(y => [at(keys, y, 'cx') + shift - (at(keys, y, 'w') * scale) / 2, y]);
  const right = ys.map(y => [at(keys, y, 'cx') + shift + (at(keys, y, 'w') * scale) / 2, y]).reverse();
  return smooth([...left, ...right]);
}

// perfil lateral: linhas [y, xTras, xFrente]
function profile(rows) {
  const front = rows.map(r => [r[2], r[0]]);
  const back = rows.slice().reverse().map(r => [r[1], r[0]]);
  return smooth([...front, ...back]);
}
function rowAt(rows, y) {
  const keys = rows.map(r => ({ y: r[0], b: r[1], f: r[2] }));
  return [at(keys, y, 'b'), at(keys, y, 'f')];
}
// fatia do perfil: f0..f1 = fração entre costas (0) e frente (1)
function slice(rows, y0, y1, f0, f1, n = 6) {
  const ys = Array.from({ length: n }, (_, i) => lerp(y0, y1, i / (n - 1)));
  const front = ys.map(y => { const [b, f] = rowAt(rows, y); return [lerp(b, f, f1), y]; });
  const back = ys.map(y => { const [b, f] = rowAt(rows, y); return [lerp(b, f, f0), y]; }).reverse();
  return smooth([...front, ...back]);
}

// ---------- montagem ----------
const sh = (d, fill, o = {}) => ({ d, fill, ...o });
const traco = (d, cor = PAL.black, w = 1) => ({ d, fill: 'none', stroke: cor, sw: w });

function calcLarguras(M, alturaCm, imc) {
  const u = (cm) => (cm / alturaCm) * FIG_H;
  return {
    u,
    // definição do abdômen some aos poucos entre IMC 25 e 37
    ab: imc ? Math.min(1, Math.max(0.15, 1 - (imc - 25) / 12)) : 1,
    shoulder: u(M.ombro / 2.6),
    chest: u(M.peito / 2.75), waist: u(M.cintura / 2.75), hip: u(M.quadril / 2.75),
    dChest: u(M.peito / 3.66), dWaist: u(M.cintura / 3.66), dHip: u(M.quadril / 3.66),
    neck: u(M.pescoco / Math.PI),
    thigh: { D: u(M.coxaD / Math.PI), E: u(M.coxaE / Math.PI) },
    calf: { D: u(M.panturrilhaD / Math.PI), E: u(M.panturrilhaE / Math.PI) },
    arm: { D: u(M.bracoD / Math.PI), E: u(M.bracoE / Math.PI) },
    fore: { D: u(M.antebracoD / Math.PI), E: u(M.antebracoE / Math.PI) },
  };
}

function legKeys(thigh, calf, hipW, s) {
  const c0 = Math.max(hipW / 2 - thigh / 2, thigh * 0.5 + 1);
  const cx = (y) => s * (y <= 720 ? lerp(c0, c0 * 0.92, (y - 480) / 240) : lerp(c0 * 0.92, c0 * 0.84, (y - 720) / 240));
  const rows = [[480, thigh * 1.03], [540, thigh], [640, thigh * 0.86], [720, thigh * 0.64],
    [790, calf], [860, calf * 0.78], [945, calf * 0.52], [975, calf * 0.62], [1000, calf * 0.5]];
  return rows.map(([y, w]) => ({ y, cx: cx(y), w }));
}

function armKeys(arm, fore, W, s) {
  const sx = W.shoulder / 2 - arm * 0.5;
  const ce = Math.max(W.waist / 2 + arm * 0.4 + 14, sx + 4);
  const cw = Math.max(W.hip / 2 + fore * 0.3 + 10, ce - 4);
  const ks = [[196, sx, arm * 0.9], [240, lerp(sx, ce, 0.25), arm], [300, lerp(sx, ce, 0.62), arm * 0.95],
    [362, ce, arm * 0.78], [420, lerp(ce, cw, 0.45), fore], [480, lerp(ce, cw, 0.8), fore * 0.72],
    [520, cw, fore * 0.55], [545, cw + 2, fore * 0.72], [578, cw + 3, fore * 0.6], [602, cw + 3, fore * 0.22]];
  return ks.map(([y, cx, w]) => ({ y, cx: s * cx, w }));
}

function torsoPts(W) {
  const half = [
    [W.neck / 2, 140], [W.neck / 2 + (W.shoulder / 2 - W.neck / 2) * 0.55, 165], [W.shoulder / 2 * 0.93, 190],
    [W.chest / 2, 240], [W.chest / 2, 270], [W.waist / 2, 360], [W.waist / 2 * 1.02, 395],
    [W.hip / 2, 450], [W.hip / 2 * 0.98, 495], [W.hip / 2 * 0.55, 515], [0, 520],
  ];
  const right = half;
  const left = half.slice(1, -1).map(([x, y]) => [-x, y]).reverse();
  return [...right, ...left];
}

function cabecaFrente(f, back) {
  const k = f ? 0.94 : 1;
  const r = [[0, 0], [26, 4], [41, 22], [46, 52], [44, 82], [36, 108], [20, 126], [0, 131]].map(([x, y]) => [x * k, y]);
  const l = r.slice(1, -1).map(([x, y]) => [-x, y]).reverse();
  const out = [sh(smooth([...r, ...l]), PAL.l2)];
  out.push(sh(ell(-46 * k, 68, 5, 13), PAL.l3), sh(ell(46 * k, 68, 5, 13), PAL.l3));
  if (!back) {
    out.push(traco(polyline([[-24 * k, 62], [-10 * k, 62]]), PAL.l5, 1.2), traco(polyline([[10 * k, 62], [24 * k, 62]]), PAL.l5, 1.2));
    out.push(traco(polyline([[-12 * k, 108], [12 * k, 108]]), PAL.l5, 1.2));
  } else {
    // costas da cabeça: linha do cabelo
    out.push(sh(smooth([[0, 0], [30 * k, 6], [43 * k, 30], [40 * k, 62], [0, 70], [-40 * k, 62], [-43 * k, 30], [-30 * k, 6]]), PAL.l5));
  }
  return out;
}

// ============ VISTA FRONTAL ============
function frente(sexo, M, W) {
  const f = sexo === 'F';
  const S = [];
  const legs = { D: legKeys(W.thigh.D, W.calf.D, W.hip, -1), E: legKeys(W.thigh.E, W.calf.E, W.hip, 1) };

  // pernas
  ['D', 'E'].forEach(side => {
    const k = legs[side];
    const s = side === 'D' ? -1 : 1;
    S.push(sh(limb(k), PAL.l4));
    S.push(sh(band(k, 505, 705, 0.96), PAL.l1));
    S.push(traco(polyline([[at(k, 525, 'cx'), 525], [at(k, 700, 'cx') + s * W.thigh[side] * 0.05, 700]]), PAL.l3, 1));
    S.push(sh(ell(at(k, 724, 'cx'), 724, W.thigh[side] * 0.2, 14), PAL.l3));
    S.push(sh(band(k, 750, 935, 0.62), PAL.l2));
    S.push(sh(band(k, 755, 860, 0.3, s * W.calf[side] * 0.28), PAL.l3));
  });

  // tronco
  S.push(sh(smooth(torsoPts(W)), PAL.l4));
  const ch = W.chest / 2, wh = W.waist / 2;
  [-1, 1].forEach(s => {
    const X = (arr) => arr.map(([x, y]) => [s * x, y]);
    // oblíquos
    S.push(sh(smooth(X([[ch * 0.95, 290], [ch * 0.97, 305], [wh * 1.0, 372], [wh * 1.02, 402], [W.waist * 0.34, 405], [W.waist * 0.31, 335], [W.chest * 0.34, 305]])), PAL.l3));
    // V do quadril
    S.push(traco(polyline(X([[W.waist * 0.32, 410], [W.waist * 0.13, 480], [0, 500]])), PAL.l2, 1));
    if (!f) {
      S.push(sh(smooth(X([[2, 205], [ch * 0.55, 198], [ch * 0.95, 222], [ch * 0.93, 252], [ch * 0.7, 282], [ch * 0.35, 290], [2, 282]])), PAL.l2));
    } else {
      S.push(sh(smooth(X([[2, 208], [ch * 0.55, 200], [ch * 0.95, 224], [ch * 0.8, 246], [2, 246]])), PAL.l3));
      S.push(sh(ell(s * W.chest * 0.23, 282, W.chest * 0.2, W.chest * 0.18), PAL.l1));
    }
  });
  // abdômen (3 fileiras + linha branca)
  const aw = W.waist * 0.2;
  [[300, 30], [335, 30], [370, 30], [405, 26]].forEach(([y, h], i) => {
    if (i === 3 && !f) { /* fileira baixa só no masculino */ }
    [-1, 1].forEach(s => {
      S.push(sh(rrect(s < 0 ? -(aw + 3) : 3, y, aw, h, 7), f ? PAL.l2 : PAL.l1, { opacity: W.ab }));
    });
  });
  S.push(sh(ell(0, 395, 2.5, 2.5), PAL.black));

  // pescoço, trapézio, cabeça
  S.push(sh(smooth([[-W.neck / 2, 105], [W.neck / 2, 105], [W.neck / 2 * 1.08, 150], [W.neck / 2 * 1.5, 180], [-W.neck / 2 * 1.5, 180], [-W.neck / 2 * 1.08, 150]]), PAL.l4));
  [-1, 1].forEach(s => {
    S.push(sh(poly([[s * W.neck / 2, 140], [s * W.shoulder * 0.4, 187], [s * W.neck * 0.8, 203]]), PAL.l3));
  });
  S.push(...cabecaFrente(f, false));

  // braços
  ['D', 'E'].forEach(side => {
    const s = side === 'D' ? -1 : 1;
    const k = armKeys(W.arm[side], W.fore[side], W, s);
    S.push(sh(limb(k), PAL.l4));
    S.push(sh(band(k, 232, 345, 0.82), PAL.l1));
    S.push(sh(band(k, 372, 485, 0.82), PAL.l2));
    S.push(sh(ell(s * (W.shoulder / 2 - W.arm[side] * 0.52), 214, W.arm[side] * 0.56, 33), PAL.white));
  });
  return S;
}

// ============ VISTA TRASEIRA ============
function costas(sexo, M, W) {
  const f = sexo === 'F';
  const S = [];
  // na vista traseira o lado D (direito) fica à direita da imagem
  const legs = { D: legKeys(W.thigh.D, W.calf.D, W.hip, 1), E: legKeys(W.thigh.E, W.calf.E, W.hip, -1) };
  ['D', 'E'].forEach(side => {
    const k = legs[side];
    S.push(sh(limb(k), PAL.l4));
    S.push(sh(band(k, 515, 705, 0.96), PAL.l2));
    S.push(sh(band(k, 735, 870, 0.94), PAL.l1));
    S.push(sh(band(k, 865, 940, 0.6), PAL.l3));
    S.push(traco(polyline([[at(k, 735, 'cx'), 725], [at(k, 870, 'cx'), 870]]), PAL.l5, 1));
  });

  S.push(sh(smooth(torsoPts(W)), PAL.l4));
  const ch = W.chest / 2, wh = W.waist / 2;
  [-1, 1].forEach(s => {
    const X = (arr) => arr.map(([x, y]) => [s * x, y]);
    // grande dorsal
    S.push(sh(smooth(X([[W.chest * 0.46, 240], [ch * 0.98, 262], [wh * 1.0, 345], [W.waist * 0.28, 398], [W.waist * 0.22, 335], [W.chest * 0.33, 290]])), PAL.l3));
    // infraespinhal / redondo
    S.push(sh(ell(s * W.chest * 0.3, 238, W.chest * 0.14, 18), PAL.l2));
    // glúteos
    S.push(sh(ell(s * W.hip * 0.23, 458, W.hip * 0.26, 50), PAL.l1));
  });
  // lombar + coluna
  S.push(sh(rrect(-W.waist * 0.19, 300, W.waist * 0.38, 105, 8), PAL.l2));
  S.push(traco(polyline([[0, 150], [0, 505]]), PAL.l5, 1));

  S.push(sh(smooth([[-W.neck / 2, 105], [W.neck / 2, 105], [W.neck / 2 * 1.08, 150], [W.neck / 2 * 1.5, 180], [-W.neck / 2 * 1.5, 180], [-W.neck / 2 * 1.08, 150]]), PAL.l4));
  // trapézio (losango)
  S.push(sh(smooth([[0, 140], [W.shoulder * 0.42, 188], [W.chest * 0.3, 255], [0, 305], [-W.chest * 0.3, 255], [-W.shoulder * 0.42, 188]]), PAL.l1));
  S.push(...cabecaFrente(f, true));

  ['D', 'E'].forEach(side => {
    const s = side === 'D' ? 1 : -1;
    const k = armKeys(W.arm[side], W.fore[side], W, s);
    S.push(sh(limb(k), PAL.l4));
    S.push(sh(band(k, 232, 345, 0.9), PAL.l2));
    S.push(sh(band(k, 372, 485, 0.82), PAL.l3));
    S.push(sh(ell(s * (W.shoulder / 2 - W.arm[side] * 0.52), 214, W.arm[side] * 0.56, 33), PAL.white));
  });
  return S;
}

// ============ VISTA LATERAL (olhando para a direita) ============
function lado(sexo, M, W) {
  const f = sexo === 'F';
  const S = [];
  const dC = W.dChest, dW = W.dWaist, dH = W.dHip;

  const perna = (thigh, calf, dx) => {
    const a = thigh, c = calf;
    return [
      [480, -a * 0.5 + dx, a * 0.52 + dx], [560, -a * 0.5 + dx, a * 0.56 + dx], [650, -a * 0.44 + dx, a * 0.45 + dx],
      [720, -a * 0.32 + dx, a * 0.32 + dx], [790, -c * 0.64 + dx, c * 0.38 + dx], [870, -c * 0.46 + dx, c * 0.33 + dx],
      [945, -c * 0.28 + dx, c * 0.28 + dx], [968, -c * 0.34 + dx, c * 0.36 + 10 + dx],
      [988, -c * 0.34 + dx, c * 0.36 + 50 + dx], [1000, -c * 0.3 + dx, c * 0.36 + 70 + dx],
    ];
  };
  // perna do fundo (E) mais escura e um pouco à frente
  const far = perna(W.thigh.E, W.calf.E, 12);
  S.push(sh(profile(far), PAL.l5));
  S.push(sh(slice(far, 505, 705, 0.5, 1), PAL.l3));
  S.push(sh(slice(far, 745, 880, 0, 0.55), PAL.l3));

  const near = perna(W.thigh.D, W.calf.D, -dH * 0.04);
  S.push(sh(profile(near), PAL.l4));
  S.push(sh(slice(near, 505, 705, 0.5, 1), PAL.l1));
  S.push(sh(slice(near, 515, 705, 0, 0.5), PAL.l2));
  S.push(sh(slice(near, 745, 880, 0, 0.58), PAL.l1));
  S.push(sh(slice(near, 750, 930, 0.58, 1), PAL.l2));
  S.push(sh(ell(rowAt(near, 724)[1] - 2, 724, 12, 15), PAL.l3));

  // tronco
  const torso = [
    [150, -W.neck * 0.55, W.neck * 0.55 + 2], [190, -dC * 0.52, dC * 0.3], [235, -dC * 0.52, dC * 0.5],
    [270, -dC * 0.5, dC * 0.58], [330, -dW * 0.5, dW * 0.55], [385, -dW * 0.52, dW * 0.58], [415, -dH * 0.6, dH * 0.5],
    [445, -dH * 0.64, dH * 0.42], [490, -dH * 0.55, dH * 0.38], [520, -dH * 0.2, dH * 0.2],
  ];
  S.push(sh(profile(torso), PAL.l4));
  S.push(sh(slice(torso, 205, 340, 0, 0.42), PAL.l3));          // dorsal
  S.push(sh(slice(torso, 150, 235, 0, 0.35), PAL.l1));          // trapézio
  S.push(sh(slice(torso, 295, 405, 0.55, 1), f ? PAL.l2 : PAL.l1, { opacity: Math.max(0.5, W.ab) })); // abdômen
  S.push(sh(ell(dC * 0.2, 255, dC * 0.32, f ? 30 : 28), f ? PAL.l1 : PAL.l2)); // peito
  S.push(sh(ell(-dH * 0.3, 466, dH * 0.31, 42), PAL.l1));       // glúteo

  // pescoço + cabeça (perfil)
  S.push(sh(smooth([[-W.neck * 0.5 + 2, 105], [W.neck * 0.5 + 6, 105], [W.neck * 0.5 + 8, 150], [W.neck * 0.8, 180], [-W.neck * 0.8, 180], [-W.neck * 0.5, 150]]), PAL.l4));
  S.push(sh(smooth([[0, 0], [30, 8], [44, 35], [48, 62], [41, 72], [43, 94], [36, 118], [18, 130], [-10, 128], [-35, 105], [-47, 60], [-38, 20]]), PAL.l2));
  S.push(sh(smooth([[0, 0], [28, 7], [36, 22], [20, 30], [-8, 50], [-30, 70], [-47, 60], [-38, 20]]), PAL.l5));
  S.push(sh(ell(-4, 70, 6, 13), PAL.l3));

  // braço próximo (D)
  const arm = W.arm.D, fore = W.fore.D;
  const ar = [
    [196, -arm * 0.5, arm * 0.5], [240, -arm * 0.5, arm * 0.5], [300, -arm * 0.47 + 6, arm * 0.47 + 6],
    [362, -arm * 0.39 + 14, arm * 0.39 + 14], [420, -fore * 0.5 + 12, fore * 0.5 + 12], [480, -fore * 0.36 + 8, fore * 0.36 + 8],
    [520, -fore * 0.28 + 6, fore * 0.28 + 6], [545, -fore * 0.36 + 8, fore * 0.36 + 8], [578, -fore * 0.3 + 10, fore * 0.3 + 10], [602, -fore * 0.11 + 10, fore * 0.11 + 10],
  ];
  S.push(sh(profile(ar), PAL.l4));
  S.push(sh(slice(ar, 232, 345, 0.5, 1), PAL.l1));  // bíceps
  S.push(sh(slice(ar, 232, 345, 0, 0.5), PAL.l3));  // tríceps
  S.push(sh(slice(ar, 372, 485, 0, 1, 6), PAL.l2));
  S.push(sh(ell(0, 214, arm * 0.58, 33), PAL.white));
  return S;
}

export function buildFigure(view, sexo, M, alturaCm, imc = null) {
  const W = calcLarguras(M, alturaCm, imc);
  if (view === 0) return frente(sexo, M, W);
  if (view === 1) return lado(sexo, M, W);
  return costas(sexo, M, W);
}

export const VISTAS = ['Frente', 'Lado', 'Costas'];
