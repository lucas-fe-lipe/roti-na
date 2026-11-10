import { useState } from 'react';

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

// Campo de texto que só grava ao sair do campo (evita uma gravação no Firebase a cada tecla)
function CampoTexto({ id, tipo = 'text', valor, placeholder, onSalvar }) {
  const [texto, setTexto] = useState(valor || '');
  return (
    <input id={id} type={tipo} value={texto} onChange={(e) => setTexto(e.target.value)} onBlur={() => { if (texto !== (valor || '')) onSalvar(texto.trim()); }} placeholder={placeholder} className="bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-zinc-100" />
  );
}

// Controle da altura da grade: mostra o valor na hora e só grava ao soltar (evita uma gravação por pixel)
function AlturaGrade({ valor, onSalvar }) {
  const [px, setPx] = useState(Number(valor) || 22);
  const gravar = (v) => { if (v !== (Number(valor) || 22)) onSalvar(v); };
  return (
    <div className="py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label htmlFor="grade-px" className="text-sm text-zinc-100">Altura da grade horária</label>
        <span className="text-sm text-zinc-300 tabular-nums">{px} px por hora</span>
      </div>
      <input id="grade-px" type="range" min="12" max="60" step="1" value={px}
        onChange={(e) => setPx(Number(e.target.value))}
        onPointerUp={() => gravar(px)} onKeyUp={() => gravar(px)} onBlur={() => gravar(px)}
        className="w-full accent-zinc-300" />
      <div className="flex items-center justify-between text-xs text-zinc-500">
        <span>Menor (cabe mais na tela)</span>
        <button type="button" onClick={() => { setPx(22); gravar(22); }} className="text-zinc-300 hover:text-white underline">Restaurar padrão (22)</button>
        <span>Maior</span>
      </div>
    </div>
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

export default function Configuracoes({ user, config, atualizarConfig, onVoltar }) {
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

      <Grupo titulo="Grade horária">
        <AlturaGrade valor={config.grade?.pxPorHora} onSalvar={(v) => atualizarConfig({ grade: { pxPorHora: v } })} />
      </Grupo>

      <Grupo titulo="Blocos da página Rotina">
        <Interruptor rotulo="Metas diárias" ligado={blocos.metas} onChange={(v) => atualizarConfig({ blocos: { metas: v } })} />
        <Interruptor rotulo="Linha do horário atual" descricao={'Linha que marca "agora" na grade semanal.'} ligado={blocos.linhaAgora} onChange={(v) => atualizarConfig({ blocos: { linhaAgora: v } })} />
        {integracaoConfigurada() && (
          <Interruptor
            rotulo="Google Agenda na tela (modo Agenda)"
            descricao="Mostra sua agenda do Google embaixo das metas, só para visualizar. Para criar ou editar, use os botões do bloco."
            ligado={blocos.agendaGoogle}
            onChange={(v) => atualizarConfig({ blocos: { agendaGoogle: v } })}
          />
        )}
      </Grupo>

      {integracaoConfigurada() && blocos.agendaGoogle && (
        <Grupo titulo="Agenda na tela: fontes">
          <div className="py-3 flex flex-col gap-1">
            <label className="text-sm text-zinc-100" htmlFor="ag-email">E-mail da conta Google</label>
            <CampoTexto id="ag-email" tipo="email" valor={config.agendaGoogle.email} placeholder={user?.email || 'voce@gmail.com'} onSalvar={(v) => atualizarConfig({ agendaGoogle: { email: v } })} />
            <span className="text-xs text-zinc-500">Mostra a sua agenda principal, com os eventos criados dentro e fora do app. Em branco, usa o e-mail do login.</span>
          </div>
          <Interruptor rotulo="Incluir as agendas roti-na" descricao="Atividades e avaliações enviadas pelo app." ligado={config.agendaGoogle.incluirRotiNa} onChange={(v) => atualizarConfig({ agendaGoogle: { incluirRotiNa: v } })} />
          <div className="py-3 flex flex-col gap-1">
            <label className="text-sm text-zinc-100" htmlFor="ag-extras">Outras agendas (opcional)</label>
            <CampoTexto id="ag-extras" valor={config.agendaGoogle.extras} placeholder="IDs separados por vírgula" onSalvar={(v) => atualizarConfig({ agendaGoogle: { extras: v } })} />
            <span className="text-xs text-zinc-500">No Google Agenda: Configurações → escolha a agenda → "Integrar agenda" → ID da agenda. O Google só deixa mostrar aqui agendas que você pode ver.</span>
          </div>
        </Grupo>
      )}

      {integracaoConfigurada() && (
        <Grupo titulo="Google Agenda">
          <Interruptor
            rotulo="Sincronizar automaticamente"
            descricao="Envia para as agendas roti-na o que você criar, mudar ou excluir, com o app aberto. Exige a primeira sincronização em Exportar."
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
