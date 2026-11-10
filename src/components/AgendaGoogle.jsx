import { useState } from 'react';

const fuso = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

// Mostra o Google Agenda (modo "Agenda") dentro do app, usando o incorporador oficial do Google.
// É só para VER: criar/editar eventos acontece no próprio Google (botões abaixo).
// O incorporador usa a sessão do Google do navegador: se não estiver logado, ou se cookies de terceiros
// estiverem bloqueados (ex.: Brave), ele aparece em branco.
export default function AgendaGoogle({ user, agendas, config }) {
  const [versao, setVersao] = useState(0);
  const cfg = config?.agendaGoogle || {};

  // Fontes: a agenda principal da conta Google (o e-mail), as agendas do app (opcional) e outras agendas
  // que a pessoa colou (ID da agenda, em Configurações da agenda → Integrar agenda).
  const email = (cfg.email || user?.email || '').trim();
  const extras = String(cfg.extras || '').split(/[\s,;]+/).filter(Boolean);
  const doApp = cfg.incluirRotiNa !== false ? [agendas?.atividades, agendas?.avaliacoes].filter(Boolean) : [];
  const fontes = Array.from(new Set([...(email ? [email] : []), ...doApp, ...extras]));

  const url = `https://calendar.google.com/calendar/embed?mode=AGENDA&wkst=1&showTitle=0&showPrint=0&showTabs=0&showCalendars=0&showTz=0&showNav=1&showDate=1&ctz=${encodeURIComponent(fuso())}`
    + fontes.map((f) => `&src=${encodeURIComponent(f)}`).join('');

  return (
    <div className="mt-3 w-full px-2 sm:px-0">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-zinc-800">
          <span className="text-xs font-bold text-zinc-200">Google Agenda</span>
          <div className="flex items-center gap-1.5">
            <a href="https://calendar.google.com/calendar/u/0/r/eventedit" target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors">+ Evento</a>
            <a href="https://calendar.google.com/calendar/u/0/r/agenda" target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors">Abrir</a>
            <button onClick={() => setVersao((v) => v + 1)} className="text-[11px] font-semibold px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition-colors" title="Recarregar">↻</button>
          </div>
        </div>
        {fontes.length === 0 ? (
          <p className="text-xs text-zinc-500 text-center py-6 px-4">Informe o e-mail da sua conta Google em Configurações para mostrar sua agenda aqui.</p>
        ) : (
          <iframe
            key={versao}
            src={url}
            title="Google Agenda"
            className="w-full h-[460px] bg-white border-0"
            loading="lazy"
          />
        )}
        <p className="text-[10px] text-zinc-600 px-3 py-1.5">Só visualização. Mostra os eventos das agendas listadas (as Tarefas do Google não aparecem aqui). Se ficar em branco, entre na sua conta Google neste navegador e permita cookies de terceiros para o Google. Para incluir outras agendas, use Configurações.</p>
      </div>
    </div>
  );
}
