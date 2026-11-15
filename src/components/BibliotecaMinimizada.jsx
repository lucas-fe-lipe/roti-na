import { useState } from 'react';
import ExerciciosBiblioteca from './ExerciciosBiblioteca';

// Biblioteca de exercícios: sempre começa minimizada ao abrir a página
export default function BibliotecaMinimizada(props) {
  const [aberta, setAberta] = useState(false);
  return (
    <div className="mt-2 w-full px-2 sm:px-0">
      <button onClick={() => setAberta((a) => !a)} aria-expanded={aberta} className="w-full flex items-center gap-2 text-left bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
        <span className="text-zinc-400 text-xs">{aberta ? '▼︎' : '▶︎'}</span>
        <h2 className="text-sm font-bold text-zinc-100">Biblioteca de exercícios</h2>
      </button>
      {aberta && <div className="mt-2"><ExerciciosBiblioteca {...props} /></div>}
    </div>
  );
}
