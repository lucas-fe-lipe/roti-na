import { useState, useEffect } from 'react';

const CORES = {
  erro: 'bg-red-950 border-red-700 text-red-100',
  sucesso: 'bg-emerald-950 border-emerald-700 text-emerald-100',
  info: 'bg-zinc-900 border-zinc-700 text-zinc-100',
};

export default function Toaster() {
  const [itens, setItens] = useState([]);

  const fechar = (id) => setItens((atual) => atual.filter((i) => i.id !== id));

  useEffect(() => {
    const ouvir = (e) => {
      const id = Date.now() + Math.random();
      const { mensagem, tipo, acao } = e.detail;
      setItens((atual) => [...atual.slice(-2), { id, mensagem, tipo, acao }]);
      const duracao = acao ? 7000 : tipo === 'erro' ? 6000 : 3500;
      setTimeout(() => setItens((atual) => atual.filter((i) => i.id !== id)), duracao);
    };
    window.addEventListener('roti-toast', ouvir);
    return () => window.removeEventListener('roti-toast', ouvir);
  }, []);

  if (itens.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none" role="status" aria-live="polite">
      {itens.map((i) => (
        <div key={i.id} className={`pointer-events-auto max-w-md w-full border rounded-lg px-4 py-2.5 text-sm shadow-xl flex items-center justify-between gap-3 ${CORES[i.tipo] || CORES.info}`}>
          <span>{i.mensagem}</span>
          {i.acao && (
            <button
              onClick={() => { fechar(i.id); i.acao.fn(); }}
              className="shrink-0 font-bold underline underline-offset-2 hover:text-white"
            >
              {i.acao.rotulo}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
