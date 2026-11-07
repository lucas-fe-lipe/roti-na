import { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Notas({ user, atividades }) {
  const [cursos, setCursos] = useState([]);
  
  const [cursoModal, setCursoModal] = useState({ open: false, data: null });
  const [periodoModal, setPeriodoModal] = useState({ open: false, data: null, cursoId: null });
  const [disciplinaModal, setDisciplinaModal] = useState({ open: false, data: null, periodoId: null, cursoId: null });

  const [cursosMinimizados, setCursosMinimizados] = useState({});
  const [periodosMinimizados, setPeriodosMinimizados] = useState({});

  // Inicializa cursos e períodos como minimizados assim que os dados carregam
  useEffect(() => {
    const minCursos = {};
    const minPeriodos = {};
    cursos.forEach(c => {
      minCursos[c.id] = true;
      c.periodos?.forEach(p => {
        minPeriodos[p.id] = true;
      });
    });
    setCursosMinimizados(minCursos);
    setPeriodosMinimizados(minPeriodos);
  }, [cursos.length]); // Depende do tamanho para não re-renderizar em edições simples

  useEffect(() => {
    if (user) {
      const unsub = onSnapshot(collection(db, 'users', user.uid, 'cursos'), (snap) => {
        setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => unsub();
    } else {
      const salvos = localStorage.getItem('local_cursos');
      if (salvos) setCursos(JSON.parse(salvos));
    }
  }, [user]);

  const persistirLocal = (novosCursos) => {
    setCursos(novosCursos);
    if (!user) {
      localStorage.setItem('local_cursos', JSON.stringify(novosCursos));
    }
  };

  const toggleMinimizarCurso = (id) => setCursosMinimizados(p => ({ ...p, [id]: !p[id] }));
  const toggleMinimizarPeriodo = (id) => setPeriodosMinimizados(p => ({ ...p, [id]: !p[id] }));

  // SALVAR CURSO
  const salvarCurso = async (curso) => {
    const id = curso.id || Date.now().toString();
    const novoCurso = { ...curso, id, periodos: curso.periodos || [] };
    
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'cursos', id), novoCurso);
    } else {
      const existe = cursos.find(c => c.id === id);
      const atualizados = existe ? cursos.map(c => c.id === id ? novoCurso : c) : [...cursos, novoCurso];
      persistirLocal(atualizados);
    }
    setCursoModal({ open: false, data: null });
  };

  const excluirCurso = async (id) => {
    if(window.confirm('Tem certeza que deseja excluir o curso inteiro?')) {
      if (user) {
        await deleteDoc(doc(db, 'users', user.uid, 'cursos', id));
      } else {
        persistirLocal(cursos.filter(c => c.id !== id));
      }
    }
  };

  // SALVAR PERÍODO
  const salvarPeriodo = async (periodo, cursoId) => {
    const curso = cursos.find(c => c.id === cursoId);
    if (!curso) return;
    const id = periodo.id || Date.now().toString();
    const novoPeriodo = { ...periodo, id, disciplinas: periodo.disciplinas || [] };
    
    let novosPeriodos = [...curso.periodos];
    const index = novosPeriodos.findIndex(p => p.id === id);
    if (index >= 0) novosPeriodos[index] = novoPeriodo;
    else novosPeriodos.push(novoPeriodo);

    const cursoAtualizado = { ...curso, periodos: novosPeriodos };
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'cursos', cursoId), cursoAtualizado);
    } else {
      persistirLocal(cursos.map(c => c.id === cursoId ? cursoAtualizado : c));
    }
    setPeriodoModal({ open: false, data: null, cursoId: null });
  };

  const excluirPeriodo = async (periodoId, cursoId) => {
    if(window.confirm('Excluir este período?')) {
      const curso = cursos.find(c => c.id === cursoId);
      const novosPeriodos = curso.periodos.filter(p => p.id !== periodoId);
      const cursoAtualizado = { ...curso, periodos: novosPeriodos };
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'cursos', cursoId), cursoAtualizado);
      } else {
        persistirLocal(cursos.map(c => c.id === cursoId ? cursoAtualizado : c));
      }
    }
  };

  // SALVAR DISCIPLINA
  const salvarDisciplina = async (disciplina, periodoId, cursoId) => {
    const curso = cursos.find(c => c.id === cursoId);
    if (!curso) return;
    const id = disciplina.id || Date.now().toString();
    const novaDisciplina = { ...disciplina, id };
    
    let novosPeriodos = [...curso.periodos];
    const pIndex = novosPeriodos.findIndex(p => p.id === periodoId);
    let novasDisciplinas = [...novosPeriodos[pIndex].disciplinas];
    
    const dIndex = novasDisciplinas.findIndex(d => d.id === id);
    if (dIndex >= 0) novasDisciplinas[dIndex] = novaDisciplina;
    else novasDisciplinas.push(novaDisciplina);
    
    novosPeriodos[pIndex].disciplinas = novasDisciplinas;
    const cursoAtualizado = { ...curso, periodos: novosPeriodos };

    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'cursos', cursoId), cursoAtualizado);
    } else {
      persistirLocal(cursos.map(c => c.id === cursoId ? cursoAtualizado : c));
    }
    setDisciplinaModal({ open: false, data: null, periodoId: null, cursoId: null });
  };

  const excluirDisciplina = async (disciplinaId, periodoId, cursoId) => {
    if(window.confirm('Excluir esta disciplina?')) {
      const curso = cursos.find(c => c.id === cursoId);
      let novosPeriodos = [...curso.periodos];
      const pIndex = novosPeriodos.findIndex(p => p.id === periodoId);
      novosPeriodos[pIndex].disciplinas = novosPeriodos[pIndex].disciplinas.filter(d => d.id !== disciplinaId);
      const cursoAtualizado = { ...curso, periodos: novosPeriodos };
      if (user) {
        await setDoc(doc(db, 'users', user.uid, 'cursos', cursoId), cursoAtualizado);
      } else {
        persistirLocal(cursos.map(c => c.id === cursoId ? cursoAtualizado : c));
      }
    }
  };

  const calcAvaliacoes = (avaliacoes = []) => {
    let maxTotal = 0, obtidaTotal = 0;
    avaliacoes.forEach(a => {
      if (a.obtida !== '' && !isNaN(a.obtida)) {
        maxTotal += Number(a.max) || 0;
        obtidaTotal += Number(a.obtida) || 0;
      }
    });
    const percentual = maxTotal > 0 ? (obtidaTotal / maxTotal) * 100 : 0;
    return { maxTotal, obtidaTotal, percentual };
  };

  const calcCRA = (disciplinas, tipoMedia) => {
    let somaNotas = 0, somaPesos = 0, hasNotas = false;
    disciplinas.forEach(d => {
      const { maxTotal, obtidaTotal, percentual } = calcAvaliacoes(d.avaliacoes);
      if (maxTotal > 0) hasNotas = true;
      const peso = tipoMedia === 'ponderada' ? (Number(d.cargaHoraria) || 1) : 1;
      somaNotas += percentual * peso;
      somaPesos += peso;
    });
    return { cra: somaPesos > 0 ? (somaNotas / somaPesos) : 0, hasNotas };
  };

  const isAtual = (inicio, fim) => {
    const hoje = new Date().toISOString().split('T')[0];
    return (inicio <= hoje && fim >= hoje);
  };

  const statusCores = {
    'A Cursar': 'bg-zinc-700',
    'Cursando': 'bg-blue-600',
    'Concluída': 'bg-green-700',
    'Reprovado': 'bg-red-600',
    'Reprovado por falta': 'bg-red-600'
  };

  return (
    <div className="w-full max-w-full overflow-hidden flex flex-col gap-4">
      {cursos.length === 0 && (
        <div className="flex justify-start">
          <button onClick={() => setCursoModal({ open: true, data: null })} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded font-medium text-sm transition-colors">
            + Adicionar Curso
          </button>
        </div>
      )}

      {cursos.map(curso => {
        const isMin = cursosMinimizados[curso.id] !== false; // Inicializa minimizado
        let totalHorasMeta = 0;
        curso.tiposHoras.forEach(t => totalHorasMeta += Number(t.quantidade));
        
        let horasConcluidasPorTipo = {};
        let todasDisciplinas = [];
        curso.periodos?.forEach(p => {
          todasDisciplinas = [...todasDisciplinas, ...(p.disciplinas || [])];
          p.disciplinas?.forEach(d => {
            if (d.status === 'Concluída') {
              horasConcluidasPorTipo[d.tipoHora] = (horasConcluidasPorTipo[d.tipoHora] || 0) + Number(d.cargaHoraria);
            }
          });
        });

        let totalHorasConcluidas = Object.values(horasConcluidasPorTipo).reduce((a, b) => a + b, 0);
        const { cra: craGeral, hasNotas: cursoHasNotas } = calcCRA(todasDisciplinas, 'ponderada');

        const hoje = new Date().toISOString().split('T')[0];
        const periodosAtuais = (curso.periodos || []).filter(p => p.dataInicio <= hoje && p.dataFim >= hoje);
        const periodosPassados = (curso.periodos || []).filter(p => p.dataFim < hoje).sort((a, b) => new Date(b.dataFim) - new Date(a.dataFim));
        const periodosFuturos = (curso.periodos || []).filter(p => p.dataInicio > hoje).sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));
        const periodosOrdenados = [...periodosAtuais, ...periodosPassados, ...periodosFuturos];

        return (
          <div key={curso.id} className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 shadow-lg mb-2">
            
            {/* CABEÇALHO DO CURSO COMPACTO E RESPONSIVO */}
            <div className="flex flex-col">
              <div className="flex items-start justify-between gap-2 w-full">
                <button onClick={() => toggleMinimizarCurso(curso.id)} className="text-zinc-400 hover:text-white font-bold text-sm mt-1 shrink-0">
                  {isMin ? '▶\uFE0E' : '▼\uFE0E'}
                </button>
                <h2 className="text-lg sm:text-xl font-bold text-white flex-1 break-words leading-tight">{curso.nome} - {curso.instituicao}</h2>
                <button onClick={() => setCursoModal({ open: true, data: curso })} className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0">Editar</button>
              </div>
              <div className="flex flex-wrap justify-between gap-2 mt-3 text-xs sm:text-sm font-medium text-gray-300 pl-6 pr-2">
                <span>CRA Geral: <span className={(cursoHasNotas && craGeral < 60) ? 'text-red-500' : 'text-white'}>{craGeral.toFixed(2)}</span></span>
                <span>{totalHorasConcluidas}h / {totalHorasMeta}h ({(totalHorasMeta > 0 ? (totalHorasConcluidas/totalHorasMeta)*100 : 0).toFixed(2)}%)</span>
              </div>
            </div>

            {!isMin && (
              <div className="mt-4 flex flex-col gap-3">
                {periodosOrdenados.map(periodo => {
                  const isMinPer = periodosMinimizados[periodo.id] !== false; // Inicializa minimizado
                  const { cra: craPeriodo, hasNotas: perHasNotas } = calcCRA(periodo.disciplinas || [], periodo.tipoMedia);
                  let horasPeriodo = 0;
                  periodo.disciplinas?.forEach(d => { if (d.status === 'Concluída') horasPeriodo += Number(d.cargaHoraria) || 0; });
                  const perAtual = isAtual(periodo.dataInicio, periodo.dataFim);

                  return (
                    <div key={periodo.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 w-full">
                      
                      {/* CABEÇALHO DO PERÍODO COMPACTO */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => toggleMinimizarPeriodo(periodo.id)} className="text-zinc-400 hover:text-white font-bold text-xs shrink-0">
                          {isMinPer ? '▶\uFE0E' : '▼\uFE0E'}
                        </button>
                        <span className="font-bold text-white text-sm sm:text-base truncate">{periodo.nome}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500">({periodo.dataInicio} até {periodo.dataFim})</span>
                        {perAtual && <span className="bg-blue-600 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded text-white font-bold shrink-0">ATUAL</span>}
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 mt-2 pl-5 sm:pl-6 w-full">
                        <span>CRA: <span className={`font-bold ${(perHasNotas && craPeriodo < 60) ? 'text-red-500' : 'text-white'}`}>{craPeriodo.toFixed(2)}</span> | Horas: <span className="font-bold text-white">{horasPeriodo}h</span></span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button onClick={() => setPeriodoModal({ open: true, data: periodo, cursoId: curso.id })} className="bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700 text-zinc-300 text-[10px] sm:text-xs">Editar</button>
                          <button onClick={() => setDisciplinaModal({ open: true, data: null, periodoId: periodo.id, cursoId: curso.id })} className="bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-[10px] sm:text-xs">+ Disciplina</button>
                        </div>
                      </div>

                      {!isMinPer && (
                        <div className="mt-3 flex flex-col gap-2">
                          {periodo.disciplinas?.map(disc => {
                            const { maxTotal, obtidaTotal, percentual } = calcAvaliacoes(disc.avaliacoes);
                            const isDiscRed = maxTotal > 0 && percentual < 60;
                            
                            return (
                              <div key={disc.id} onClick={() => setDisciplinaModal({ open: true, data: disc, periodoId: periodo.id, cursoId: curso.id })} className="bg-zinc-800/40 p-2.5 sm:p-3 rounded-lg flex justify-between items-center border border-zinc-800/60 cursor-pointer hover:border-zinc-700 transition-colors w-full">
                                
                                {/* DADOS DA DISCIPLINA - COM QUEBRA DE LINHA CORRETA */}
                                <div className="flex-1 min-w-0 pr-2">
                                  <h4 className="font-bold text-white text-xs sm:text-sm truncate w-full">{disc.nome}</h4>
                                  {disc.professor && <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate w-full">Prof: {disc.professor}</div>}
                                  <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 flex flex-wrap gap-1 leading-tight">
                                    <span>{disc.cargaHoraria}h • {disc.tipoHora} • Nota: </span>
                                    <span className={`font-bold ${isDiscRed ? 'text-red-500' : 'text-white'}`}>
                                      {obtidaTotal.toFixed(1)} / {maxTotal.toFixed(1)} - {percentual.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>

                                {/* ETIQUETA À DIREITA */}
                                <div className={`${statusCores[disc.status] || 'bg-zinc-700'} text-white text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-1 sm:py-1.5 rounded ml-1 shrink-0 uppercase tracking-wide`}>
                                  {disc.status}
                                </div>
                                
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="flex justify-start mt-1">
                  <button onClick={() => setPeriodoModal({ open: true, data: null, cursoId: curso.id })} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded text-xs font-medium transition-colors border border-zinc-700">
                    + Adicionar Período
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {cursos.length > 0 && (
        <div className="flex justify-start mt-2">
          <button onClick={() => setCursoModal({ open: true, data: null })} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded font-medium text-sm transition-colors border border-zinc-700">
            + Adicionar Curso
          </button>
        </div>
      )}

      {cursoModal.open && <ModalCurso cursoInicial={cursoModal.data} onClose={() => setCursoModal({ open: false, data: null })} onSave={salvarCurso} onDelete={excluirCurso} />}
      {periodoModal.open && <ModalPeriodo periodoInicial={periodoModal.data} onClose={() => setPeriodoModal({ open: false, data: null, cursoId: null })} onSave={(p) => salvarPeriodo(p, periodoModal.cursoId)} onDelete={(id) => excluirPeriodo(id, periodoModal.cursoId)} />}
      {disciplinaModal.open && (
        <ModalDisciplina 
          disciplinaInicial={disciplinaModal.data} 
          tiposHoras={cursos.find(c => c.id === disciplinaModal.cursoId)?.tiposHoras || []} 
          atividades={atividades}
          onClose={() => setDisciplinaModal({ open: false, data: null, periodoId: null, cursoId: null })} 
          onSave={(d) => salvarDisciplina(d, disciplinaModal.periodoId, disciplinaModal.cursoId)} 
          onDelete={(id) => excluirDisciplina(id, disciplinaModal.periodoId, disciplinaModal.cursoId)} 
        />
      )}
    </div>
  );
}

// OS COMPONENTES ModalCurso, ModalPeriodo e ModalDisciplina CONTINUAM EXATAMENTE IGUAIS
function ModalCurso({ cursoInicial, onClose, onSave, onDelete }) {
  const [curso, setCurso] = useState(cursoInicial || { nome: '', instituicao: '', dataInicio: '', dataFim: '', tiposHoras: [{ id: Date.now().toString(), nome: 'Obrigatória', quantidade: '' }] });

  const handleTipoHoraChange = (id, field, value) => {
    setCurso(p => ({ ...p, tiposHoras: p.tiposHoras.map(t => t.id === id ? { ...t, [field]: value } : t) }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-zinc-800">
        <h2 className="text-xl font-bold">{cursoInicial ? 'Editar Curso' : 'Novo Curso'}</h2>
        
        <div className="space-y-3">
          <div><label className="block text-sm text-zinc-400 mb-1">Nome</label><input type="text" value={curso.nome} onChange={e => setCurso({...curso, nome: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
          <div><label className="block text-sm text-zinc-400 mb-1">Instituição</label><input type="text" value={curso.instituicao} onChange={e => setCurso({...curso, instituicao: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-sm text-zinc-400 mb-1">Início</label><input type="date" value={curso.dataInicio} onChange={e => setCurso({...curso, dataInicio: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white [color-scheme:dark]" /></div>
            <div className="flex-1"><label className="block text-sm text-zinc-400 mb-1">Fim (Previsão)</label><input type="date" value={curso.dataFim} onChange={e => setCurso({...curso, dataFim: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white [color-scheme:dark]" /></div>
          </div>
          
          <div className="pt-2">
            <label className="block text-sm font-bold text-zinc-300 mb-2">Tipos de Horas & Metas</label>
            {curso.tiposHoras.map(t => (
              <div key={t.id} className="flex gap-2 mb-2 items-center">
                <input type="text" value={t.nome} onChange={e => handleTipoHoraChange(t.id, 'nome', e.target.value)} placeholder="Ex: Obrigatória" className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" />
                <input type="number" value={t.quantidade} onChange={e => handleTipoHoraChange(t.id, 'quantidade', e.target.value)} placeholder="Horas" className="w-24 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" />
                <button onClick={() => setCurso(p => ({...p, tiposHoras: p.tiposHoras.filter(x => x.id !== t.id)}))} className="bg-red-900/50 hover:bg-red-800 text-red-300 px-2.5 py-1.5 rounded text-sm font-bold">X</button>
              </div>
            ))}
            <button onClick={() => setCurso(p => ({...p, tiposHoras: [...p.tiposHoras, { id: Date.now().toString(), nome: '', quantidade: '' }]}))} className="text-xs text-blue-400 hover:text-blue-300 font-medium">+ Adicionar Tipo</button>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-4">
          {cursoInicial ? <button onClick={() => onDelete(curso.id)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium text-sm">Excluir</button> : <div></div>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:bg-zinc-800 text-sm">Cancelar</button>
            <button onClick={() => onSave(curso)} className="px-4 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalPeriodo({ periodoInicial, onClose, onSave, onDelete }) {
  const [periodo, setPeriodo] = useState(periodoInicial || { nome: '', dataInicio: '', dataFim: '', tipoMedia: 'ponderada' });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-sm p-6 shadow-2xl space-y-4 border border-zinc-800">
        <h2 className="text-xl font-bold">{periodoInicial ? 'Editar Período' : 'Novo Período'}</h2>
        
        <div className="space-y-3">
          <div><label className="block text-sm text-zinc-400 mb-1">Nome</label><input type="text" value={periodo.nome} onChange={e => setPeriodo({...periodo, nome: e.target.value})} placeholder="Ex: 1º Período" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-sm text-zinc-400 mb-1">Início</label><input type="date" value={periodo.dataInicio} onChange={e => setPeriodo({...periodo, dataInicio: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white [color-scheme:dark]" /></div>
            <div className="flex-1"><label className="block text-sm text-zinc-400 mb-1">Fim</label><input type="date" value={periodo.dataFim} onChange={e => setPeriodo({...periodo, dataFim: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white [color-scheme:dark]" /></div>
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Tipo de Média</label>
            <select value={periodo.tipoMedia} onChange={e => setPeriodo({...periodo, tipoMedia: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white">
              <option value="ponderada">Ponderada (Carga Horária)</option>
              <option value="simples">Aritmética Simples</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-4">
          {periodoInicial ? <button onClick={() => onDelete(periodo.id)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium text-sm">Excluir</button> : <div></div>}
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded text-zinc-400 hover:bg-zinc-800 text-sm">Cancelar</button>
            <button onClick={() => onSave(periodo)} className="px-4 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalDisciplina({ disciplinaInicial, tiposHoras, atividades, onClose, onSave, onDelete }) {
  const [disc, setDisc] = useState(disciplinaInicial || { nome: '', professor: '', cargaHoraria: '', tipoHora: tiposHoras[0]?.nome || '', status: 'Cursando', atividadeVinculada: '', avaliacoes: [] });

  const hAv = (id, f, v) => setDisc(p => ({ ...p, avaliacoes: p.avaliacoes.map(a => a.id === id ? { ...a, [f]: v } : a) }));
  
  let maxT = 0, obtT = 0;
  disc.avaliacoes.forEach(a => { if (a.obtida !== '' && !isNaN(a.obtida)) { maxT += Number(a.max)||0; obtT += Number(a.obtida)||0; }});
  const percFinal = maxT > 0 ? (obtT / maxT) * 100 : 0;
  const isDiscRed = maxT > 0 && percFinal < 60;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-zinc-800">
        <h2 className="text-xl font-bold">{disciplinaInicial ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>
        
        <div className="space-y-3">
          <div><label className="block text-xs font-semibold text-zinc-400 mb-1">Nome</label><input type="text" value={disc.nome} onChange={e => setDisc({...disc, nome: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
          <div><label className="block text-xs font-semibold text-zinc-400 mb-1">Professor</label><input type="text" value={disc.professor} onChange={e => setDisc({...disc, professor: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-xs font-semibold text-zinc-400 mb-1">Carga (H)</label><input type="number" value={disc.cargaHoraria} onChange={e => setDisc({...disc, cargaHoraria: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Tipo</label>
              <select value={disc.tipoHora} onChange={e => setDisc({...disc, tipoHora: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm">
                <option value="">Selecione...</option>
                {tiposHoras.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Status</label>
            <select value={disc.status} onChange={e => setDisc({...disc, status: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm">
              <option value="A Cursar">A Cursar</option>
              <option value="Cursando">Cursando</option>
              <option value="Concluída">Concluída</option>
              <option value="Reprovado">Reprovado</option>
              <option value="Reprovado por falta">Reprovado por falta</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Vincular Atividade (Opcional)</label>
            <select value={disc.atividadeVinculada} onChange={e => setDisc({...disc, atividadeVinculada: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm">
              <option value="">Nenhuma</option>
              {atividades?.map(a => <option key={a.id} value={a.id}>{a.apelido || a.nome}</option>)}
            </select>
          </div>

          <div className="pt-3 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-3">
              <label className="text-sm font-bold text-zinc-300">Avaliações</label>
              <button onClick={() => setDisc(p => ({...p, avaliacoes: [...p.avaliacoes, { id: Date.now().toString(), nome: `P${p.avaliacoes.length+1}`, max: '', obtida: '' }]}))} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 rounded text-xs border border-zinc-600 font-bold tracking-wide">+ Prova</button>
            </div>
            
            <div className="space-y-2">
              {disc.avaliacoes.map(av => {
                const isCalculable = av.max !== '' && av.obtida !== '';
                const pLocal = isCalculable ? ((Number(av.obtida)/Number(av.max))*100).toFixed(1)+'%' : '-';
                return (
                  <div key={av.id} className="flex gap-2 items-center">
                    <input type="text" value={av.nome} onChange={e => hAv(av.id, 'nome', e.target.value)} placeholder="Nome" className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" />
                    <input type="number" value={av.max} onChange={e => hAv(av.id, 'max', e.target.value)} placeholder="Total" className="w-16 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm text-center" />
                    <input type="number" value={av.obtida} onChange={e => hAv(av.id, 'obtida', e.target.value)} placeholder="Nota" className="w-16 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm text-center" />
                    <span className="w-12 text-right text-[10px] font-bold text-zinc-400">{pLocal}</span>
                    <button onClick={() => setDisc(p => ({...p, avaliacoes: p.avaliacoes.filter(x => x.id !== av.id)}))} className="bg-red-500 hover:bg-red-400 text-white w-7 h-7 flex items-center justify-center rounded text-xs font-bold shrink-0">X</button>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 text-xs font-medium text-zinc-400">
              Nota Final: <span className={`font-bold text-sm ${isDiscRed ? 'text-red-500' : 'text-white'}`}>{obtT.toFixed(1)} / {maxT.toFixed(1)} - {percFinal.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-4">
          {disciplinaInicial ? (
            <button onClick={() => onDelete(disc.id)} className="text-red-500 hover:text-red-400 font-bold text-sm">Excluir</button>
          ) : <div></div>}
          
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 font-bold text-sm transition-colors">Cancelar</button>
            <button onClick={() => onSave(disc)} className="px-4 py-2 bg-zinc-600 text-white rounded hover:bg-zinc-500 font-bold text-sm transition-colors">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
