import { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Notas({ user, atividades, isAvaliacoesOpen, setIsAvaliacoesOpen }) {
  const [cursos, setCursos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  
  const [cursoModal, setCursoModal] = useState({ open: false, data: null });
  const [periodoModal, setPeriodoModal] = useState({ open: false, data: null, cursoId: null });
  const [disciplinaModal, setDisciplinaModal] = useState({ open: false, data: null, periodoId: null, cursoId: null });

  const [cursosMinimizados, setCursosMinimizados] = useState({});
  const [periodosMinimizados, setPeriodosMinimizados] = useState({});

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
  }, [cursos.length]);

  useEffect(() => {
    if (user) {
      const unsubCursos = onSnapshot(collection(db, 'users', user.uid, 'cursos'), (snap) => {
        setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      const unsubTarefas = onSnapshot(collection(db, 'users', user.uid, 'tarefas'), (snap) => {
        setTarefas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
      return () => { unsubCursos(); unsubTarefas(); };
    } else {
      const salvos = localStorage.getItem('local_cursos');
      if (salvos) setCursos(JSON.parse(salvos));
      const salvosTarefas = localStorage.getItem('local_tarefas');
      if (salvosTarefas) setTarefas(JSON.parse(salvosTarefas));
    }
  }, [user]);

  const persistirLocal = (novosCursos) => {
    setCursos(novosCursos);
    if (!user) localStorage.setItem('local_cursos', JSON.stringify(novosCursos));
  };

  const syncAvaliacoesComTarefas = async (disciplinaAtualizada, cursoId, periodoId) => {
    let tarefasLocais = user ? [] : JSON.parse(localStorage.getItem('local_tarefas') || '[]');
    
    for (const av of disciplinaAtualizada.avaliacoes) {
      const taskId = `av_${cursoId}_${periodoId}_${disciplinaAtualizada.id}_${av.id}`;
      
      if (av.obtida !== '' && !isNaN(av.obtida)) {
        if (user) {
          await deleteDoc(doc(db, 'users', user.uid, 'tarefas', taskId)).catch(() => {});
        } else {
          tarefasLocais = tarefasLocais.filter(t => t.id !== taskId);
        }
      } else if (av.data) {
        const taskData = {
          id: taskId,
          texto: `${av.nome} - ${disciplinaAtualizada.nome}`,
          data: av.data,
          hora: av.hora || '',
          concluida: false,
          tipo: 'avaliacao'
        };
        
        if (user) {
          await setDoc(doc(db, 'users', user.uid, 'tarefas', taskId), taskData, { merge: true });
        } else {
          const idx = tarefasLocais.findIndex(t => t.id === taskId);
          if (idx >= 0) tarefasLocais[idx] = { ...tarefasLocais[idx], ...taskData };
          else tarefasLocais.push(taskData);
        }
      }
    }
    if (!user) {
      setTarefas(tarefasLocais);
      localStorage.setItem('local_tarefas', JSON.stringify(tarefasLocais));
    }
  };

  const toggleMinimizarCurso = (id) => setCursosMinimizados(p => ({ ...p, [id]: !p[id] }));
  const toggleMinimizarPeriodo = (id) => setPeriodosMinimizados(p => ({ ...p, [id]: !p[id] }));

  const salvarCurso = async (curso) => {
    const id = curso.id || Date.now().toString();
    const novoCurso = { ...curso, id, periodos: curso.periodos || [] };
    
    if (user) await setDoc(doc(db, 'users', user.uid, 'cursos', id), novoCurso);
    else {
      const existe = cursos.find(c => c.id === id);
      const atualizados = existe ? cursos.map(c => c.id === id ? novoCurso : c) : [...cursos, novoCurso];
      persistirLocal(atualizados);
    }
    setCursoModal({ open: false, data: null });
  };

  const excluirCurso = async (id) => {
    if(window.confirm('Tem certeza que deseja excluir o curso inteiro?')) {
      if (user) await deleteDoc(doc(db, 'users', user.uid, 'cursos', id));
      else persistirLocal(cursos.filter(c => c.id !== id));
    }
  };

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
    if (user) await setDoc(doc(db, 'users', user.uid, 'cursos', cursoId), cursoAtualizado);
    else persistirLocal(cursos.map(c => c.id === cursoId ? cursoAtualizado : c));
    setPeriodoModal({ open: false, data: null, cursoId: null });
  };

  const excluirPeriodo = async (periodoId, cursoId) => {
    if(window.confirm('Excluir este período?')) {
      const curso = cursos.find(c => c.id === cursoId);
      const novosPeriodos = curso.periodos.filter(p => p.id !== periodoId);
      const cursoAtualizado = { ...curso, periodos: novosPeriodos };
      if (user) await setDoc(doc(db, 'users', user.uid, 'cursos', cursoId), cursoAtualizado);
      else persistirLocal(cursos.map(c => c.id === cursoId ? cursoAtualizado : c));
    }
  };

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

    if (user) await setDoc(doc(db, 'users', user.uid, 'cursos', cursoId), cursoAtualizado);
    else persistirLocal(cursos.map(c => c.id === cursoId ? cursoAtualizado : c));
    
    await syncAvaliacoesComTarefas(novaDisciplina, cursoId, periodoId);
    setDisciplinaModal({ open: false, data: null, periodoId: null, cursoId: null });
  };

  const excluirDisciplina = async (disciplinaId, periodoId, cursoId) => {
    if(window.confirm('Excluir esta disciplina?')) {
      const curso = cursos.find(c => c.id === cursoId);
      let novosPeriodos = [...curso.periodos];
      const pIndex = novosPeriodos.findIndex(p => p.id === periodoId);
      novosPeriodos[pIndex].disciplinas = novosPeriodos[pIndex].disciplinas.filter(d => d.id !== disciplinaId);
      const cursoAtualizado = { ...curso, periodos: novosPeriodos };
      if (user) await setDoc(doc(db, 'users', user.uid, 'cursos', cursoId), cursoAtualizado);
      else persistirLocal(cursos.map(c => c.id === cursoId ? cursoAtualizado : c));
    }
  };

  const confirmarNotaGlobal = async (avData, notaObtida) => {
    if (notaObtida === '') return;
    
    const curso = cursos.find(c => c.id === avData.cursoId);
    const periodoIndex = curso.periodos.findIndex(p => p.id === avData.periodoId);
    const discIndex = curso.periodos[periodoIndex].disciplinas.findIndex(d => d.id === avData.disciplinaId);
    let disciplina = curso.periodos[periodoIndex].disciplinas[discIndex];
    
    const avIndex = disciplina.avaliacoes.findIndex(a => a.id === avData.id);
    disciplina.avaliacoes[avIndex].obtida = notaObtida;
    
    curso.periodos[periodoIndex].disciplinas[discIndex] = disciplina;
    
    if (user) await setDoc(doc(db, 'users', user.uid, 'cursos', curso.id), curso);
    else persistirLocal(cursos.map(c => c.id === curso.id ? curso : c));
    
    await syncAvaliacoesComTarefas(disciplina, curso.id, curso.periodos[periodoIndex].id);
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
    const cappedMax = Math.min(100, maxTotal);
    const cappedObtida = Math.min(100, obtidaTotal);
    const notaBase = cappedMax > 0 ? (cappedObtida / cappedMax) * 100 : 0;

    return { maxTotal, obtidaTotal, percentual, notaBase };
  };

  const calcCRA = (disciplinas, tipoMedia, isGeral = false) => {
    let somaNotas = 0, somaPesos = 0, hasNotas = false;
    disciplinas.forEach(d => {
      if (isGeral && (d.status === 'A Cursar' || d.status === 'Cursando')) return;

      const { maxTotal, notaBase } = calcAvaliacoes(d.avaliacoes);
      if (!isGeral && maxTotal === 0 && (d.status === 'A Cursar' || d.status === 'Cursando')) return;

      if (maxTotal > 0) hasNotas = true;
      const peso = tipoMedia === 'ponderada' ? (Number(d.cargaHoraria) || 1) : 1;
      somaNotas += notaBase * peso;
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

  const hoje = new Date().toISOString().split('T')[0];

  const cursosConcluidos = cursos.filter(c => c.dataFim && c.dataFim < hoje).sort((a, b) => new Date(b.dataFim) - new Date(a.dataFim));
  const cursosFuturos = cursos.filter(c => c.dataInicio && c.dataInicio > hoje && (!c.dataFim || c.dataFim >= hoje)).sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));
  const cursosAtuais = cursos.filter(c => !cursosConcluidos.includes(c) && !cursosFuturos.includes(c)).sort((a, b) => (a.dataFim ? new Date(a.dataFim).getTime() : Infinity) - (b.dataFim ? new Date(b.dataFim).getTime() : Infinity));
  const cursosOrdenados = [...cursosAtuais, ...cursosFuturos, ...cursosConcluidos];

  return (
    <div className="w-full max-w-full overflow-hidden flex flex-col gap-4 mt-2">
      
      {cursosOrdenados.map(curso => {
        const isMin = cursosMinimizados[curso.id] !== false; 
        let totalHorasMeta = 0;
        curso.tiposHoras?.forEach(t => totalHorasMeta += Number(t.quantidade));
        
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
        const progressoPercentual = totalHorasMeta > 0 ? (totalHorasConcluidas / totalHorasMeta) * 100 : 0;
        const { cra: mediaGeral, hasNotas: cursoHasNotas } = calcCRA(todasDisciplinas, 'ponderada', true);

        const periodosConcluidos = (curso.periodos || []).filter(p => p.dataFim && p.dataFim < hoje).sort((a, b) => new Date(b.dataFim) - new Date(a.dataFim));
        const periodosFuturos = (curso.periodos || []).filter(p => p.dataInicio && p.dataInicio > hoje && (!p.dataFim || p.dataFim >= hoje)).sort((a, b) => new Date(a.dataInicio) - new Date(b.dataInicio));
        const periodosAtuais = (curso.periodos || []).filter(p => !periodosConcluidos.includes(p) && !periodosFuturos.includes(p));
        const periodosOrdenados = [...periodosAtuais, ...periodosConcluidos, ...periodosFuturos];

        const anoInicio = curso.dataInicio ? curso.dataInicio.split('-')[0] : '';
        const anoFim = curso.dataFim ? curso.dataFim.split('-')[0] : '';

        return (
          <div key={curso.id} className="bg-[#1a1a1a] rounded-xl p-3 sm:p-4 shadow-lg mb-2 relative overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${progressoPercentual}%` }} />
            </div>

            <div className="flex flex-col mt-1">
              <div className="flex items-start justify-between gap-2 w-full">
                <button onClick={() => toggleMinimizarCurso(curso.id)} className="text-zinc-400 hover:text-white font-bold text-sm mt-1 shrink-0 p-1">
                  {isMin ? '▶\uFE0E' : '▼\uFE0E'}
                </button>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleMinimizarCurso(curso.id)}>
                  <h2 className="text-lg sm:text-xl font-bold text-white break-words leading-tight">{curso.nome} - {curso.instituicao}</h2>
                  {(anoInicio || anoFim) && (
                    <div className="text-xs text-zinc-400 font-medium mt-0.5">{anoInicio} {anoInicio && anoFim ? '-' : ''} {anoFim}</div>
                  )}
                </div>
                <button onClick={() => setCursoModal({ open: true, data: curso })} className="text-xs text-zinc-500 hover:text-zinc-300 shrink-0 p-1">Editar</button>
              </div>

              <div className="flex flex-wrap justify-between gap-2 mt-3 text-xs sm:text-sm font-medium text-gray-300 pl-8 pr-2">
                <span>Média Geral: <span className={(cursoHasNotas && mediaGeral < 60) ? 'text-red-500' : 'text-white'}>{mediaGeral.toFixed(2)}</span></span>
                {isMin ? (
                  <span>{totalHorasConcluidas}h / {totalHorasMeta}h ({progressoPercentual.toFixed(2)}%)</span>
                ) : (
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {curso.tiposHoras?.map(t => {
                      const concluidasTipo = horasConcluidasPorTipo[t.nome] || 0;
                      return (
                        <span key={t.id}>
                          {t.nome}: <strong className="text-white">{concluidasTipo}h / {t.quantidade}h</strong>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {!isMin && (
              <div className="mt-4 flex flex-col gap-3">
                {periodosOrdenados.map(periodo => {
                  const isMinPer = periodosMinimizados[periodo.id] !== false; 
                  const { cra: mediaPeriodo, hasNotas: perHasNotas } = calcCRA(periodo.disciplinas || [], periodo.tipoMedia, false);
                  let horasPeriodo = 0;
                  periodo.disciplinas?.forEach(d => { if (d.status === 'Concluída') horasPeriodo += Number(d.cargaHoraria) || 0; });
                  const perAtual = isAtual(periodo.dataInicio, periodo.dataFim);

                  return (
                    <div key={periodo.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 w-full">
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => toggleMinimizarPeriodo(periodo.id)} className="text-zinc-400 hover:text-white font-bold text-xs shrink-0 p-1">
                          {isMinPer ? '▶\uFE0E' : '▼\uFE0E'}
                        </button>
                        <span className="font-bold text-white text-sm sm:text-base truncate cursor-pointer" onClick={() => toggleMinimizarPeriodo(periodo.id)}>{periodo.nome}</span>
                        <span className="text-[10px] sm:text-xs text-gray-500">({periodo.dataInicio || '?'} até {periodo.dataFim || '?'})</span>
                        {perAtual && <span className="bg-blue-600 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded text-white font-bold shrink-0">ATUAL</span>}
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400 mt-2 pl-7 sm:pl-8 w-full">
                        <span>Média: <span className={`font-bold ${(perHasNotas && mediaPeriodo < 60) ? 'text-red-500' : 'text-white'}`}>{mediaPeriodo.toFixed(2)}</span> | Horas: <span className="font-bold text-white">{horasPeriodo}h</span></span>
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
                                
                                <div className="flex-1 min-w-0 pr-2">
                                  <h4 className="font-bold text-white text-xs sm:text-sm truncate w-full">{disc.nome}</h4>
                                  {disc.professor && <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate w-full">Prof: {disc.professor}</div>}
                                  <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 flex flex-wrap gap-1 leading-tight">
                                    <span>{disc.cargaHoraria}h • {disc.tipoHora} • Nota: </span>
                                    <span className={`font-bold ${isDiscRed ? 'text-red-500' : 'text-white'}`}>
                                      {obtidaTotal.toFixed(2)} / {maxTotal.toFixed(2)} - {percentual.toFixed(2)}%
                                    </span>
                                  </div>
                                </div>

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

      <div className="flex justify-start mt-2 mb-4">
        <button onClick={() => setCursoModal({ open: true, data: null })} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded font-medium text-sm transition-colors border border-zinc-700">
          + Adicionar Curso
        </button>
      </div>

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
      {isAvaliacoesOpen && (
        <ModalAvaliacoesGlobal cursos={cursos} tarefas={tarefas} onClose={() => setIsAvaliacoesOpen(false)} onConfirmar={confirmarNotaGlobal} />
      )}
    </div>
  );
}

function ModalCurso({ cursoInicial, onClose, onSave, onDelete }) {
  const [curso, setCurso] = useState(cursoInicial || { nome: '', instituicao: '', dataInicio: '', dataFim: '', tiposHoras: [{ id: Date.now().toString(), nome: 'Obrigatória', quantidade: '' }] });
  const handleTipoHoraChange = (id, field, value) => setCurso(p => ({ ...p, tiposHoras: p.tiposHoras.map(t => t.id === id ? { ...t, [field]: value } : t) }));

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-lg p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-zinc-800">
        <h2 className="text-xl font-bold">{cursoInicial ? 'Editar Curso' : 'Novo Curso'}</h2>
        <div className="space-y-3">
          <div><label className="block text-sm text-zinc-400 mb-1">Nome</label><input type="text" value={curso.nome} onChange={e => setCurso({...curso, nome: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
          <div><label className="block text-sm text-zinc-400 mb-1">Instituição</label><input type="text" value={curso.instituicao} onChange={e => setCurso({...curso, instituicao: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-sm text-zinc-400 mb-1">Início</label><input type="date" value={curso.dataInicio} onChange={e => setCurso({...curso, dataInicio: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white [color-scheme:dark]" /></div>
            <div className="flex-1"><label className="block text-sm text-zinc-400 mb-1">Fim (Previsão)</label><input type="date" value={curso.dataFim} onChange={e => setCurso({...curso, dataFim: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white [color-scheme:dark]" /></div>
          </div>
          <div className="pt-2">
            <label className="block text-sm font-bold text-zinc-300 mb-2">Carga horária</label>
            {curso.tiposHoras?.map(t => (
              <div key={t.id} className="flex gap-2 mb-2 items-center">
                <input type="text" value={t.nome} onChange={e => handleTipoHoraChange(t.id, 'nome', e.target.value)} placeholder="Ex: Obrigatória" className="flex-1 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" />
                <input type="number" value={t.quantidade} onChange={e => handleTipoHoraChange(t.id, 'quantidade', e.target.value)} placeholder="Horas" className="w-24 bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm text-center" />
                <button onClick={() => setCurso(p => ({...p, tiposHoras: p.tiposHoras.filter(x => x.id !== t.id)}))} className="text-red-500 hover:text-red-400 font-bold px-2 py-1 text-base bg-transparent border-none">×</button>
              </div>
            ))}
            <button onClick={() => setCurso(p => ({...p, tiposHoras: [...(p.tiposHoras || []), { id: Date.now().toString(), nome: '', quantidade: '' }]}))} className="text-xs text-blue-400 hover:text-blue-300 font-medium">+ Adicionar Tipo</button>
          </div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-4">
          {cursoInicial ? <button onClick={() => onDelete(curso.id)} className="text-red-500 hover:text-red-400 font-bold text-sm bg-transparent border-none p-0">Excluir</button> : <div></div>}
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-sm p-4 sm:p-6 shadow-2xl space-y-4 border border-zinc-800">
        <h2 className="text-xl font-bold">{periodoInicial ? 'Editar Período' : 'Novo Período'}</h2>
        <div className="space-y-3">
          <div><label className="block text-sm text-zinc-400 mb-1">Nome</label><input type="text" value={periodo.nome} onChange={e => setPeriodo({...periodo, nome: e.target.value})} placeholder="Ex: 1º Período" className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white" /></div>
          <div className="flex gap-3">
            <div className="flex-1"><label className="block text-sm text-zinc-400 mb-1">Início</label><input type="date" value={periodo.dataInicio} onChange={e => setPeriodo({...periodo, dataInicio: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white [color-scheme:dark]" /></div>
            <div className="flex-1"><label className="block text-sm text-zinc-400 mb-1">Fim</label><input type="date" value={periodo.dataFim} onChange={e => setPeriodo({...periodo, dataFim: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white [color-scheme:dark]" /></div>
          </div>
          <div><label className="block text-sm text-zinc-400 mb-1">Tipo de Média</label><select value={periodo.tipoMedia} onChange={e => setPeriodo({...periodo, tipoMedia: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white"><option value="ponderada">Ponderada (Carga Horária)</option><option value="simples">Aritmética Simples</option></select></div>
        </div>
        <div className="flex justify-between items-center pt-4 border-t border-zinc-800 mt-4">
          {periodoInicial ? <button onClick={() => onDelete(periodo.id)} className="text-red-500 hover:text-red-400 font-bold text-sm bg-transparent border-none p-0">Excluir</button> : <div></div>}
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
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-3 sm:p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto border border-zinc-800">
        <h2 className="text-xl font-bold">{disciplinaInicial ? 'Editar Disciplina' : 'Nova Disciplina'}</h2>
        
        <div className="space-y-2.5">
          <div><label className="block text-xs font-semibold text-zinc-400 mb-1">Nome</label><input type="text" value={disc.nome} onChange={e => setDisc({...disc, nome: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
          <div><label className="block text-xs font-semibold text-zinc-400 mb-1">Professor</label><input type="text" value={disc.professor} onChange={e => setDisc({...disc, professor: e.target.value})} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-white text-sm" /></div>
          <div className="flex gap-2">
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

          <div className="pt-2 border-t border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-zinc-300">Avaliações</label>
              <button onClick={() => setDisc(p => ({...p, avaliacoes: [...p.avaliacoes, { id: Date.now().toString(), nome: `P${p.avaliacoes.length+1}`, max: '', obtida: '', data: '', hora: '', showDateInput: false }]}))} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded text-xs border border-zinc-600 font-bold">+ Adicionar</button>
            </div>
            
            <div className="space-y-1.5">
              {disc.avaliacoes.map(av => {
                const isCalculable = av.max !== '' && av.obtida !== '' && Number(av.max) > 0;
                const pNum = isCalculable ? (Number(av.obtida) / Number(av.max)) * 100 : 0;
                const pLocal = isCalculable ? pNum.toFixed(1) + '%' : '';
                const isRed = isCalculable && pNum < 60;

                return (
                  <div key={av.id} className="flex gap-1 items-center">
                    <input type="text" value={av.nome} onChange={e => hAv(av.id, 'nome', e.target.value)} placeholder="Nome" className="flex-1 min-w-0 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-xs" />
                    
                    {av.showDateInput ? (
                      <div className="flex gap-1 shrink-0 items-center">
                        <input type="date" value={av.data || ''} onChange={e => hAv(av.id, 'data', e.target.value)} onBlur={(e) => { if (!e.currentTarget.parentNode.contains(e.relatedTarget)) hAv(av.id, 'showDateInput', false); }} autoFocus className="w-[105px] bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-[10px] [color-scheme:dark]" />
                        <input type="time" value={av.hora || ''} onChange={e => hAv(av.id, 'hora', e.target.value)} onBlur={(e) => { if (!e.currentTarget.parentNode.contains(e.relatedTarget)) hAv(av.id, 'showDateInput', false); }} className="w-[75px] bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-[10px] [color-scheme:dark]" />
                      </div>
                    ) : (
                      <button onClick={() => hAv(av.id, 'showDateInput', true)} className={`w-8 h-8 shrink-0 flex items-center justify-center rounded border transition-colors ${av.data ? 'bg-blue-600/20 border-blue-500/50 text-blue-400' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700 hover:text-white'}`}>
                         <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                      </button>
                    )}

                    <input type="number" value={av.max} onChange={e => hAv(av.id, 'max', e.target.value)} placeholder="Total" className="w-10 sm:w-11 shrink-0 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-xs text-center" />
                    <input type="number" value={av.obtida} onChange={e => hAv(av.id, 'obtida', e.target.value)} placeholder="Nota" className="w-10 sm:w-11 shrink-0 bg-zinc-950 border border-zinc-700 rounded p-1.5 text-white text-xs text-center" />
                    <span className={`w-9 shrink-0 text-right text-[10px] font-bold ${isRed ? 'text-red-500' : 'text-zinc-400'}`}>{pLocal}</span>
                    <button onClick={() => setDisc(p => ({...p, avaliacoes: p.avaliacoes.filter(x => x.id !== av.id)}))} className="text-red-500 hover:text-red-400 font-bold px-1.5 py-0.5 text-base bg-transparent border-none shrink-0">×</button>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-3 text-xs font-medium text-zinc-400">
              Nota Final: <span className={`font-bold text-sm ${isDiscRed ? 'text-red-500' : 'text-white'}`}>{obtT.toFixed(2)} / {maxT.toFixed(2)} - {percFinal.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-zinc-800 mt-3">
          {disciplinaInicial ? (
            <button onClick={() => onDelete(disc.id)} className="text-red-500 hover:text-red-400 font-bold text-sm bg-transparent border-none p-0">Excluir</button>
          ) : <div></div>}
          
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 font-bold text-xs transition-colors">Cancelar</button>
            <button onClick={() => onSave(disc)} className="px-3 py-1.5 bg-zinc-600 text-white rounded hover:bg-zinc-500 font-bold text-xs transition-colors">Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalAvaliacoesGlobal({ cursos, tarefas, onClose, onConfirmar }) {
  const [minCorrecao, setMinCorrecao] = useState(false);
  const [minProximas, setMinProximas] = useState(false);
  const [minConcluidas, setMinConcluidas] = useState(false);
  const [inputs, setInputs] = useState({});

  const todasAvaliacoes = [];
  cursos.forEach(c => {
    c.periodos?.forEach(p => {
      p.disciplinas?.forEach(d => {
        d.avaliacoes?.forEach(a => {
          todasAvaliacoes.push({ ...a, cursoId: c.id, periodoId: p.id, disciplinaId: d.id, disciplinaNome: d.nome });
        });
      });
    });
  });

  const now = new Date();
  const correcao = [];
  const proximas = [];
  const concluidas = [];

  todasAvaliacoes.forEach(av => {
    if (av.obtida !== '' && !isNaN(av.obtida)) {
      concluidas.push(av);
    } else {
      const taskId = `av_${av.cursoId}_${av.periodoId}_${av.disciplinaId}_${av.id}`;
      const task = tarefas.find(t => t.id === taskId);
      
      let dataAv = null;
      if (av.data) {
        dataAv = new Date(`${av.data}T${av.hora || '00:00'}:00`);
      }
      
      if (task?.concluida || (dataAv && dataAv < now)) correcao.push(av);
      else proximas.push(av);
    }
  });

  correcao.sort((a, b) => {
    if (!a.data) return -1;
    if (!b.data) return 1;
    return new Date(`${a.data}T${a.hora || '00:00'}:00`) - new Date(`${b.data}T${b.hora || '00:00'}:00`);
  });
  
  proximas.sort((a, b) => {
    if (!a.data) return 1;
    if (!b.data) return -1;
    return new Date(`${a.data}T${a.hora || '00:00'}:00`) - new Date(`${b.data}T${b.hora || '00:00'}:00`);
  });
  
  concluidas.sort((a, b) => {
    if (!a.data) return 1;
    if (!b.data) return -1;
    return new Date(`${b.data}T${b.hora || '00:00'}:00`) - new Date(`${a.data}T${a.hora || '00:00'}:00`);
  });

  const formatarData = (dataStr, horaStr) => {
    if (!dataStr) return 'Sem data';
    const [y, m, day] = dataStr.split('-');
    return `${day}/${m}${horaStr ? ` às ${horaStr}` : ''}`;
  };

  const renderAvItem = (av, editavel) => (
    <div key={`${av.cursoId}_${av.id}`} className="flex items-center gap-2 mb-2 p-2.5 bg-zinc-800/40 border border-zinc-800 rounded-lg">
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-[11px] text-zinc-400 mb-0.5">{formatarData(av.data, av.hora)}</div>
        <div className="text-sm font-bold text-white truncate leading-tight">{av.nome}</div>
        <div className="text-xs text-zinc-500 truncate">{av.disciplinaNome}</div>
      </div>
      <div className="w-12 h-10 flex items-center justify-center bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-bold rounded shrink-0">
        {av.max || '?'}
      </div>
      {editavel ? (
        <>
          <input type="number" value={inputs[av.id] !== undefined ? inputs[av.id] : ''} onChange={e => setInputs({...inputs, [av.id]: e.target.value})} placeholder="Nota" className="w-12 h-10 bg-zinc-950 border border-zinc-700 text-center text-xs font-bold text-white rounded shrink-0" />
          <button onClick={() => onConfirmar(av, inputs[av.id])} className="w-10 h-10 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-green-500 shrink-0 transition-colors">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        </>
      ) : (
        <div className="w-12 h-10 flex items-center justify-center bg-zinc-950 border border-zinc-700 text-white text-xs font-bold rounded shrink-0">
          {av.obtida}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-lg p-4 sm:p-5 shadow-2xl flex flex-col h-[85vh] border border-zinc-800">
        
        <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-zinc-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <h2 className="text-xl font-bold">Avaliações</h2>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          
          <div>
            <div className="flex items-center gap-2 cursor-pointer mb-2" onClick={() => setMinCorrecao(!minCorrecao)}>
              <span className="text-zinc-400 text-xs font-bold">{minCorrecao ? '▶\uFE0E' : '▼\uFE0E'}</span>
              <h3 className="font-bold text-white uppercase tracking-wide text-sm">Correção ({correcao.length})</h3>
            </div>
            {!minCorrecao && (
              <div className="flex flex-col">
                {correcao.length === 0 ? <p className="text-xs text-zinc-500 italic pl-5">Nenhuma avaliação aguardando nota.</p> : correcao.map(av => renderAvItem(av, true))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 cursor-pointer mb-2" onClick={() => setMinProximas(!minProximas)}>
              <span className="text-zinc-400 text-xs font-bold">{minProximas ? '▶\uFE0E' : '▼\uFE0E'}</span>
              <h3 className="font-bold text-blue-400 uppercase tracking-wide text-sm">Próximas ({proximas.length})</h3>
            </div>
            {!minProximas && (
              <div className="flex flex-col">
                {proximas.length === 0 ? <p className="text-xs text-zinc-500 italic pl-5">Nenhuma avaliação futura.</p> : proximas.map(av => renderAvItem(av, true))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 cursor-pointer mb-2" onClick={() => setMinConcluidas(!minConcluidas)}>
              <span className="text-zinc-400 text-xs font-bold">{minConcluidas ? '▶\uFE0E' : '▼\uFE0E'}</span>
              <h3 className="font-bold text-white uppercase tracking-wide text-sm">Concluídas ({concluidas.length})</h3>
            </div>
            {!minConcluidas && (
              <div className="flex flex-col opacity-60">
                {concluidas.length === 0 ? <p className="text-xs text-zinc-600 italic pl-5">Nenhuma avaliação concluída.</p> : concluidas.map(av => renderAvItem(av, false))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
