import { useState, useEffect } from 'react';
import useVoltar from '../hooks/useVoltar';

export default function GoalModal({ isOpen, onClose, onSave, onDelete, onReset, metaEditada }) {
  useVoltar(isOpen, onClose);
  const [titulo, setTitulo] = useState('');
  const [meta, setMeta] = useState('');
  const [unidade, setUnidade] = useState('');
  const [incremento, setIncremento] = useState('');
  const [horarioReset, setHorarioReset] = useState('00:00');
  const [cor, setCor] = useState('#3b82f6');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErro('');
      if (metaEditada) {
        setTitulo(metaEditada.titulo || '');
        setMeta(metaEditada.meta || '');
        setUnidade(metaEditada.unidade || '');
        setIncremento(metaEditada.incremento || '');
        setHorarioReset(metaEditada.horarioReset || '00:00');
        setCor(metaEditada.cor || '#3b82f6');
      } else {
        setTitulo('');
        setMeta('');
        setUnidade('');
        setIncremento('');
        setHorarioReset('00:00');
        setCor('#3b82f6');
      }
    }
  }, [isOpen, metaEditada]);

  if (!isOpen) return null;

  const handleSalvar = () => {
    setErro('');
    if (!titulo.trim()) return setErro('Preencha o título da meta.');
    if (!meta || Number(meta) <= 0) return setErro('Defina um valor de meta válido.');
    if (!incremento || Number(incremento) <= 0) return setErro('Defina um valor de incremento válido.');

    const novaMeta = {
      id: metaEditada ? metaEditada.id : Date.now().toString(),
      titulo: titulo.trim(),
      meta: Number(meta),
      unidade: unidade.trim(),
      incremento: Number(incremento),
      horarioReset: horarioReset || '00:00',
      cor,
      progresso: metaEditada ? metaEditada.progresso : 0
    };

    onSave(novaMeta);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-md p-6 shadow-2xl space-y-4">
        <h2 className="text-xl font-bold">{metaEditada ? 'Editar Meta Diária' : 'Nova Meta Diária'}</h2>
        
        {erro && <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs">{erro}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1 text-zinc-400">Título</label>
            <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: 💧 Água" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1 text-zinc-400">Meta Diária</label>
              <input type="number" step="any" value={meta} onChange={e => setMeta(e.target.value)} placeholder="3" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none" />
            </div>
            <div className="w-24">
              <label className="block text-sm mb-1 text-zinc-400">Unidade</label>
              <input type="text" value={unidade} onChange={e => setUnidade(e.target.value)} placeholder="L" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none" />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1 text-zinc-400">Soma do botão (+)</label>
              <input type="number" step="any" value={incremento} onChange={e => setIncremento(e.target.value)} placeholder="0.6" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none" />
            </div>
            <div className="w-36">
              <label className="block text-sm mb-1 text-zinc-400">Reiniciar às</label>
              <input type="time" value={horarioReset} onChange={e => setHorarioReset(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none [color-scheme:dark]" />
            </div>
          </div>

          <div>
            <p className="text-[11px] text-zinc-500 -mt-1 mb-3">O progresso volta a zero todo dia no horário "Reiniciar às". Ex.: 04:00 para quem dorme depois da meia-noite.</p>
            <label className="block text-sm mb-1 text-zinc-400">Cor do Progresso</label>
            <input type="color" value={cor} onChange={e => setCor(e.target.value)} className="w-full h-10 rounded cursor-pointer bg-transparent border border-zinc-700 p-1" />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-6">
          {metaEditada ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => { onReset(metaEditada.id); onClose(); }} className="px-3 py-2 bg-red-950/40 text-red-400 hover:bg-red-900/50 rounded text-xs font-medium">Zerar Progresso</button>
              <button type="button" onClick={() => { onDelete(metaEditada.id); onClose(); }} className="px-3 py-2 text-red-500 hover:text-red-400 text-xs">Excluir</button>
            </div>
          ) : <div></div>}

          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm">Cancelar</button>
            <button onClick={handleSalvar} className="px-5 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}