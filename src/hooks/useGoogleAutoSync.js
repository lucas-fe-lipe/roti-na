import { useEffect, useRef } from 'react';
import { montarItens } from '../utils/agendaItens';
import { calcularPlano } from '../utils/agendaPlano';
import { notificar } from '../utils/toast';
import {
  integracaoConfigurada, carregarMapa, salvarMapa, garantirAgenda, executarPlano,
  tokenValido, pedirToken, pedirTokenSilencioso, iniciarSincronizacao, terminarSincronizacao, mensagemDeErro,
} from '../services/googleAgenda';

const ESPERA_MS = 8000; // espera o usuário terminar de mexer antes de sincronizar
const AVISO_A_CADA_MS = 10 * 60 * 1000;

export const opcoesParaItens = (o) => ({
  incluirAtividades: o.incluirAtividades,
  inicio: o.inicio,
  fim: o.fim,
  incluirTarefas: o.incluirTarefas,
  incluirAvaliacoes: o.incluirAvaliacoes,
  lembreteMin: o.lembrete === '' ? null : Number(o.lembrete),
});

export const categoriasDe = (o) =>
  [o.incluirAtividades && 'atividade', o.incluirTarefas && 'tarefa', o.incluirAvaliacoes && 'avaliacao'].filter(Boolean);

// Sincroniza sozinho com o Google Agenda quando atividades ou tarefas mudam (app aberto).
export default function useGoogleAutoSync({ user, atividades, tarefas, ativo }) {
  const dadosRef = useRef({ atividades, tarefas });
  dadosRef.current = { atividades, tarefas };
  const ultimoAviso = useRef(0);

  useEffect(() => {
    if (!ativo || !integracaoConfigurada()) return;

    const executar = async (obterToken) => {
      if (!iniciarSincronizacao()) return;
      let mapa = null;
      try {
        mapa = await carregarMapa(user);
        if (!mapa.calendarId || !mapa.opcoes) return; // ainda não houve a primeira sincronização manual
        const { atividades: atv, tarefas: tar } = dadosRef.current;
        const { itens } = montarItens({ atividades: atv, tarefas: tar, ...opcoesParaItens(mapa.opcoes) });
        const plano = calcularPlano(itens, mapa, { categorias: categoriasDe(mapa.opcoes), atualizar: true, remover: true });
        const total = plano.criar.length + plano.atualizar.length + plano.remover.length;
        if (total === 0) return;
        if (plano.remover.length >= 5) {
          notificar(`${plano.remover.length} remoções pendentes na agenda: abra Exportar para confirmar.`, 'info');
          return;
        }
        const token = await obterToken();
        if (!token) {
          if (Date.now() - ultimoAviso.current > AVISO_A_CADA_MS) {
            ultimoAviso.current = Date.now();
            notificar('Google Agenda: reconecte para continuar sincronizando.', 'info', {
              rotulo: 'Reconectar',
              fn: async () => {
                try { await pedirToken(); await executar(async () => tokenValido()); } catch (e) { notificar(mensagemDeErro(e), 'erro'); }
              },
            });
          }
          return;
        }
        mapa = await garantirAgenda(token, mapa, Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo');
        const planoFinal = calcularPlano(itens, mapa, { categorias: categoriasDe(mapa.opcoes), atualizar: true, remover: true });
        const resumo = await executarPlano(token, planoFinal, mapa, Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo');
        if (resumo.falhas.length > 0) notificar(`Google Agenda: ${resumo.falhas.length} itens não sincronizaram.`, 'erro');
        else notificar('Google Agenda atualizado.', 'sucesso');
      } catch (e) {
        console.error(e);
        notificar(mensagemDeErro(e), 'erro');
      } finally {
        if (mapa && mapa.calendarId) await salvarMapa(user, mapa);
        terminarSincronizacao();
      }
    };

    const temporizador = setTimeout(() => executar(async () => tokenValido() || pedirTokenSilencioso()), ESPERA_MS);
    return () => clearTimeout(temporizador);
  }, [ativo, atividades, tarefas, user]);
}
