import { useState, useEffect } from 'react';
import useVoltar from '../hooks/useVoltar';

export default function ActivityModal({ isOpen, onClose, onSave, onDelete, atividadeEditada, categorias, coresUsadas, modoVisualizacaoInicial = false, disciplinaVinculada = null, treinos = [], treinoVinculado = null, onAbrirTreino = () => {}, modelo = null }) {
  useVoltar(isOpen, onClose);
  const predefinedColors = ['#000000', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#64748b'];
  const paletaCores = Array.from(new Set([...predefinedColors, ...coresUsadas]));

  const [isEditMode, setIsEditMode] = useState(!modoVisualizacaoInicial);
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [horarios, setHorarios] = useState([{ dia: 'SEG', inicio: '', fim: '' }]);
  const [corSelecionada, setCorSelecionada] = useState(predefinedColors[1]);
  const [categoria, setCategoria] = useState(categorias[0] || 'Treinos');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [detalhes, setDetalhes] = useState('');
  const [treinoId, setTreinoId] = useState('');
  const [erro, setErro] = useState('');
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setErro('');
      setConfirmarExclusao(false);
      setIsEditMode(!modoVisualizacaoInicial);
      if (atividadeEditada) {
        setNome(atividadeEditada.nome);
        setApelido(atividadeEditada.apelido || '');
        setHorarios((atividadeEditada.horarios || []).map(h => ({ ...h })));
        setCorSelecionada(atividadeEditada.cor);
        setCategoria(categorias.includes(atividadeEditada.categoria) ? atividadeEditada.categoria : 'Outros');
        setDetalhes(atividadeEditada.detalhes || '');
        setTreinoId(atividadeEditada.treinoId || '');
      } else {
        setNome('');
        setApelido('');
        setHorarios([{ dia: 'SEG', inicio: '', fim: '' }]);
        setCorSelecionada(predefinedColors[1]);
        // atividade nova; "modelo" vem de "Agendar na grade" (treino já escolhido, nome e categoria preenchidos)
        setNome(modelo?.nome || '');
        setCategoria(modelo?.categoria && categorias.includes(modelo.categoria) ? modelo.categoria : (categorias[0] || 'Treinos'));
        setNovaCategoria('');
        setDetalhes(modelo?.detalhes || '');
        setTreinoId(modelo?.treinoId || '');
        setIsEditMode(true);
      }
    }
  }, [isOpen, atividadeEditada, categorias, modoVisualizacaoInicial, modelo]);

  if (!isOpen) return null;

  const handleSalvar = () => {
    setErro('');
    if (!nome) return setErro('Preencha o nome da atividade.');
    if (horarios.some(h => !h.inicio || !h.fim)) return setErro('Preencha os horários de início e fim.');
    
    for (let h of horarios) {
      if (h.inicio === h.fim) return setErro(`Horário inválido em ${h.dia}: início e fim não podem ser iguais.`);
    }

    if (categoria === 'Criar nova categoria...' && !novaCategoria.trim()) {
      return setErro('Digite o nome da nova categoria.');
    }

    const categoriaFinal = categoria === 'Criar nova categoria...' ? novaCategoria.trim() : categoria;

    const atividade = {
      id: atividadeEditada ? atividadeEditada.id : Date.now().toString(),
      nome,
      apelido: apelido.trim(),
      horarios,
      cor: corSelecionada,
      categoria: categoriaFinal,
      detalhes,
      ...(treinoId ? { treinoId } : {})
    };

    onSave(atividade);
    onClose();
  };

  const handleExcluir = () => {
    if (!confirmarExclusao) {
      setConfirmarExclusao(true);
      return;
    }
    onDelete(atividadeEditada.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-lg p-6 overflow-y-auto max-h-[90vh] shadow-2xl">
        <h2 className="text-xl font-bold mb-6">
          {atividadeEditada ? (isEditMode ? 'Editar Atividade' : 'Detalhes da Atividade') : 'Nova Atividade'}
        </h2>
        
        {erro && <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">{erro}</div>}

        {!isEditMode && atividadeEditada ? (
          <div className="space-y-4">
            <div>
              <span className="text-xs text-zinc-400 block">Nome</span>
              <p className="text-lg font-semibold">{atividadeEditada.nome}</p>
            </div>
            <div className="flex gap-4">
              {atividadeEditada.apelido && (
                <div>
                  <span className="text-xs text-zinc-400 block">Apelido</span>
                  <p className="bg-zinc-950 px-2 py-1 rounded inline-block">{atividadeEditada.apelido}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-zinc-400 block">Categoria</span>
                <p className="px-2 py-1 bg-zinc-800 rounded inline-block text-sm">{atividadeEditada.categoria}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-400 block mb-1">Horários</span>
              <div className="space-y-1 bg-zinc-950 p-3 rounded">
                {(atividadeEditada.horarios || []).map((h, i) => (
                  <div key={i} className="text-sm text-zinc-300">
                    <span className="font-bold">{h.dia}:</span> {h.inicio} até {h.fim}{h.fim < h.inicio ? ' (dia seguinte)' : ''}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="text-xs text-zinc-400 block">Cor</span>
              <div className="w-6 h-6 rounded-full mt-1 border border-white/20" style={{ backgroundColor: atividadeEditada.cor }}></div>
            </div>
            {disciplinaVinculada && (
              <div>
                <span className="text-xs text-zinc-400 block mb-1">Disciplina vinculada</span>
                <div className="bg-zinc-950 p-3 rounded text-sm text-zinc-300">
                  <div className="font-bold text-white">{disciplinaVinculada.nome || 'Sem nome'}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {disciplinaVinculada.temNota ? (
                      <>
                        <span>Nota: <span className={`font-bold ${disciplinaVinculada.vermelha ? 'text-red-500' : 'text-white'}`}>{disciplinaVinculada.obtida.toFixed(2)} / {disciplinaVinculada.avaliado.toFixed(2)} - {disciplinaVinculada.percentual.toFixed(2)}%</span></span>
                        {disciplinaVinculada.vermelha && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Atenção: nota abaixo do necessário"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        )}
                      </>
                    ) : <span className="text-zinc-500">Ainda sem notas lançadas</span>}
                  </div>
                  <div className="text-xs text-zinc-500 mt-0.5">Passa com {disciplinaVinculada.aprovacao}% de {disciplinaVinculada.pontosTotais} pontos</div>
                </div>
              </div>
            )}
            {treinoVinculado && (
              <div>
                <span className="text-xs text-zinc-400 block mb-1">Treino vinculado</span>
                <div className="bg-zinc-950 p-3 rounded text-sm text-zinc-300">
                  <div className="font-bold text-white">{treinoVinculado.nome}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{treinoVinculado.exercicios} exercícios · {treinoVinculado.series} séries</div>
                  <div className="flex gap-2 mt-2">
                    <button type="button" onClick={() => onAbrirTreino(treinoVinculado.id, false)} className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded font-bold">Ver treino</button>
                    <button type="button" onClick={() => onAbrirTreino(treinoVinculado.id, true)} className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold">Registrar sessão</button>
                  </div>
                </div>
              </div>
            )}
            {atividadeEditada.detalhes && (
              <div>
                <span className="text-xs text-zinc-400 block">Detalhes</span>
                <p className="bg-zinc-950 p-3 rounded text-sm text-zinc-300 whitespace-pre-wrap">{atividadeEditada.detalhes}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4 mt-6 border-t border-zinc-800/50">
              <button 
                onClick={handleExcluir} 
                className={`text-sm font-medium px-3 py-1.5 rounded transition-colors ${confirmarExclusao ? 'bg-red-600 text-white' : 'text-red-500 hover:text-red-400'}`}
              >
                {confirmarExclusao ? 'Clique novamente para confirmar' : 'Excluir'}
              </button>
              
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">Fechar</button>
                <button onClick={() => setIsEditMode(true)} className="px-6 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium">Editar</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm mb-1 text-zinc-400">Nome</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 focus:outline-none focus:border-zinc-500" />
              </div>
              <div className="w-40">
                <label className="block text-sm mb-1 text-zinc-400">Apelido (opcional)</label>
                <input type="text" value={apelido} onChange={e => setApelido(e.target.value)} maxLength={30} placeholder="Ex: AL" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm mb-2 text-zinc-400">Horários</label>
              {horarios.map((h, i) => (
                <div key={i} className="flex gap-2 mb-2 items-center">
                  <select value={h.dia} onChange={(e) => { setHorarios(horarios.map((x, idx) => idx === i ? { ...x, dia: e.target.value } : x)); }} className="bg-zinc-950 border border-zinc-700 rounded p-2 outline-none">
                    {['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'].map(d => <option key={d}>{d}</option>)}
                  </select>
                  <input type="time" value={h.inicio} onChange={(e) => { setHorarios(horarios.map((x, idx) => idx === i ? { ...x, inicio: e.target.value } : x)); }} className="bg-zinc-950 border border-zinc-700 rounded p-2 flex-1 [color-scheme:dark]" />
                  <span className="text-zinc-500">até</span>
                  <input type="time" value={h.fim} onChange={(e) => { setHorarios(horarios.map((x, idx) => idx === i ? { ...x, fim: e.target.value } : x)); }} className="bg-zinc-950 border border-zinc-700 rounded p-2 flex-1 [color-scheme:dark]" />
                  {horarios.length > 1 && (
                    <button onClick={() => setHorarios(horarios.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-400 ml-1 px-2 font-bold text-base bg-transparent border-none">×</button>
                  )}
                  {h.inicio && h.fim && h.fim < h.inicio && <span className="text-[10px] text-zinc-500 whitespace-nowrap">dia seguinte</span>}
                </div>
              ))}
              <button onClick={() => setHorarios([...horarios, { ...horarios[horarios.length - 1] }])} className="text-sm text-zinc-400 hover:text-white mt-1">+ Adicionar horário</button>
            </div>

            <div>
               <label className="block text-sm mb-2 text-zinc-400">Cor</label>
               <div className="flex gap-3 items-center flex-wrap">
                 {paletaCores.map(cor => (
                   <button key={cor} onClick={() => setCorSelecionada(cor)} className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${corSelecionada === cor ? 'border-white' : 'border-transparent'}`} style={{backgroundColor: cor}}></button>
                 ))}
                 <span className="text-zinc-700 ml-1 mr-1">|</span>
                 <input type="color" value={corSelecionada} onChange={(e) => setCorSelecionada(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent border-0 p-0" />
               </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm mb-1 text-zinc-400">Categoria</label>
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 outline-none">
                {categorias.map(cat => <option key={cat}>{cat}</option>)}
                <option>Criar nova categoria...</option>
              </select>
              {categoria === 'Criar nova categoria...' && (
                <input type="text" placeholder="Nome da nova categoria" value={novaCategoria} onChange={(e) => setNovaCategoria(e.target.value)} className="w-full bg-zinc-950 border border-zinc-500 rounded p-2 focus:outline-none text-zinc-100" />
              )}
            </div>

            {(treinos.length > 0 || treinoId) && (
              <div>
                <label className="block text-sm mb-1 text-zinc-400">Treino vinculado (opcional)</label>
                <select value={treinoId} onChange={(e) => { const v = e.target.value; setTreinoId(v); const t = treinos.find((x) => x.id === v); if (t && !nome.trim()) setNome(t.nome); }} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 outline-none">
                  <option value="">Nenhum</option>
                  {treinos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  {treinoId && !treinos.some((t) => t.id === treinoId) && <option value={treinoId}>(treino excluído)</option>}
                </select>
                <p className="text-[11px] text-zinc-500 mt-1">O dia e o horário são os desta atividade. Ao tocar nela na grade você abre o treino e registra a sessão.</p>
              </div>
            )}

            <div>
              <label className="block text-sm mb-1 text-zinc-400">Detalhes</label>
              <textarea rows={2} value={detalhes} onChange={e => setDetalhes(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 focus:outline-none resize-none"></textarea>
            </div>

            <div className="flex justify-between items-center pt-4 mt-6 border-t border-zinc-800/50">
              {atividadeEditada ? (
                <button onClick={() => { onDelete(atividadeEditada.id); onClose(); }} className="text-red-500 hover:text-red-400 text-sm font-medium">Excluir</button>
              ) : <div></div>}
              
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">Cancelar</button>
                <button onClick={handleSalvar} className="px-6 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium">Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
