import { useState, useEffect, useRef, Fragment } from 'react';
import AgendaGoogle from '../components/AgendaGoogle';
import MedidasCorporais from '../components/MedidasCorporais';
import ExerciciosBiblioteca from '../components/ExerciciosBiblioteca';
import TreinosLista from '../components/TreinosLista';
import { treinoDaAtividade, modeloAtividadeDoTreino } from '../utils/treinoAtividade';
import { resumoTreino } from '../utils/treinoModelo';
import MetasMenu from '../components/MetasMenu';
import useVoltar from '../hooks/useVoltar';
import { linhasDe, distribuirMetas, moverMeta, posicaoNovaMeta } from '../utils/metasLayout';
import useBiblioteca from '../hooks/useBiblioteca';
import useExerciciosCustom from '../hooks/useExerciciosCustom';
import { registrarCustom } from '../data/exercicios';
import { modoAdminAtivo } from '../utils/treino';
import { textoParaFundo } from '../utils/cores';
import { paginasVisiveis, secoesAtivasDaPagina, PAGINAS } from '../utils/layout';
import { integracaoConfigurada } from '../services/googleAgenda';
import { coresVermelhas, disciplinaDaAtividade, resumoDisciplina } from '../utils/notasStatus';
import Configuracoes from './Configuracoes';
import useDados from '../hooks/useDados';
import useConfig from '../hooks/useConfig';
import useGoogleAutoSync from '../hooks/useGoogleAutoSync';
import { horaParaMinutos } from '../utils/horario';
import ActivityModal from '../components/ActivityModal';
import GoalModal from '../components/GoalModal';
import Sidebar from '../components/Sidebar';
import RightMenu from '../components/RightMenu';
import Notas from './Notas';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { salvarDoc, apagarDoc, registrarSchema } from '../services/db';
import { getInitials } from '../utils/defaultAvatars';
import { diaDaMeta, progressoAtual } from '../utils/metas';
import { notificar } from '../utils/toast';
import Avatar from '../components/Avatar';

