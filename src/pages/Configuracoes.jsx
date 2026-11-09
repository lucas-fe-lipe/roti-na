function Interruptor({ rotulo, descricao, ligado, onChange }) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 cursor-pointer">
      <span className="flex flex-col">
        <span className="text-sm text-zinc-100">{rotulo}</span>
        {descricao && <span className="text-xs text-zinc-500">{descricao}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={ligado}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-zinc-300 cursor-pointer shrink-0"
      />
    </label>
  );
}

function Grupo({ titulo, children }) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
      <h3 className="text-xs uppercase tracking-wide text-zinc-500 pt-2">{titulo}</h3>
      <div className="divide-y divide-zinc-800">{children}</div>
    </section>
  );
}

import { integracaoConfigurada } from '../services/googleAgenda';

export default function Configuracoes({ config, atualizarConfig, onVoltar }) {
  const { paginas, blocos, integracoes } = config;
  return (
    <div className="w-full max-w-xl flex flex-col gap-4 px-3 sm:px-0 pt-3 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">Configurações</h2>
        <button onClick={onVoltar} className="text-sm text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded hover:bg-zinc-800">Voltar</button>
      </div>

      <Grupo titulo="Páginas do menu">
        <Interruptor rotulo="Notas" descricao="Cursos, disciplinas, avaliações e médias." ligado={paginas.notas} onChange={(v) => atualizarConfig({ paginas: { notas: v } })} />
      </Grupo>

      <Grupo titulo="Blocos da página Rotina">
        <Interruptor rotulo="Metas diárias" ligado={blocos.metas} onChange={(v) => atualizarConfig({ blocos: { metas: v } })} />
        <Interruptor rotulo="Tarefas atrasadas" ligado={blocos.atrasadas} onChange={(v) => atualizarConfig({ blocos: { atrasadas: v } })} />
        <Interruptor rotulo="Tarefas concluídas" ligado={blocos.concluidas} onChange={(v) => atualizarConfig({ blocos: { concluidas: v } })} />
        <Interruptor rotulo="Progresso do dia" descricao="Mostra (feitas/total) ao lado de Hoje." ligado={blocos.progressoDia} onChange={(v) => atualizarConfig({ blocos: { progressoDia: v } })} />
        <Interruptor rotulo="Linha do horário atual" descricao={'Linha que marca "agora" na grade semanal.'} ligado={blocos.linhaAgora} onChange={(v) => atualizarConfig({ blocos: { linhaAgora: v } })} />
      </Grupo>

      {integracaoConfigurada() && (
        <Grupo titulo="Google Agenda">
          <Interruptor
            rotulo="Sincronizar automaticamente"
            descricao="Envia para a agenda roti-na o que você criar, mudar ou excluir, com o app aberto. Exige a primeira sincronização em Exportar."
            ligado={integracoes.googleAutoSync}
            onChange={(v) => atualizarConfig({ integracoes: { googleAutoSync: v } })}
          />
        </Grupo>
      )}

      <p className="text-xs text-zinc-600 px-1">
        Desligar um bloco só o esconde: nenhum dado é apagado. Com login, as configurações acompanham sua conta em qualquer aparelho.
      </p>
    </div>
  );
}
