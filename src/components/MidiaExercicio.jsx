import { useState } from 'react';
import { midiaDoLink } from '../utils/treino';

export default function Midia({ link }) {
  const [falhou, setFalhou] = useState(false);
  const m = midiaDoLink(link);
  if (!m) return null;
  if (!falhou || !m.iframe) {
    return <img src={m.img} alt="Demonstração do exercício" loading="lazy" referrerPolicy="no-referrer" onError={() => setFalhou(true)} className="w-full max-h-72 object-contain rounded-lg bg-black" />;
  }
  return <iframe src={m.iframe} title="Demonstração do exercício" className="w-full h-64 rounded-lg border-0 bg-black" allow="autoplay" />;
}
