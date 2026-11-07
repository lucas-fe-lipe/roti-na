import { useState, useEffect } from 'react';
import ActivityModal from '../components/ActivityModal';
import GoalModal from '../components/GoalModal';
import TaskModal from '../components/TaskModal';
import TaskDetailModal from '../components/TaskDetailModal';
import Sidebar from '../components/Sidebar';
import RightMenu from '../components/RightMenu';
import Notas from './Notas';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { getInitials } from '../utils/defaultAvatars';
import { hojeLocalStr } from '../utils/date';
import Avatar from '../components/Avatar';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [isAvaliacoesOpen, setIsAvaliacoesOpen] = useState(false); 
  const [activePage, setActivePage] = useState('Grade');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [user, setUser] = useState(null);
  const [userAvatar, setUserAvatar] = useState('');
  const [atividades, setAtividades] = useState([]);
  const [metas, setMetas] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [atividadesConcluidasHoje, setAtividadesConcluidasHoje] = useState({});
  const [confirmarExclusaoConcluidas, setConfirmarExclusaoConcluidas] = useState(false);
  
  const [atividadeEditando, setAtividadeEditando] = useState(null);
  const [metaEditando, setMetaEditando] = useState(null);
  const [tarefaEditando, setTarefaEditando] = useState(null);
  const [tarefaDetalhe, setTarefaDetalhe] = useState(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(true);

  // 'atrasadas' e 'concluidas' iniciam como true (minimizados). As datas iniciam maximizadas por padrão (false).
  const [minimizedSections, setMinimizedSections] = useState({ concluidas: true, atrasadas: true });

  const [categorias, setCategorias] = useState(['Estudos', 'Trabalho', 'Treinos', 'Outros']);
  const coresUsadas = Array.from(new Set(atividades.map(a => a.cor)));

  const atualizarAvatarPerfil = () => {
    if (auth.currentUser) {
      const savedAvatar = localStorage.getItem(`profile_avatar_${auth.currentUser.uid}`) || '';
      setUserAvatar(savedAvatar);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        atualizarAvatarPerfil();
      } else {
        setUserAvatar('');
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      const tSalvas = localStorage.getItem('local_tarefas');
      const aSalvas = localStorage.getItem('local_atividades');
      const mSalvas = localStorage.getItem('local_metas');
      if (tSalvas) setTarefas(JSON.parse(tSalvas));
      if (aSalvas) setAtividades(JSON.parse(aSalvas));
      if (mSalvas) setMetas(JSON.parse(mSalvas));
      return;
    }
    
    const unsubAtv = onSnapshot(collection(db, 'users', user.uid, 'atividades'), (snap) => {
      setAtividades(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubMetas = onSnapshot(collection(db, 'users', user.uid, 'metas'), (snap) => {
      setMetas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubTarefas = onSnapshot(collection(db, 'users', user.uid, 'tarefas'), (snap) => {
      setTarefas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAtv();
      unsubMetas();
      unsubTarefas();
    };
  }, [user]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const diasDaSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  
  let minHour = 6;
  let maxHour = 22;

  if (atividades.length > 0) {
    minHour = 24;
    maxHour = 0;
    atividades.forEach(atv => {
      atv.horarios.forEach(h => {
        if (!h.inicio || !h.fim) return;
        const startH = parseInt(h.inicio.split(':')[0]);
        const endH = parseInt(h.fim.split(':')[0]);
        const endM = parseInt(h.fim.split(':')[1]);
        const calcEnd = endM > 0 ? endH + 1 : endH;
        
        if (startH < minHour) minHour = startH;
        if (calcEnd > maxHour) maxHour = calcEnd;
      });
    });
    if (minHour > maxHour || minHour === 24) { minHour = 6; maxHour = 22; }
  }

  const horas = Array.from({ length: maxHour - minHour }, (_, i) => i + minHour);
  const ROW_HEIGHT = 22;
  
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();
  const currentDay = currentTime.getDay(); 
  
  const showTimeLine = currentHour >= minHour && currentHour < maxHour;
  const timeLineTop = ((currentHour - minHour) * ROW_HEIGHT) + ((currentMinute / 60) * ROW_HEIGHT);

  const handleSalvarAtividade = async (novaAtividade) => {
    if (!categorias.includes(novaAtividade.categoria)) {
      setCategorias([...categorias, novaAtividade.categoria]);
    }
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'atividades', novaAtividade.id), novaAtividade);
    } else {
      const existe = atividades.find(a => a.id === novaAtividade.id);
      const atualizadas = existe ? atividades.map(a => a.id === novaAtividade.id ? novaAtividade : a) : [...atividades, novaAtividade];
      setAtividades(atualizadas);
      localStorage.setItem('local_atividades', JSON.stringify(atualizadas));
    }
  };

  const handleExcluirAtividade = async (id) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'atividades', id));
    } else {
      const atualizadas = atividades.filter(a => a.id !== id);
      setAtividades(atualizadas);
      localStorage.setItem('local_atividades', JSON.stringify(atualizadas));
    }
  };

  const handleSalvarMeta = async (novaMeta) => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'metas', novaMeta.id), novaMeta);
    } else {
      const existe = metas.find(m => m.id === novaMeta.id);
      const atualizadas = existe ? metas.map(m => m.id === novaMeta.id ? novaMeta : m) : [...metas, novaMeta];
      setMetas(atualizadas);
      localStorage.setItem('local_metas', JSON.stringify(atualizadas));
    }
  };

  const handleIncrementarMeta = async (metaId) => {
    const metaAtual = metas.find(m => m.id === metaId);
    if (!metaAtual) return;
    const novoProgresso = Number((metaAtual.progresso + metaAtual.incremento).toFixed(2));
    const atualizada = { ...metaAtual, progresso: novoProgresso > metaAtual.meta ? metaAtual.meta : novoProgresso };
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'metas', metaId), atualizada);
    } else {
      const atualizadas = metas.map(m => m.id === metaId ? atualizada : m);
      setMetas(atualizadas);
      localStorage.setItem('local_metas', JSON.stringify(atualizadas));
    }
  };

  const handleZerarMeta = async (metaId) => {
    const metaAtual = metas.find(m => m.id === metaId);
    if (!metaAtual) return;
    const atualizada = { ...metaAtual, progresso: 0 };
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'metas', metaId), atualizada);
    } else {
      const atualizadas = metas.map(m => m.id === metaId ? atualizada : m);
      setMetas(atualizadas);
      localStorage.setItem('local_metas', JSON.stringify(atualizadas));
    }
  };

  const handleExcluirMeta = async (metaId) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'metas', metaId));
    } else {
      const atualizadas = metas.filter(m => m.id !== metaId);
      setMetas(atualizadas);
      localStorage.setItem('local_metas', JSON.stringify(atualizadas));
    }
  };

  const handleSalvarTarefa = async (novaTarefa) => {
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'tarefas', novaTarefa.id), novaTarefa);
    } else {
      const existe = tarefas.find(t => t.id === novaTarefa.id);
      const atualizadas = existe ? tarefas.map(t => t.id === novaTarefa.id ? novaTarefa : t) : [...tarefas, novaTarefa];
      setTarefas(atualizadas);
      localStorage.setItem('local_tarefas', JSON.stringify(atualizadas));
    }
  };

  const handleToggleConcluida = async (tarefa) => {
    const atualizada = { ...tarefa, concluida: !tarefa.concluida };
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'tarefas', tarefa.id), atualizada);
    } else {
      const atualizadas = tarefas.map(t => t.id === tarefa.id ? atualizada : t);
      setTarefas(atualizadas);
      localStorage.setItem('local_tarefas', JSON.stringify(atualizadas));
    }
  };

  const handleToggleConcluidaAtividade = (atvId, horarioInicio) => {
    const key = `atv-${atvId}-${horarioInicio}`;
    setAtividadesConcluidasHoje(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExcluirTarefa = async (id) => {
    if (user) {
      await deleteDoc(doc(db, 'users', user.uid, 'tarefas', id));
    } else {
      const atualizadas = tarefas.filter(t => t.id !== id);
      setTarefas(atualizadas);
      localStorage.setItem('local_tarefas', JSON.stringify(atualizadas));
    }
  };

  const handleExcluirTarefasConcluidas = async () => {
    const tarefasConcluidasList = tarefas.filter(t => t.concluida);
    if (user) {
      await Promise.all(tarefasConcluidasList.map(t => deleteDoc(doc(db, 'users', user.uid, 'tarefas', t.id))));
    } else {
      const atualizadas = tarefas.filter(t => !t.concluida);
      setTarefas(atualizadas);
      localStorage.setItem('local_tarefas', JSON.stringify(atualizadas));
    }
    setAtividadesConcluidasHoje({});
    setConfirmarExclusaoConcluidas(false);
  };

  const abrirNovaAtividade = () => {
    setAtividadeEditando(null);
    setModoVisualizacao(false);
    setIsModalOpen(true);
  };

  const abrirDetalhesAtividade = (atv) => {
    setAtividadeEditando(atv);
    setModoVisualizacao(true);
    setIsModalOpen(true);
  };

  const userName = user ? (user.displayName || user.email.split('@')[0]) : 'Login';
  const userInitials = getInitials(userName);

  const hojeStr = hojeLocalStr(currentTime);
  const nomeDiaHoje = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][currentDay];
  const dataFormatadaHoje = `Hoje - ${nomeDiaHoje}, ${new Date().toLocaleDateString('pt-BR')}`;

  const atividadesDoDia = [];
  atividades.forEach(atv => {
    atv.horarios.forEach(h => {
      const diaAbreviado = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][currentDay];
      if (h.dia === diaAbreviado) {
        const uniqueKey = `atv-${atv.id}-${h.inicio}`;
        atividadesDoDia.push({
          ...atv,
          uniqueKey,
          horarioExibicao: h.inicio,
          horarioInicio: h.inicio,
          concluida: !!atividadesConcluidasHoje[uniqueKey]
        });
      }
    });
  });

  const atividadesNaoConcluidasHoje = atividadesDoDia.filter(a => !a.concluida);
  const atividadesConcluidasHojeList = atividadesDoDia.filter(a => a.concluida);

  const tarefasPorData = {};
  const tarefasConcluidas = [];

  tarefas.forEach(t => {
    if (t.concluida) {
      tarefasConcluidas.push(t);
    } else {
      const d = t.data || 'Sem data';
      if (!tarefasPorData[d]) tarefasPorData[d] = [];
      tarefasPorData[d].push(t);
    }
  });

  const tarefasAtrasadasPorData = {};
  let totalAtrasadas = 0;

  Object.keys(tarefasPorData).forEach(d => {
    if (d !== 'Sem data' && d < hojeStr) {
      const lista = tarefasPorData[d].filter(t => !t.concluida);
      if (lista.length > 0) {
        tarefasAtrasadasPorData[d] = lista;
        totalAtrasadas += lista.length;
      }
    }
  });

  const datasAtrasadasOrdenadas = Object.keys(tarefasAtrasadasPorData).sort((a, b) => new Date(a) - new Date(b));

  const datasOrdenadas = Object.keys(tarefasPorData).sort((a, b) => {
    if (a === 'Sem data') return 1;
    if (b === 'Sem data') return -1;
    return new Date(a) - new Date(b);
  });

  const toggleMinimizar = (dataKey) => {
    setMinimizedSections(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const formatarTituloData = (dataKey) => {
    if (dataKey === 'Sem data') return 'Sem data';
    const [ano, mes, dia] = dataKey.split('-');
    const dataObj = new Date(ano, mes - 1, dia);
    const nomeDia = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dataObj.getDay()];
    return `${nomeDia}, ${dia}/${mes}/${ano.slice(2)}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="flex justify-between items-center px-6 py-2 border-b border-zinc-800 shrink-0">
        <div onClick={() => setIsSidebarOpen(true)} className="flex items-center gap-2 cursor-pointer hover:text-zinc-300">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-800 text-zinc-200 font-bold text-[10px]">
            <Avatar src={userAvatar} initials={userInitials} />
          </div>
          <span className="text-sm font-medium truncate max-w-[150px]">{userName}</span>
        </div>

        <div className="flex items-center gap-3">
          {activePage === 'Grade' && (
            <button 
              onClick={abrirNovaAtividade} 
              className="bg-zinc-900 text-zinc-100 border border-zinc-800 w-8 h-8 flex items-center justify-center text-base font-bold rounded hover:bg-zinc-800 transition-colors shadow-sm"
              title="Nova Atividade"
            >
              +
            </button>
          )}

          {activePage === 'Notas' && (
            <button 
              onClick={() => setIsAvaliacoesOpen(true)} 
              className="bg-zinc-900 text-zinc-100 border border-zinc-800 w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors shadow-sm text-zinc-400 hover:text-white"
              title="Avaliações"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </button>
          )}

          <button onClick={() => setIsRightMenuOpen(true)} className="bg-zinc-900 text-zinc-100 border border-zinc-800 px-3 py-1.5 text-lg rounded hover:bg-zinc-800 transition-colors">
            ☰
          </button>
        </div>
      </header>

      <main className="flex-1 px-0 pt-0 pb-6 sm:px-6 sm:pt-2 flex flex-col items-center overflow-auto w-full">
        
        {activePage === 'Grade' && (
          <div className="w-full max-w-5xl flex flex-col pb-10">
            <div className="flex ml-[38px] bg-black sm:rounded-t-md shrink-0">
              {diasDaSemana.map((dia) => (
                <div key={dia} className="flex-1 py-1.5 text-center font-bold text-[10px] text-white">
                  {dia}
                </div>
              ))}
            </div>

            <div className="flex relative">
              <div className="w-[38px] bg-black sm:rounded-bl-md relative shrink-0">
                {horas.map(hora => (
                  <div key={hora} style={{ height: ROW_HEIGHT }} className="relative">
                    <span className="absolute top-0 right-1 -translate-y-1/2 text-[10px] font-medium text-zinc-400 bg-black px-0.5">
                      {hora.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                ))}
                <div className="h-0 relative">
                  <span className="absolute top-0 right-1 -translate-y-1/2 text-[10px] font-medium text-zinc-400 bg-black px-0.5">
                    {maxHour.toString().padStart(2, '0')}:00
                  </span>
                </div>
              </div>

              <div className="flex-1 bg-white relative overflow-hidden sm:rounded-br-md border-r border-b border-zinc-300">
                {horas.map((hora) => (
                  <div key={hora} style={{ height: ROW_HEIGHT }} className="grid grid-cols-7 relative">
                    {diasDaSemana.map((dia, idx) => (
                      <div key={`${dia}-${hora}`} className={`border-l border-t border-zinc-100 relative ${idx === currentDay ? 'bg-zinc-50/70' : ''}`}>
                        <div className="absolute top-1/2 w-full border-t border-zinc-50"></div>
                      </div>
                    ))}
                  </div>
                ))}

                {atividades.map((atv) => 
                  atv.horarios.map((h, i) => {
                    const [startH, startM] = h.inicio.split(':').map(Number);
                    const [endH, endM] = h.fim.split(':').map(Number);
                    const dayIndex = diasDaSemana.findIndex(d => d === h.dia);
                    
                    if (dayIndex === -1) return null;

                    const top = ((startH - minHour) * ROW_HEIGHT) + ((startM / 60) * ROW_HEIGHT);
                    const height = ((endH - startH) * ROW_HEIGHT) + (((endM - startM) / 60) * ROW_HEIGHT);
                    const opacityClass = currentDay === dayIndex ? 'opacity-100' : 'opacity-70';
                    const textoPrincipal = atv.apelido ? atv.apelido : atv.nome;

                    return (
                      <div 
                        key={`${atv.id}-${i}`} 
                        onClick={() => abrirDetalhesAtividade(atv)}
                        className={`absolute rounded text-[10px] text-white overflow-hidden cursor-pointer hover:opacity-100 transition-opacity border border-black/20 px-0.5 py-0 flex flex-col justify-start break-words ${opacityClass}`}
                        style={{
                          backgroundColor: atv.cor, top: `${top}px`, height: `${height}px`,
                          left: `calc(${dayIndex} * (100% / 7))`, width: `calc(100% / 7)`
                        }}
                      >
                        <div className="font-bold leading-none break-words">{textoPrincipal}</div>
                        {atv.detalhes && (
                          <div className="text-[8px] opacity-80 leading-none mt-0.5 whitespace-pre-line break-words">{atv.detalhes}</div>
                        )}
                      </div>
                    );
                  })
                )}

                {showTimeLine && (
                  <div className="absolute left-0 right-0 flex items-center z-10 pointer-events-none" style={{ top: `${timeLineTop}px` }}>
                    <div className="w-2 h-2 rounded-full bg-zinc-900 -ml-1"></div>
                    <div className="h-[2px] bg-zinc-900 w-full opacity-70"></div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none w-full px-2 sm:px-0">
              {metas.map((m) => {
                const percentual = Math.min(100, (m.progresso / m.meta) * 100);
                return (
                  <div key={m.id} className="relative inline-flex items-center justify-between w-auto max-w-[280px] bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shrink-0 h-12 shadow-md">
                    <div className="absolute top-0 left-0 bottom-0 transition-all duration-300 opacity-80 z-0" style={{ width: `${percentual}%`, backgroundColor: m.cor }}></div>
                    <div className="relative z-10 pl-1.5 pr-0.5 flex flex-col justify-center overflow-hidden">
                      <span className="text-xs font-bold text-white truncate">{m.titulo}</span>
                      <span className="text-[10px] text-zinc-300 font-mono">{m.progresso} / {m.meta} {m.unidade}</span>
                    </div>
                    <div className="relative z-10 flex items-center gap-0.5 pr-1.5 pl-0.5">
                      <button onClick={() => handleIncrementarMeta(m.id)} className="w-7 h-7 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded flex items-center justify-center text-sm transition-colors">+</button>
                      <button onClick={() => { setMetaEditando(m); setIsGoalModalOpen(true); }} className="w-7 h-7 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 rounded flex items-center justify-center text-xs transition-colors">...</button>
                    </div>
                  </div>
                );
              })}

              {metas.length === 0 ? (
                <button onClick={() => { setMetaEditando(null); setIsGoalModalOpen(true); }} className="px-4 h-12 bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-2 shrink-0">
                  <span className="text-base">+</span> Adicionar meta diária
                </button>
              ) : (
                <button onClick={() => { setMetaEditando(null); setIsGoalModalOpen(true); }} className="w-12 h-12 bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-lg font-medium text-zinc-400 hover:text-zinc-100 transition-colors flex items-center justify-center shrink-0" title="Adicionar nova meta">+</button>
              )}
            </div>

            <div className="mt-3 w-full px-2 sm:px-0 flex flex-col gap-2">
              
              {/* BLOCO DE ATRASADAS (Inicia minimizado) */}
              {totalAtrasadas > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 shadow-lg">
                  <div className="flex justify-between items-center mb-1">
                    <button onClick={() => toggleMinimizar('atrasadas')} className="text-xs font-bold text-red-400 hover:text-red-300 flex items-center gap-2">
                      <span>{minimizedSections['atrasadas'] !== false ? '▶\uFE0E' : '▼\uFE0E'}</span> Atrasadas ({totalAtrasadas})
                    </button>
                    <button onClick={() => { setTarefaEditando(null); setIsTaskModalOpen(true); }} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center justify-center text-xs transition-colors">+</button>
                  </div>

                  {minimizedSections['atrasadas'] === false && (
                    <div className="space-y-3 mt-2">
                      {datasAtrasadasOrdenadas.map(dataKey => {
                        const lista = tarefasAtrasadasPorData[dataKey] || [];
                        if (lista.length === 0) return null;
                        return (
                          <div key={dataKey} className="space-y-1.5">
                            <div className="text-[11px] font-bold text-zinc-400 pl-1">{formatarTituloData(dataKey)}</div>
                            {lista.map(t => {
                              const horario = t.horario || t.hora;
                              const titulo = t.nome || t.texto;
                              const isAvaliacao = t.tipo === 'avaliacao';

                              return (
                                <div 
                                  key={t.id} 
                                  onClick={() => { setTarefaDetalhe(t); setIsTaskDetailOpen(true); }}
                                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-opacity"
                                  style={{ backgroundColor: t.cor || (isAvaliacao ? '#1e3a8a' : '#000000') }}
                                >
                                  <div className="flex items-center gap-2 overflow-hidden pr-2 flex-1">
                                    {horario && <span className="font-mono font-bold text-xs text-white shrink-0">{horario}</span>}
                                    {horario && <span className="text-white font-bold text-xs">-</span>}
                                    
                                    <div className="flex flex-col overflow-hidden flex-1">
                                      <div className="flex items-center gap-2 overflow-hidden">
                                        {isAvaliacao && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-blue-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                                        <span className="text-white font-semibold text-xs truncate">{titulo}</span>
                                        <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">Atrasado</span>
                                      </div>
                                      {t.detalhes && <span className="text-zinc-300 text-[10px] whitespace-pre-line max-w-full">{t.detalhes}</span>}
                                    </div>
                                  </div>
                                  <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-2 flex items-center">
                                    <input type="checkbox" checked={false} onChange={() => handleToggleConcluida(t)} className="w-4 h-4 rounded cursor-pointer bg-black/35 border-0 accent-zinc-500" />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* BLOCO DE HOJE (Inicia maximizado) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 shadow-lg">
                <div className="flex justify-between items-center mb-1">
                  <button onClick={() => toggleMinimizar(hojeStr)} className="text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-2">
                    <span>{minimizedSections[hojeStr] ? '▶\uFE0E' : '▼\uFE0E'}</span> {dataFormatadaHoje}
                  </button>
                  <button onClick={() => { setTarefaEditando(null); setIsTaskModalOpen(true); }} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center justify-center text-xs transition-colors">+</button>
                </div>

                {!minimizedSections[hojeStr] && (
                  <div className="space-y-1.5 mt-2">
                    {atividadesNaoConcluidasHoje.map(atv => {
                      const agora = new Date();
                      let isAtrasadoAtv = false;
                      if (atv.horarioInicio) {
                        const [h, m] = atv.horarioInicio.split(':');
                        const dataHoraAtv = new Date();
                        dataHoraAtv.setHours(h, m, 0);
                        if (dataHoraAtv < agora) isAtrasadoAtv = true;
                      }

                      return (
                        <div 
                          key={atv.uniqueKey} 
                          onClick={() => abrirDetalhesAtividade(atv)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-opacity" 
                          style={{ backgroundColor: atv.cor }}
                        >
                          <div className="flex items-center gap-2 overflow-hidden pr-2 flex-1">
                            <span className="font-mono font-bold text-xs text-white shrink-0">{atv.horarioExibicao || '--:--'}</span>
                            <span className="text-white font-bold text-xs">-</span>
                            <div className="flex flex-col overflow-hidden flex-1">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-white font-semibold text-xs truncate">{atv.apelido || atv.nome}</span>
                                {isAtrasadoAtv && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">Atrasado</span>}
                              </div>
                              {atv.detalhes && <span className="text-zinc-200 text-[10px] whitespace-pre-line max-w-full">{atv.detalhes}</span>}
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-2 flex items-center">
                            <input type="checkbox" checked={false} onChange={() => handleToggleConcluidaAtividade(atv.id, atv.horarioInicio)} className="w-4 h-4 rounded cursor-pointer bg-black/35 border-0 accent-zinc-500" />
                          </div>
                        </div>
                      );
                    })}

                    {(tarefasPorData[hojeStr] || []).filter(t => !t.concluida).map(t => {
                      const agora = new Date();
                      let isAtrasado = false;
                      const horario = t.horario || t.hora;
                      const titulo = t.nome || t.texto;
                      const isAvaliacao = t.tipo === 'avaliacao';

                      if (horario) {
                        const [h, m] = horario.split(':');
                        const dataHoraTarefa = new Date();
                        dataHoraTarefa.setHours(h, m, 0);
                        if (dataHoraTarefa < agora) isAtrasado = true;
                      }

                      return (
                        <div 
                          key={t.id} 
                          onClick={() => { setTarefaDetalhe(t); setIsTaskDetailOpen(true); }}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-opacity"
                          style={{ backgroundColor: t.cor || (isAvaliacao ? '#1e3a8a' : '#000000') }}
                        >
                          <div className="flex items-center gap-2 overflow-hidden pr-2 flex-1">
                            {horario && <span className="font-mono font-bold text-xs text-white shrink-0">{horario}</span>}
                            {horario && <span className="text-white font-bold text-xs">-</span>}
                            
                            <div className="flex flex-col overflow-hidden flex-1">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {isAvaliacao && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-blue-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                                <span className="text-white font-semibold text-xs truncate">{titulo}</span>
                                {isAtrasado && <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">Atrasado</span>}
                              </div>
                              {t.detalhes && <span className="text-zinc-300 text-[10px] whitespace-pre-line max-w-full">{t.detalhes}</span>}
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-2 flex items-center">
                            <input type="checkbox" checked={false} onChange={() => handleToggleConcluida(t)} className="w-4 h-4 rounded cursor-pointer bg-black/35 border-0 accent-zinc-500" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {datasOrdenadas.map(dataKey => {
                if (dataKey === hojeStr || dataKey < hojeStr) return null;
                
                // Por padrão, se não estiver definido no state, inicia como falso (maximizado)
                const isMinimizado = minimizedSections[dataKey] !== undefined ? minimizedSections[dataKey] : false;
                
                const listaTarefas = (tarefasPorData[dataKey] || []).filter(t => !t.concluida);
                if (listaTarefas.length === 0 && dataKey !== 'Sem data') return null;

                return (
                  <div key={dataKey} className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5 shadow-lg">
                    <div className="flex justify-between items-center mb-1">
                      <button onClick={() => toggleMinimizar(dataKey)} className="text-xs font-bold text-zinc-200 hover:text-white flex items-center gap-2">
                        <span>{isMinimizado ? '▶\uFE0E' : '▼\uFE0E'}</span> {formatarTituloData(dataKey)}
                      </button>
                      <button onClick={() => { setTarefaEditando(null); setIsTaskModalOpen(true); }} className="w-6 h-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded flex items-center justify-center text-xs transition-colors">+</button>
                    </div>

                    {!isMinimizado && (
                      <div className="space-y-1.5 mt-2">
                        {listaTarefas.map(t => {
                          const horario = t.horario || t.hora;
                          const titulo = t.nome || t.texto;
                          const isAvaliacao = t.tipo === 'avaliacao';

                          return (
                            <div 
                              key={t.id} 
                              onClick={() => { setTarefaDetalhe(t); setIsTaskDetailOpen(true); }}
                              className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800 cursor-pointer hover:border-zinc-700 transition-opacity"
                              style={{ backgroundColor: t.cor || (isAvaliacao ? '#1e3a8a' : '#000000') }}
                            >
                              <div className="flex items-center gap-2 overflow-hidden pr-2 flex-1">
                                {horario && <span className="font-mono font-bold text-xs text-white shrink-0">{horario}</span>}
                                {horario && <span className="text-white font-bold text-xs">-</span>}
                                
                                <div className="flex flex-col overflow-hidden flex-1">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    {isAvaliacao && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-blue-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                                    <span className="text-white font-semibold text-xs truncate">{titulo}</span>
                                  </div>
                                  {t.detalhes && <span className="text-zinc-300 text-[10px] whitespace-pre-line max-w-full">{t.detalhes}</span>}
                                </div>
                              </div>
                              <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-2 flex items-center">
                                <input type="checkbox" checked={false} onChange={() => handleToggleConcluida(t)} className="w-4 h-4 rounded cursor-pointer bg-black/35 border-0 accent-zinc-500" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* BLOCO DE CONCLUÍDAS (Inicia minimizado) */}
              {(tarefasConcluidas.length > 0 || atividadesConcluidasHojeList.length > 0) && (
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl px-3 py-2.5 shadow-lg">
                  <div className="flex justify-between items-center mb-1">
                    <button onClick={() => toggleMinimizar('concluidas')} className="text-xs font-bold text-zinc-400 hover:text-zinc-200 flex items-center gap-2">
                      <span>{minimizedSections['concluidas'] !== false ? '▶\uFE0E' : '▼\uFE0E'}</span> Concluídas ({tarefasConcluidas.length + atividadesConcluidasHojeList.length})
                    </button>
                    {tarefasConcluidas.length > 0 && (
                      <button onClick={() => setConfirmarExclusaoConcluidas(true)} className="text-[10px] font-semibold px-2 py-0.5 bg-red-950/60 hover:bg-red-900/60 text-red-400 rounded transition-colors">
                        Excluir
                      </button>
                    )}
                  </div>

                  {minimizedSections['concluidas'] === false && (
                    <div className="space-y-1.5 mt-2">
                      {atividadesConcluidasHojeList.map(atv => (
                        <div 
                          key={atv.uniqueKey} 
                          onClick={() => abrirDetalhesAtividade(atv)}
                          className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800/50 opacity-50 cursor-pointer" 
                          style={{ backgroundColor: atv.cor }}
                        >
                          <div className="flex items-center gap-2 overflow-hidden pr-2 flex-1">
                            <span className="font-mono font-bold text-xs text-white line-through shrink-0">{atv.horarioExibicao || '--:--'}</span>
                            <span className="text-white font-bold text-xs">-</span>
                            <div className="flex flex-col overflow-hidden flex-1">
                              <span className="text-white font-semibold text-xs truncate line-through">{atv.apelido || atv.nome}</span>
                              {atv.detalhes && <span className="text-zinc-200 text-[10px] whitespace-pre-line line-through">{atv.detalhes}</span>}
                            </div>
                          </div>
                          <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-2 flex items-center">
                            <input type="checkbox" checked={true} onChange={() => handleToggleConcluidaAtividade(atv.id, atv.horarioInicio)} className="w-4 h-4 rounded cursor-pointer accent-zinc-500" />
                          </div>
                        </div>
                      ))}

                      {tarefasConcluidas.map(t => {
                        const horario = t.horario || t.hora;
                        const titulo = t.nome || t.texto;
                        const isAvaliacao = t.tipo === 'avaliacao';

                        return (
                          <div 
                            key={t.id} 
                            onClick={() => { setTarefaDetalhe(t); setIsTaskDetailOpen(true); }}
                            className="flex items-center justify-between px-3 py-2 rounded-lg border border-zinc-800/50 cursor-pointer opacity-50 transition-opacity"
                            style={{ backgroundColor: t.cor || (isAvaliacao ? '#1e3a8a' : '#000000') }}
                          >
                            <div className="flex items-center gap-2 overflow-hidden pr-2 flex-1">
                              {horario && <span className="font-mono font-bold text-xs text-white line-through shrink-0">{horario}</span>}
                              {horario && <span className="text-white font-bold text-xs">-</span>}
                              
                              <div className="flex flex-col overflow-hidden flex-1">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  {isAvaliacao && <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-blue-400 shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>}
                                  <span className="text-white font-semibold text-xs truncate line-through">{titulo}</span>
                                </div>
                                {t.detalhes && <span className="text-zinc-300 text-[10px] whitespace-pre-line line-through">{t.detalhes}</span>}
                              </div>
                            </div>

                            <div onClick={(e) => e.stopPropagation()} className="shrink-0 pl-2 flex items-center">
                              <input type="checkbox" checked={t.concluida} onChange={() => handleToggleConcluida(t)} className="w-4 h-4 rounded cursor-pointer accent-zinc-500" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

        {activePage === 'Notas' && (
          <Notas user={user} atividades={atividades} isAvaliacoesOpen={isAvaliacoesOpen} setIsAvaliacoesOpen={setIsAvaliacoesOpen} />
        )}

        {activePage !== 'Grade' && activePage !== 'Notas' && (
          <div className="w-full max-w-5xl flex flex-col items-center justify-center flex-1 text-zinc-400 gap-4">
            <h2 className="text-2xl font-bold text-zinc-100">{activePage}</h2>
            <p>Página em construção...</p>
            <button onClick={() => setActivePage('Grade')} className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded text-sm hover:bg-zinc-700">
              Voltar para a Grade
            </button>
          </div>
        )}
      </main>

      {confirmarExclusaoConcluidas && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Excluir Concluídas</h3>
            <p className="text-sm text-zinc-400">Tem certeza que deseja excluir todas as tarefas concluídas?</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmarExclusaoConcluidas(false)} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm">Cancelar</button>
              <button onClick={handleExcluirTarefasConcluidas} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium text-sm">Excluir</button>
            </div>
          </div>
        </div>
      )}

      <ActivityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSalvarAtividade} 
        onDelete={handleExcluirAtividade} 
        atividadeEditada={atividadeEditando} 
        categorias={categorias}
        coresUsadas={coresUsadas}
        modoVisualizacaoInicial={modoVisualizacao}
      />
      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSalvarMeta}
        onDelete={handleExcluirMeta}
        onReset={handleZerarMeta}
        metaEditada={metaEditando}
      />
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSalvarTarefa}
        onDelete={handleExcluirTarefa}
        taskEditada={tarefaEditando}
        atividades={atividades}
      />
      <TaskDetailModal 
        isOpen={isTaskDetailOpen}
        onClose={() => setIsTaskDetailOpen(false)}
        tarefa={tarefaDetalhe}
        onDelete={handleExcluirTarefa}
        onEdit={(t) => { setTarefaEditando(t); setIsTaskModalOpen(true); }}
      />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user} 
        onProfileUpdated={atualizarAvatarPerfil}
      />
      <RightMenu 
        isOpen={isRightMenuOpen} 
        onClose={() => setIsRightMenuOpen(false)} 
        onSelectPage={(page) => setActivePage(page)}
        activePage={activePage}
      />
    </div>
  );
}
