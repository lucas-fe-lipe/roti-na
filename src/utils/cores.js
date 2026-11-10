// Escolhe texto preto ou branco conforme a cor de fundo, para sempre ficar legível.
// Usa a luminância relativa (WCAG) e escolhe o que tiver mais contraste.
const canal = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export function hexParaRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function textoParaFundo(hex) {
  const rgb = hexParaRgb(hex);
  if (!rgb) return '#ffffff';
  const L = 0.2126 * canal(rgb[0]) + 0.7152 * canal(rgb[1]) + 0.0722 * canal(rgb[2]);
  // contraste com branco = 1.05/(L+0.05); com preto = (L+0.05)/0.05
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#000000';
}
