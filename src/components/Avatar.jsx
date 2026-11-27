// Mostra a foto do perfil (URL ou foto JPEG enviada) ou, na falta dela, as iniciais.
// Valores antigos em formato SVG/HTML são ignorados de propósito (evita XSS).
import { avatarSeguro } from '../utils/defaultAvatars';

export default function Avatar({ src, initials, imgAlt = 'Perfil' }) {
  const isUrl = avatarSeguro(src);
  return isUrl
    ? <img src={src} alt={imgAlt} className="w-full h-full object-cover" />
    : <span>{initials}</span>;
}
