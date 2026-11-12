// Mostra a foto do perfil (URL) ou, na falta dela, as iniciais.
// Valores antigos em formato SVG/HTML são ignorados de propósito (evita XSS).
export default function Avatar({ src, initials, imgAlt = 'Perfil' }) {
  const isUrl = typeof src === 'string' && (src.startsWith('/') || src.startsWith('https://'));
  return isUrl
    ? <img src={src} alt={imgAlt} className="w-full h-full object-cover" />
    : <span>{initials}</span>;
}
