import { useState, useEffect } from 'react';

export default function TaskModal({ isOpen, onClose, onSave, onDelete, taskEditada, atividades }) {
  const coresAtividades = atividades ? atividades.map(a => a.cor).filter(Boolean) : [];
  const predefinedColors = Array.from(new Set(['#000000', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#64748b', ...coresAtividades]));

  const [nome, setNome] = useState('');
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('');
  const [cor, setCor] = useState('#000000');
  const [atividadeVinculada, setAtividadeVinculada] = useState('');
  const [detalhes, setDetalhes] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErro('');
      if (taskEditada) {
        setNome(taskEditada.nome || '');
        setData(taskEditada.data || '');
        setHorario(taskEditada.horario || '');
        setCor(taskEditada.cor || '#000000');
        setAtividadeVinculada(taskEditada.atividadeVinculada || '');
        setDetalhes(taskEditada.detalhes || '');
      } else {
        setNome('');
        setData('');
        setHorario('');
        setCor('#000000');
        setAtividadeVinculada('');
        setDetalhes('');
      }
    }
  }, [isOpen, taskEditada]);

  if (!isOpen) return null;

  const handleSalvar = () => {
    setErro('');
    if (!nome.trim()) return setErro('Preencha o nome da tarefa.');

    const tarefa = {
      id: taskEditada ? taskEditada.id : Date.now().toString(),
      nome: nome.trim(),
      data: data || '',
      horario: horario || '',
      cor,
      atividadeVinculada,
      detalhes: detalhes.trim(),
      concluida: taskEditada ? taskEditada.concluida : false
    };

    onSave(tarefa);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold">{taskEditada ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
        
        {erro && <div className="p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-xs">{erro}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1 text-zinc-400">Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Estudar matemática" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none" />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1 text-zinc-400">Data (Opcional)</label>
              <input type="date" value={data} onChange={e => setData(data)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none [color-scheme:dark]" />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1 text-zinc-400">Horário (Opcional)</label>
              <input type="time" value={horario} onChange={e => setHorario(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none [color-scheme:dark]" />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-2 text-zinc-400">Cor</label>
            <div className="flex gap-2 items-center flex-wrap">
              {predefinedColors.map(c => (
                <button key={c} type="button" onClick={() => setCor(c)} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${cor === c ? 'border-white' : 'border-transparent'}`} style={{backgroundColor: c}}></button>
              ))}
              <span className="text-zinc-700">|</span>
              <input type="color" value={cor} onChange={e => setCor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1 text-zinc-400">Vincular à Atividade (Opcional)</label>
            <select value={atividadeVinculada} onChange={e => setAtividadeVinculada(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none">
              <option value="">Nenhuma</option>
              {atividades.map(atv => (
                <option key={atv.id} value={atv.id}>{atv.apelido || atv.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1 text-zinc-400">Detalhes</label>
            <textarea rows={2} value={detalhes} onChange={e => setDetalhes(e.target.value)} placeholder="Informações adicionais..." className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100 focus:outline-none resize-none"></textarea>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-6">
          {taskEditada ? (
            <button type="button" onClick={() => { onDelete(taskEditada.id); onClose(); }} className="text-red-500 hover:text-red-400 text-xs">Excluir</button>
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