export default function Dashboard() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isMetasMenuOpen, setIsMetasMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightMenuOpen, setIsRightMenuOpen] = useState(false);
  const [isAvaliacoesOpen, setIsAvaliacoesOpen] = useState(false); 
  const [activePage, setActivePage] = useState(null); // null = a primeira página da ordem escolhida nas Configurações
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [user, setUser] = useState(null);
  const [userAvatar, setUserAvatar] = useState('');
  const { config, atualizarConfig } = useConfig(user);
  const googleOk = integracaoConfigurada();
  const paginasMenu = paginasVisiveis(config, googleOk);
  // página aberta: a escolhida; se não houver (ou foi desativada), a primeira da ordem; sem nenhuma, as Configurações
  const paginaAtual = activePage === 'Configuracoes' ? 'Configuracoes' : (paginasMenu.includes(activePage) ? activePage : (paginasMenu[0] || 'Configuracoes'));
  // botão voltar do celular: fora da página inicial, volta para ela (em vez de fechar o app)
  useVoltar(paginasMenu.length > 0 && paginaAtual !== paginasMenu[0], () => setActivePage(null));
  const midias = useBiblioteca();
  const { atividades, setAtividades, metas, setMetas, tarefas, cursos, medidas, setMedidas, treinos, setTreinos, sessoes, setSessoes, exerciciosCustom, setExerciciosCustom } = useDados(user, paginaAtual);
  registrarCustom(exerciciosCustom);
  const exCustom = { lista: exerciciosCustom, ...useExerciciosCustom(user, exerciciosCustom, setExerciciosCustom) };
  const sync = useGoogleAutoSync({ user, atividades, tarefas, ativo: config.integracoes.googleAutoSync });
  
  const [atividadeEditando, setAtividadeEditando] = useState(null);
  const [modeloAtividade, setModeloAtividade] = useState(null); // pré-preenchimento de "Agendar na grade"
  const [treinoAbrir, setTreinoAbrir] = useState(null); // { id, registrar } pedido para abrir um treino na página Treinos
  const [metaEditando, setMetaEditando] = useState(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(true);

  const [categorias, setCategorias] = useState(['Estudos', 'Trabalho', 'Treinos', 'Outros']);
  const coresUsadas = Array.from(new Set(atividades.map(a => a.cor)));
  // categorias personalizadas vêm das próprias atividades salvas (assim não somem ao recarregar)
  const categoriasTodas = Array.from(new Set([...categorias, ...atividades.map(a => a.categoria).filter(Boolean)]));

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
        registrarSchema(currentUser);
      } else {
        setUserAvatar('');
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // A foto vem da nuvem (users/{uid}.avatar), então aparece também em sessão nova ou outro aparelho; o localStorage é só cache.
  useEffect(() => {
    if (!user) return;
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const av = snap.exists() ? snap.data().avatar : undefined;
        if (av === undefined) return;
        setUserAvatar(av || '');
        try {
          if (av) localStorage.setItem(`profile_avatar_${user.uid}`, av);
          else localStorage.removeItem(`profile_avatar_${user.uid}`);
        } catch { /* sem armazenamento */ }
      },
      (e) => console.warn('Foto de perfil:', e?.code || e)
    );
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
      (atv.horarios || []).forEach(h => {
        if (!h.inicio || !h.fim) return;
        const startH = parseInt(h.inicio.split(':')[0]);
        const endH = parseInt(h.fim.split(':')[0]);
        const endM = parseInt(h.fim.split(':')[1]);
        const calcEnd = endM > 0 ? endH + 1 : endH;
        
        if (h.fim <= h.inicio) {
          // atravessa a meia-noite: ocupa até 24h e recomeça às 00h no dia seguinte
          if (startH < minHour) minHour = startH;
          maxHour = 24;
          minHour = 0;
          return;
        }
        if (startH < minHour) minHour = startH;
        if (calcEnd > maxHour) maxHour = calcEnd;
      });
    });
    if (minHour > maxHour || minHour === 24) { minHour = 6; maxHour = 22; }
  }

  const horas = Array.from({ length: maxHour - minHour }, (_, i) => i + minHour);
  const ROW_HEIGHT = Math.max(12, Math.min(80, Number(config.grade?.pxPorHora) || 22));

  // atividade vinculada a uma disciplina "Cursando" com nota vermelha: o bloco fica vermelho
  const vermelhas = coresVermelhas(cursos);
  const corDoBloco = (atv) => {
    const v = disciplinaDaAtividade(cursos, atv.id);
    return (v && vermelhas[v.disc.id]) || atv.cor;
  };
  
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
      await salvarDoc(doc(db, 'users', user.uid, 'atividades', novaAtividade.id), novaAtividade);
    } else {
      setAtividades((atuais) => {
        const existe = atuais.some(a => a.id === novaAtividade.id);
        const atualizadas = existe ? atuais.map(a => a.id === novaAtividade.id ? novaAtividade : a) : [...atuais, novaAtividade];
        localStorage.setItem('local_atividades', JSON.stringify(atualizadas));
        return atualizadas;
      });
    }
  };

  const handleExcluirAtividade = async (id) => {
    const anterior = atividades.find(a => a.id === id);
    if (anterior) notificar('Atividade excluída.', 'info', { rotulo: 'Desfazer', fn: () => handleSalvarAtividade(anterior) });
    if (user) {
      await apagarDoc(doc(db, 'users', user.uid, 'atividades', id));
    } else {
      const atualizadas = atividades.filter(a => a.id !== id);
      setAtividades(atualizadas);
      localStorage.setItem('local_atividades', JSON.stringify(atualizadas));
    }
  };

  const persistirMeta = async (meta) => {
    if (user) {
      return await salvarDoc(doc(db, 'users', user.uid, 'metas', meta.id), meta);
    } else {
      setMetas((atuais) => {
        const existe = atuais.some(m => m.id === meta.id);
        const atualizadas = existe ? atuais.map(m => m.id === meta.id ? meta : m) : [...atuais, meta];
        localStorage.setItem('local_metas', JSON.stringify(atualizadas));
        return atualizadas;
      });
      return true;
    }
  };

  const handleSalvarMeta = async (novaMeta) => {
    const existente = metas.find(m => m.id === novaMeta.id);
    const agora = new Date();
    let meta = { ...(existente || {}), ...novaMeta };
    if (!existente) meta = { ...meta, ...posicaoNovaMeta(metas, linhasDe(config)) };
    if (!existente) {
      meta.diaReferencia = diaDaMeta(agora, meta.horarioReset);
    } else if ((existente.horarioReset || '00:00') !== (meta.horarioReset || '00:00')) {
      // mudou o horário de reset: mantém o progresso de hoje e recalcula o "dia da meta"
      meta = { ...meta, progresso: progressoAtual(existente, agora), diaReferencia: diaDaMeta(agora, meta.horarioReset) };
    }
    await persistirMeta(meta);
  };

  // arrastar na lista "Editar" do menu de metas: grava ordem (e linha) só das metas que mudaram
  const handleMoverMeta = async (id, linha, indice) => {
    const mudancas = moverMeta(metas, linhasDe(config), id, linha, indice);
    await Promise.all(mudancas.map((c) => {
      const atual = metas.find((m) => m.id === c.id);
      return atual ? persistirMeta({ ...atual, ordem: c.ordem, ...(c.linha ? { linha: c.linha } : {}) }) : null;
    }));
  };

  const handleValorMeta = async (meta, valor) => {
    await persistirMeta({ ...meta, meta: valor, progresso: Math.min(Number(meta.progresso) || 0, valor) });
  };

  const handleIncrementarMeta = async (metaId) => {
    const metaAtual = metas.find(m => m.id === metaId);
    if (!metaAtual) return;
    const agora = new Date();
    const base = progressoAtual(metaAtual, agora);
    const novoProgresso = Number((base + metaAtual.incremento).toFixed(2));
    await persistirMeta({
      ...metaAtual,
      progresso: novoProgresso > metaAtual.meta ? metaAtual.meta : novoProgresso,
      diaReferencia: diaDaMeta(agora, metaAtual.horarioReset),
    });
  };

  const handleZerarMeta = async (metaId) => {
    const metaAtual = metas.find(m => m.id === metaId);
    if (!metaAtual) return;
    await persistirMeta({ ...metaAtual, progresso: 0, diaReferencia: diaDaMeta(new Date(), metaAtual.horarioReset) });
  };

  const handleExcluirMeta = async (metaId) => {
    const anterior = metas.find(m => m.id === metaId);
    if (user) {
      await apagarDoc(doc(db, 'users', user.uid, 'metas', metaId));
    } else {
      const atualizadas = metas.filter(m => m.id !== metaId);
      setMetas(atualizadas);
      localStorage.setItem('local_metas', JSON.stringify(atualizadas));
    }
    if (anterior) notificar('Meta excluída.', 'info', { rotulo: 'Desfazer', fn: () => persistirMeta(anterior) });
  };

  // Reset automático: quando o "dia da meta" vira (no horário de reset de cada meta), o progresso volta a zero.
  const resetsEmAndamento = useRef(new Set());
  useEffect(() => {
    metas.forEach((m) => {
      const chave = diaDaMeta(currentTime, m.horarioReset);
      if (m.diaReferencia === chave) return;
      if (m.diaReferencia && m.diaReferencia > chave) return; // relógio voltou: não mexe
      const marca = `${m.id}|${chave}`;
      if (resetsEmAndamento.current.has(marca)) return;
      resetsEmAndamento.current.add(marca);
      // sem diaReferencia (meta antiga): só registra o dia, sem zerar o progresso
      const progresso = m.diaReferencia ? 0 : m.progresso;
      persistirMeta({ ...m, progresso, diaReferencia: chave });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metas, currentTime]);

  const abrirNovaAtividade = () => {
    setModeloAtividade(null);
    setAtividadeEditando(null);
    setModoVisualizacao(false);
    setIsModalOpen(true);
  };

  // "Agendar na grade": abre o formulário de atividade já com o treino escolhido
  const agendarTreino = (treino) => {
    setModeloAtividade(modeloAtividadeDoTreino(treino));
    setAtividadeEditando(null);
    setModoVisualizacao(false);
    setIsModalOpen(true);
  };

  // da atividade na grade para o treino (e, se pedido, direto para o registro da sessão)
  const abrirTreino = (id, registrar) => {
    if (!paginasMenu.includes('Treinos') || config.blocos.treinos === false) {
      notificar('Ative a página Treinos e o bloco "Meus treinos" em Configurações para abrir o treino.', 'info');
      return;
    }
    setIsModalOpen(false);
    setTreinoAbrir({ id, registrar: !!registrar });
    setActivePage('Treinos');
  };

  const abrirDetalhesAtividade = (atv) => {
    setModeloAtividade(null);
    setAtividadeEditando(atv);
    setModoVisualizacao(true);
    setIsModalOpen(true);
  };

  const userName = user ? (user.displayName || user.email.split('@')[0]) : 'Login';
  const userInitials = getInitials(userName);

  // ---------- grade: segmentos por dia, com colunas lado a lado quando há sobreposição ----------
  const segmentosGrade = [];
  atividades.forEach((atv) => {
    (atv.horarios || []).forEach((h, i) => {
      if (!h.inicio || !h.fim) return;
      const dayIndex = diasDaSemana.indexOf(h.dia);
      if (dayIndex === -1) return;
      const ini = horaParaMinutos(h.inicio);
      const fim = horaParaMinutos(h.fim);
      if (fim > ini) {
        segmentosGrade.push({ atv, chave: `${atv.id}-${i}`, dayIndex, ini, fim, lane: 0, cols: 1 });
      } else {
        // atravessa a meia-noite: até 24h no dia e o restante no dia seguinte
        segmentosGrade.push({ atv, chave: `${atv.id}-${i}`, dayIndex, ini, fim: 1440, lane: 0, cols: 1 });
        if (fim > 0) segmentosGrade.push({ atv, chave: `${atv.id}-${i}-b`, dayIndex: (dayIndex + 1) % 7, ini: 0, fim, lane: 0, cols: 1 });
      }
    });
  });
  for (let d = 0; d < 7; d++) {
    const doDia = segmentosGrade.filter(x => x.dayIndex === d).sort((a, b) => a.ini - b.ini || a.fim - b.fim);
    let grupo = [];
    let fimGrupo = -1;
    let lanes = [];
    const fecharGrupo = () => { grupo.forEach(x => { x.cols = Math.max(1, lanes.length); }); grupo = []; lanes = []; };
    doDia.forEach((seg) => {
      if (grupo.length > 0 && seg.ini >= fimGrupo) { fecharGrupo(); fimGrupo = -1; }
      let lane = lanes.findIndex(fimLane => fimLane <= seg.ini);
      if (lane === -1) { lane = lanes.length; lanes.push(seg.fim); } else { lanes[lane] = seg.fim; }
      seg.lane = lane;
      grupo.push(seg);
      fimGrupo = Math.max(fimGrupo, seg.fim);
    });
    fecharGrupo();
  }

  // blocos que podem aparecer em qualquer página (a ordem e a página vêm das Configurações)
  const secaoCursos = <Notas user={user} atividades={atividades} isAvaliacoesOpen={isAvaliacoesOpen} setIsAvaliacoesOpen={setIsAvaliacoesOpen} />;
  const secoesDaPaginaAtual = paginaAtual === 'Configuracoes' ? [] : secoesAtivasDaPagina(config, paginaAtual, googleOk);
  const secoes = {
    grade: (
      <>
            {atividades.length === 0 && (
              <p className="text-xs text-zinc-500 text-center py-2">
                Sua grade está vazia. Toque no + no topo para adicionar a primeira atividade.
              </p>
            )}
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

                {segmentosGrade.map((seg) => {
                  const { atv } = seg;
                  const top = ((seg.ini / 60) - minHour) * ROW_HEIGHT;
                  const height = ((seg.fim - seg.ini) / 60) * ROW_HEIGHT;
                  const opacityClass = currentDay === seg.dayIndex ? 'opacity-100' : 'opacity-70';
                  const textoPrincipal = atv.apelido ? atv.apelido : atv.nome;
                  const corBloco = corDoBloco(atv);
                  const hh = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

                  return (
                    <div 
                      key={seg.chave} 
                      onClick={() => abrirDetalhesAtividade(atv)}
                      title={`${atv.apelido || atv.nome || ''} · ${hh(seg.ini)}–${hh(seg.fim)}`}
                      className={`absolute rounded text-[10px] overflow-hidden cursor-pointer hover:opacity-100 transition-opacity border border-black/20 px-0.5 py-0 flex flex-col justify-start break-words ${opacityClass}`}
                      style={{
                        backgroundColor: corBloco, color: textoParaFundo(corBloco), top: `${top}px`, height: `${height}px`,
                        left: `calc(${seg.dayIndex} * (100% / 7) + ${seg.lane} * (100% / 7) / ${seg.cols})`,
                        width: `calc((100% / 7) / ${seg.cols})`
                      }}
                    >
                      <div className="font-bold leading-none break-words">{textoPrincipal}</div>
                      {atv.detalhes && (
                        <div className="text-[8px] opacity-80 leading-none mt-0.5 whitespace-pre-line break-words">{atv.detalhes}</div>
                      )}
                    </div>
                  );
                })}

                {config.blocos.linhaAgora && showTimeLine && (
                  <div className="absolute left-0 right-0 flex items-center z-10 pointer-events-none" style={{ top: `${timeLineTop}px` }}>
                    <div className="w-2 h-2 rounded-full bg-zinc-900 -ml-1"></div>
                    <div className="h-[2px] bg-zinc-900 w-full opacity-70"></div>
                  </div>
                )}
              </div>
            </div>

      </>
    ),
    metas: (() => {
      const nLinhas = linhasDe(config);
      const [linha1, linha2] = distribuirMetas(metas, nLinhas);
      const abrirMenu = () => setIsMetasMenuOpen(true);
      const blocoMeta = (m) => {
        const progressoExibido = progressoAtual(m, currentTime);
        const percentual = Math.min(100, (progressoExibido / m.meta) * 100);
        return (
          <div key={m.id} className="relative inline-flex items-center justify-between w-auto max-w-[280px] bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shrink-0 h-12 shadow-md">
            <div className="absolute top-0 left-0 bottom-0 transition-all duration-300 opacity-80 z-0" style={{ width: `${percentual}%`, backgroundColor: m.cor }}></div>
            <div className="relative z-10 pl-1.5 pr-0.5 flex flex-col justify-center overflow-hidden">
              <span className="text-xs font-bold text-white truncate">{m.titulo}</span>
              <span className="text-[10px] text-zinc-300 font-mono">{progressoExibido} / {m.meta} {m.unidade}</span>
            </div>
            <div className="relative z-10 flex items-center gap-0.5 pr-1.5 pl-0.5">
              <button aria-label={`Adicionar a ${m.titulo}`} onClick={() => handleIncrementarMeta(m.id)} className="w-7 h-7 bg-zinc-800/80 hover:bg-zinc-700 text-white rounded flex items-center justify-center text-sm transition-colors">+</button>
            </div>
          </div>
        );
      };
      const botaoMais = metas.length === 0 ? (
        <button onClick={() => { setMetaEditando(null); setIsGoalModalOpen(true); }} className="px-4 h-12 bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-2 shrink-0">
          <span className="text-base">+</span> Adicionar meta diária
        </button>
      ) : (
        <button onClick={abrirMenu} aria-label="Menu das metas diárias" className="w-12 h-12 bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 rounded-lg text-lg font-medium text-zinc-400 hover:text-zinc-100 transition-colors flex items-center justify-center shrink-0" title="Adicionar ou organizar metas">+</button>
      );
      const faixa = (lista, comMais) => (
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none w-full px-2 sm:px-0">
          {lista.map(blocoMeta)}
          {comMais && botaoMais}
        </div>
      );
      return (
        <div className="mt-3 flex flex-col gap-2 w-full">
          {faixa(linha1, nLinhas === 1)}
          {nLinhas === 2 && faixa(linha2, true)}
        </div>
      );
    })(),
    agenda: (
      <>
              <AgendaGoogle user={user} agendas={sync.agendas} config={config} atualizarConfig={atualizarConfig} />
      </>
    ),
    cursos: secaoCursos,
    medidas: <MedidasCorporais user={user} medidas={medidas} setMedidas={setMedidas} sexo={config.treino.sexo} onSexo={(v) => atualizarConfig({ treino: { sexo: v } })} />,
    treinos: <TreinosLista user={user} treinos={treinos} setTreinos={setTreinos} sessoes={sessoes} setSessoes={setSessoes} atividades={atividades} onAgendar={agendarTreino} abrir={treinoAbrir} onAbriu={() => setTreinoAbrir(null)} config={config} atualizarConfig={atualizarConfig} exCustom={exCustom} />,
    exercicios: (
      <div className="mt-2 w-full px-2 sm:px-0">
        <h2 className="text-base font-bold text-zinc-100 mb-2">Biblioteca de exercícios</h2>
        <ExerciciosBiblioteca config={config} atualizarConfig={atualizarConfig} midias={midias} admin={modoAdminAtivo(user, config)} exCustom={exCustom} treinos={treinos} sessoes={sessoes} />
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="flex justify-between items-center px-6 py-2 border-b border-zinc-800 shrink-0">
        <div onClick={() => setIsSidebarOpen(true)} role="button" aria-label="Abrir menu do perfil" className="flex items-center gap-2 cursor-pointer hover:text-zinc-300">
          <div className="w-8 h-8 rounded-full border-2 border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-800 text-zinc-200 font-bold text-[10px]">
            <Avatar src={userAvatar} initials={userInitials} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(sync.mostrarBotao || sync.sincronizando) && (
            <button
              onClick={sync.sincronizarAgora}
              disabled={sync.sincronizando}
              className="bg-zinc-900 border border-zinc-800 w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors shadow-sm text-blue-500 hover:text-blue-400 disabled:opacity-70"
              aria-label="Sincronizar com o Google Agenda"
              title={sync.sincronizando ? 'Sincronizando…' : `Sincronizar com o Google Agenda (${sync.pendentes} ${sync.pendentes === 1 ? 'mudança' : 'mudanças'})`}
            >
              <svg className={sync.sincronizando ? 'animate-spin' : ''} width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" aria-hidden="true"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>
          )}

          {secoesDaPaginaAtual.includes('grade') && (
            <button 
              onClick={abrirNovaAtividade} 
              className="bg-zinc-900 text-zinc-100 border border-zinc-800 w-8 h-8 flex items-center justify-center text-base font-bold rounded hover:bg-zinc-800 transition-colors shadow-sm"
              aria-label="Nova atividade"
              title="Nova atividade"
            >
              +
            </button>
          )}

          {secoesDaPaginaAtual.includes('cursos') && (
            <button 
              onClick={() => setIsAvaliacoesOpen(true)} 
              className="bg-zinc-900 text-zinc-100 border border-zinc-800 w-8 h-8 flex items-center justify-center rounded hover:bg-zinc-800 transition-colors shadow-sm text-zinc-400 hover:text-white"
              title="Avaliações"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </button>
          )}

          <button aria-label="Abrir menu" onClick={() => setIsRightMenuOpen(true)} className="relative bg-zinc-900 text-zinc-100 border border-zinc-800 px-3 py-1.5 text-lg rounded hover:bg-zinc-800 transition-colors">
            ☰
          </button>
        </div>
      </header>

      <main className="flex-1 px-0 pt-0 pb-6 sm:px-6 sm:pt-2 flex flex-col items-center overflow-auto w-full">
        
        {paginaAtual !== 'Configuracoes' && (
          <div className="w-full max-w-5xl flex flex-col pb-10">
            {secoesDaPaginaAtual.map((id) => (
              <Fragment key={id}>{secoes[id]}</Fragment>
            ))}
          </div>
        )}

        {paginaAtual === 'Configuracoes' && (
          <Configuracoes user={user} config={config} atualizarConfig={atualizarConfig} onVoltar={() => setActivePage(null)} />
        )}


      </main>

      <ActivityModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSalvarAtividade} 
        onDelete={handleExcluirAtividade} 
        atividadeEditada={atividadeEditando} 
        categorias={categoriasTodas}
        coresUsadas={coresUsadas}
        modoVisualizacaoInicial={modoVisualizacao}
        treinos={treinos}
        modelo={modeloAtividade}
        treinoVinculado={(() => {
          const t = atividadeEditando ? treinoDaAtividade(treinos, atividadeEditando) : null;
          return t ? { id: t.id, nome: t.nome, ...resumoTreino(t) } : null;
        })()}
        onAbrirTreino={abrirTreino}
        disciplinaVinculada={(() => {
          const v = atividadeEditando ? disciplinaDaAtividade(cursos, atividadeEditando.id) : null;
          return v ? { nome: v.disc.nome, ...resumoDisciplina(v.disc, v.periodo) } : null;
        })()}
      />
      <MetasMenu
        isOpen={isMetasMenuOpen}
        onClose={() => setIsMetasMenuOpen(false)}
        metas={metas}
        linhas={linhasDe(config)}
        onLinhas={(n) => atualizarConfig({ metas: { linhas: n } })}
        onAdicionar={() => { setIsMetasMenuOpen(false); setMetaEditando(null); setIsGoalModalOpen(true); }}
        onEditar={(m) => { setIsMetasMenuOpen(false); setMetaEditando(m); setIsGoalModalOpen(true); }}
        onValor={handleValorMeta}
        onMover={handleMoverMeta}
      />
      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSalvarMeta}
        onDelete={handleExcluirMeta}
        onReset={handleZerarMeta}
        metaEditada={metaEditando}
      />
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        user={user} 
        onProfileUpdated={atualizarAvatarPerfil}
        atividades={atividades}
        tarefas={tarefas}
        config={config}
        atualizarConfig={atualizarConfig}
      />
      <RightMenu 
        isOpen={isRightMenuOpen} 
        onClose={() => setIsRightMenuOpen(false)} 
        onSelectPage={(page) => setActivePage(page)}
        activePage={paginaAtual}
        paginas={paginasMenu.map((id) => ({ id, rotulo: PAGINAS[id].rotulo }))}
        config={config}
      />
    </div>
  );
}
