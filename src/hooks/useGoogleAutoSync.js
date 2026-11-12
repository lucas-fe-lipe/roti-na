import { useEffect, useMemo, useRef, useState } from 'react';
import { montarItens, normalizarLembretes } from '../utils/agendaItens';
import { calcularPlano } from '../utils/agendaPlano';
import { notificar } from '../utils/toast';
import {
  integracaoConfigurada, carregarMapa, salvarMapa, garantirAgendas, executarPlano, EVENTO_MAPA,
  tokenValido, pedirToken, pedirTokenSilencioso, iniciarSincronizacao, terminarSincronizacao, mensagemDeErro,
} from '../services/googleAgenda';

const ESPERA_MS = 8000; // espera o usuário terminar de mexer antes de sincronizar
const AVISO_A_CADA_MS = 10 * 60 * 1000;
const fusoDoNavegador = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

// Opções salvas (pode ser o formato antigo, com um único "lembrete") -> opções para montar os itens.
export const opcoesParaItens = (o) => ({
  incluirAtividades: !!o.incluirAtividades,
  inicio: o.inicio,
  fim: o.fim,
  incluirAvaliacoes: !!o.incluirAvaliacoes,
  lembretes: normalizarLembretes(o.lembretes !== undefined ? o.lembretes : o.lembrete),
  coresAtividade: o.coresAtividade || {},
  corAvaliacao: o.corAvaliacao || '',
});

export const categoriasDe = (o) =>
  [o.incluirAtividades && 'atividade', o.incluirAvaliacoes && 'avaliacao'].filter(Boolean);

export const agendasNecessarias = (o) =>
  [o.incluirAtividades && 'atividades', o.incluirAvaliacoes && 'avaliacoes'].filter(Boolean);

const planoDe = (mapa, atividades, tarefas) => {
  const { itens } = montarItens({ atividades, tarefas, ...opcoesParaItens(mapa.opcoes) });
  return { itens, plano: calcularPlano(itens, mapa, { categorias: categoriasDe(mapa.opcoes), atualizar: true, remover: true }) };
};

// Acompanha o que falta sincronizar com o Google Agenda e, se ligado, sincroniza sozinho (app aberto).
// Devolve { mostrarBotao, sincronizando, sincronizarAgora } para o botão azul da barra superior.
export default function useGoogleAutoSync({ user, atividades, tarefas, ativo }) {
  const [mapa, setMapa] = useState(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [emEspera, setEmEspera] = useState(false);
  const dadosRef = useRef({ atividades, tarefas });
  const mapaRef = useRef(null);
  const executarRef = useRef(null);
  const ultimoAviso = useRef(0);

  useEffect(() => {
    dadosRef.current = { atividades, tarefas };
  }, [atividades, tarefas]);

  // mapa salvo (só depois da primeira sincronização manual ele tem "opcoes")
  useEffect(() => {
    if (!integracaoConfigurada()) return;
    let vivo = true;
    carregarMapa(user).then((m) => { if (vivo) { mapaRef.current = m; setMapa(m); } });
    const aoMudar = (e) => { mapaRef.current = e.detail; setMapa(e.detail); };
    window.addEventListener(EVENTO_MAPA, aoMudar);
    return () => { vivo = false; window.removeEventListener(EVENTO_MAPA, aoMudar); };
  }, [user]);

  // quantas mudanças ainda não foram para o Google
  const pendentes = useMemo(() => {
    if (!mapa?.opcoes || !Object.keys(mapa.agendas || {}).length) return 0;
    const { plano } = planoDe(mapa, atividades, tarefas);
    return plano.criar.length + plano.atualizar.length + plano.remover.length;
  }, [mapa, atividades, tarefas]);

  const executar = async ({ manual }) => {
    if (!integracaoConfigurada() || !iniciarSincronizacao()) return;
    setSincronizando(true);
    let m = null;
    try {
      const cache = mapaRef.current;
      if (!cache?.opcoes) return;
      const { atividades: atv, tarefas: tar } = dadosRef.current;
      const previa = planoDe(cache, atv, tar).plano;
      if (previa.criar.length + previa.atualizar.length + previa.remover.length === 0) return;

      if (previa.remover.length >= 5) {
        if (!manual) {
          notificar(`${previa.remover.length} remoções pendentes na agenda: toque no botão de sincronizar para confirmar.`, 'info');
          return;
        }
        if (!window.confirm(`Isto vai remover ${previa.remover.length} eventos da sua agenda do Google. Continuar?`)) return;
      }

      // manual: abre o pop-up de login logo após o clique; automático: só tenta renovar em silêncio
      const token = manual ? await pedirToken() : (tokenValido() || await pedirTokenSilencioso());
      if (!token) {
        if (Date.now() - ultimoAviso.current > AVISO_A_CADA_MS) {
          ultimoAviso.current = Date.now();
          notificar('Google Agenda: reconecte para continuar sincronizando.', 'info', {
            rotulo: 'Reconectar',
            fn: () => executarRef.current({ manual: true }),
          });
        }
        return;
      }

      m = await carregarMapa(user); // versão mais recente (outro aparelho pode ter sincronizado)
      if (!m.opcoes) { m = null; return; }
      m = await garantirAgendas(token, m, fusoDoNavegador(), agendasNecessarias(m.opcoes));
      const { atividades: atv2, tarefas: tar2 } = dadosRef.current;
      const { plano } = planoDe(m, atv2, tar2);
      const resumo = await executarPlano(token, plano, m, fusoDoNavegador());
      if (resumo.falhas.length > 0) notificar(`Google Agenda: ${resumo.falhas.length} itens não sincronizaram.`, 'erro');
      else notificar('Google Agenda atualizado.', 'sucesso');
    } catch (e) {
      console.error(e);
      notificar(mensagemDeErro(e), 'erro');
    } finally {
      if (m && Object.keys(m.agendas || {}).length) await salvarMapa(user, m);
      terminarSincronizacao();
      setSincronizando(false);
    }
  };
  executarRef.current = executar;

  // sincronização automática: espera a pessoa parar de mexer
  useEffect(() => {
    if (!ativo || !integracaoConfigurada() || pendentes === 0) {
      setEmEspera(false);
      return;
    }
    setEmEspera(true);
    const temporizador = setTimeout(() => {
      setEmEspera(false);
      executarRef.current({ manual: false });
    }, ESPERA_MS);
    return () => clearTimeout(temporizador);
  }, [ativo, atividades, tarefas, user, pendentes]);

  return {
    pendentes,
    agendas: mapa?.agendas || null,
    sincronizando,
    mostrarBotao: pendentes > 0 && !sincronizando && !emEspera,
    sincronizarAgora: () => executarRef.current({ manual: true }),
  };
}
