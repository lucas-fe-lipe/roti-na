import { useState, useMemo } from 'react';
import { hojeLocalStr } from '../utils/date';
import { montarICS } from '../utils/ics';
import { notificar } from '../utils/toast';

const somarDias = (dataStr, dias) => {
  const [a, m, d] = dataStr.split('-').map(Number);
  return hojeLocalStr(new Date(a, m - 1, d + dias));
};

const chaveRegistro = (user) => `ics_exportados_${user ? user.uid : 'local'}`;
const lerRegistro = (user) => {
  try { return JSON.parse(localStorage.getItem(chaveRegistro(user)) || '{}') || {}; } catch { return {}; }
};

export default function ExportModal({ aberto, onFechar, user, atividades, tarefas }) {
  const hoje = hojeLocalStr(new Date());
  const [incluirAtividades, setIncluirAtividades] = useState(true);
  const [inicio, setInicio] = useState(hoje);
  const [fim, setFim] = useState(somarDias(hoje, 112)); // ~16 semanas
  const [incluirTarefas, setIncluirTarefas] = useState(true);
  const [incluirAvaliacoes, setIncluirAvaliacoes] = useState(true);
  const [lembrete, setLembrete] = useState('10');
  const [soNovos, setSoNovos] = useState(false);

  const opcoes = {
    atividades, tarefas, incluirAtividades, inicio, fim, incluirTarefas, incluirAvaliacoes,
    lembreteMin: lembrete === '' ? null : Number(lembrete),
    soNovos,
    exportados: soNovos ? lerRegistro(user) : {},
    fusoHorario: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo',
  };
  // Pré-visualização das quantidades (recalculada a cada mudança)
  const previa = useMemo(
    () => (aberto ? montarICS(opcoes) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [atividades, tarefas, incluirAtividades, inicio, fim, incluirTarefas, incluirAvaliacoes, lembrete, soNovos, aberto]
  );

  if (!aberto) return null;

  const periodoInvalido = incluirAtividades && (!inicio || !fim || fim < inicio);

  const handleBaixar = () => {
    if (periodoInvalido) return;
    const r = montarICS(opcoes);
    if (r.total === 0) {
      notificar('Não há nada novo para exportar com essas opções.', 'info');
      return;
    }
    const blob = new Blob([r.texto], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roti-na-${hojeLocalStr(new Date())}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    // lembra o que já foi exportado (para a opção "só o que ainda não foi exportado")
    try {
      localStorage.setItem(chaveRegistro(user), JSON.stringify({ ...lerRegistro(user), ...r.registros }));
    } catch { /* sem armazenamento */ }
    notificar(`Arquivo gerado com ${r.total} ${r.total === 1 ? 'evento' : 'eventos'}.`, 'sucesso');
    onFechar();
  };

  const c = previa.contagem;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4" onClick={onFechar}>
      <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-md p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="text-xl font-bold">Exportar para o Google Agenda</h2>

        <div className="space-y-3 text-sm">
          <div className="rounded border border-zinc-800 bg-zinc-950 p-3 space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={incluirAtividades} onChange={(e) => setIncluirAtividades(e.target.checked)} className="w-4 h-4 accent-zinc-300" />
              <span className="font-medium">Atividades (grade semanal)</span>
            </label>
            {incluirAtividades && (
              <div className="flex gap-2 pl-6">
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">De</label>
                  <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-100 [color-scheme:dark]" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-zinc-500 mb-1">Até</label>
                  <input type="date" value={fim} min={inicio} onChange={(e) => setFim(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded p-1.5 text-zinc-100 [color-scheme:dark]" />
                </div>
              </div>
            )}
            {periodoInvalido && <p className="text-xs text-red-400 pl-6">A data final precisa ser igual ou posterior à inicial.</p>}
          </div>

          <label className="flex items-center gap-2 cursor-pointer rounded border border-zinc-800 bg-zinc-950 p-3">
            <input type="checkbox" checked={incluirTarefas} onChange={(e) => setIncluirTarefas(e.target.checked)} className="w-4 h-4 accent-zinc-300" />
            <span className="font-medium">Tarefas</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer rounded border border-zinc-800 bg-zinc-950 p-3">
            <input type="checkbox" checked={incluirAvaliacoes} onChange={(e) => setIncluirAvaliacoes(e.target.checked)} className="w-4 h-4 accent-zinc-300" />
            <span className="font-medium">Avaliações (da página Notas)</span>
          </label>

          <div>
            <label className="block text-xs text-zinc-500 mb-1">Lembrete</label>
            <select value={lembrete} onChange={(e) => setLembrete(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded p-2 text-zinc-100">
              <option value="">Sem lembrete</option>
              <option value="0">Na hora</option>
              <option value="5">5 minutos antes</option>
              <option value="10">10 minutos antes</option>
              <option value="30">30 minutos antes</option>
              <option value="60">1 hora antes</option>
            </select>
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={soNovos} onChange={(e) => setSoNovos(e.target.checked)} className="w-4 h-4 mt-0.5 accent-zinc-300" />
            <span>
              Só o que ainda não foi exportado
              <span className="block text-xs text-zinc-500">Pula o que você já exportou deste aparelho e não mudou. Itens alterados são enviados de novo.</span>
            </span>
          </label>
        </div>

        <div className="rounded bg-zinc-950 border border-zinc-800 p-3 text-xs text-zinc-300 space-y-1">
          <div><strong>{previa.total}</strong> {previa.total === 1 ? 'evento será gerado' : 'eventos serão gerados'}: {c.atividades} de atividades, {c.tarefas} de tarefas e {c.avaliacoes} de avaliações.</div>
          {c.jaExportados > 0 && <div className="text-zinc-500">{c.jaExportados} já exportados e sem mudanças (ignorados).</div>}
          {c.semData > 0 && <div className="text-amber-400">{c.semData} sem data não entram no arquivo: o Google Agenda não importa tarefas sem data.</div>}
          <div className="text-zinc-500">Tarefas e avaliações já concluídas não são exportadas.</div>
        </div>

        <details className="text-xs text-zinc-400">
          <summary className="cursor-pointer text-zinc-300">Como importar no Google Agenda</summary>
          <ol className="list-decimal list-inside space-y-1 mt-2">
            <li>No computador, abra calendar.google.com.</li>
            <li>Crie uma agenda chamada <strong>roti-na</strong> (Outras agendas → + → Criar nova agenda).</li>
            <li>Engrenagem → Configurações → <strong>Importar e exportar</strong> → escolha o arquivo baixado e a agenda <strong>roti-na</strong> → Importar.</li>
            <li>No celular, a agenda aparece sozinha no app, e os lembretes passam a vir do Google.</li>
          </ol>
          <p className="mt-2">O arquivo é uma cópia do momento: apagar algo aqui depois não apaga na agenda.</p>
        </details>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onFechar} className="px-4 py-2 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 text-sm">Cancelar</button>
          <button onClick={handleBaixar} disabled={periodoInvalido || previa.total === 0} className="px-5 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            Baixar arquivo .ics
          </button>
        </div>
      </div>
    </div>
  );
}
