import { useState } from 'react';

const fuso = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';

// Mostra o Google Agenda (modo "Agenda") dentro do app, usando o incorporador oficial do Google.
// É só para VER: criar/editar eventos acontece no próprio Google (botões abaixo).
// O incorporador usa a sessão do Google do navegador: se não estiver logado, ou se cookies de terceiros
// estiverem bloqueados (ex.: Brave), ele aparece em branco.
export default function AgendaGoogle({ user, agendas }) {
  const [versao, setVersao] = useState(0);

  const ids = [agendas?.atividades, agendas?.avaliacoes].filter(Boolean);
  const email = user?.email && /@(gmail|googlemail)\.com$/i.test(user.email) ? user.email : null;
  const fontes = [...ids, ...(email ? [email] : [])];

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
          <p className="text-xs text-zinc-500 text-center py-6 px-4">Faça a primeira sincronização (menu da conta → Exportar para o Google Agenda) para mostrar sua agenda aqui.</p>
        ) : (
          <iframe
            key={versao}
            src={url}
            title="Google Agenda"
            className="w-full h-[460px] bg-white border-0"
            loading="lazy"
          />
        )}
        <p className="text-[10px] text-zinc-600 px-3 py-1.5">Só visualização. Se ficar em branco, entre na sua conta Google neste navegador e permita cookies de terceiros para o Google.</p>
      </div>
    </div>
  );
}
