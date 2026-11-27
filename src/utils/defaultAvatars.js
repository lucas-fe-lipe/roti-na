// src/utils/defaultAvatars.js

export function getInitials(nameOrEmail) {
  if (!nameOrEmail) return '?';
  const name = nameOrEmail.includes('@') ? nameOrEmail.split('@')[0] : nameOrEmail;
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

// Só aceita imagem do próprio app (/...), https ou uma foto JPEG pequena em base64 (a enviada pela pessoa).
// SVG/HTML ficam de fora de propósito (evita XSS).
export function avatarSeguro(src) {
  if (typeof src !== 'string') return false;
  if (src.startsWith('/') || src.startsWith('https://')) return true;
  return src.length < 150000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(src);
}
