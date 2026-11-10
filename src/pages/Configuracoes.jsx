import { useState, useRef } from 'react';

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
import { PAGINAS, SECOES, normalizarLayout, moverPagina, moverSecao, secaoAtiva, paginaLigada, paginaVisivel, paginasVisiveis } from '../utils/layout';

const ICONE_ARRASTAR = '⋮⋮';

// Páginas do menu e blocos de cada página: ligar/desligar e reordenar arrastando pelo "⋮⋮"
// (funciona com o dedo no celular e com o mouse: usa eventos de ponteiro, não o arrastar do navegador).
function OrganizarPaginas({ config, atualizarConfig, googleOk }) {
  const raiz = useRef(null);
  const alvoRef = useRef(null);
  const [arrasto, setArrasto] = useState(null); // { tipo: 'pagina' | 'secao', id }
  const [alvo, setAlvo] = useState(null); // pagina: { indice } · secao: { pagina, indice }
  const [aviso, setAviso] = useState('');
  const layout = normalizarLayout(config.layout);

  const configCom = (parcial) => ({
    ...config,
    paginas: { ...config.paginas, ...(parcial.paginas || {}) },
    blocos: { ...config.blocos, ...(parcial.blocos || {}) },
  });
  // nunca deixa o app sem nenhuma página visível
  const gravarSePossivel = (parcial) => {
    if (paginasVisiveis(configCom(parcial), googleOk).length === 0) {
      setAviso('Mantenha pelo menos uma página com algum bloco ligado.');
      return;
    }
    setAviso('');
    atualizarConfig(parcial);
  };

  const FLAG_SECAO = { grade: 'grade', metas: 'metas', agenda: 'agendaGoogle', cursos: 'cursos' };
  const FLAG_PAGINA = { Grade: 'grade', Notas: 'notas' };

  const calcularAlvo = (tipo, id, x, y) => {
    const raizEl = raiz.current;
    if (!raizEl) return null;
    const cards = Array.from(raizEl.querySelectorAll('[data-pagina]'));
    if (tipo === 'pagina') {
      const outros = cards.filter((c) => c.dataset.pagina !== id);
      const indice = outros.filter((c) => { const r = c.getBoundingClientRect(); return y > r.top + r.height / 2; }).length;
      return { indice };
    }
    if (cards.length === 0) return null;
    // página sob o dedo (ou a mais próxima)
    let melhor = cards[0];
    let menor = Infinity;
    cards.forEach((c) => {
      const r = c.getBoundingClientRect();
      const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
      if (d < menor) { menor = d; melhor = c; }
    });
    const linhas = Array.from(melhor.querySelectorAll('[data-secao]')).filter((l) => l.dataset.secao !== id);
    const indice = linhas.filter((l) => { const r = l.getBoundingClientRect(); return y > r.top + r.height / 2; }).length;
    return { pagina: melhor.dataset.pagina, indice };
  };

  const iniciar = (e, tipo, id) => {
    e.preventDefault();
    setArrasto({ tipo, id });
    const mover = (ev) => { const a = calcularAlvo(tipo, id, ev.clientX, ev.clientY); alvoRef.current = a; setAlvo(a); };
    const encerrar = (aplicar) => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      const a = alvoRef.current;
      alvoRef.current = null;
      setArrasto(null);
      setAlvo(null);
      if (!aplicar || !a) return;
      const novo = tipo === 'pagina' ? moverPagina(layout, id, a.indice) : moverSecao(layout, id, a.pagina, a.indice);
      // só grava se a ordem mudou e se o app continua com alguma página visível
      if (JSON.stringify(novo) === JSON.stringify(layout)) return;
      if (paginasVisiveis({ ...config, layout: novo }, googleOk).length === 0) {
        setAviso('Mantenha pelo menos uma página com algum bloco ligado.');
        return;
      }
      setAviso('');
      atualizarConfig({ layout: novo });
    };
    const soltar = () => encerrar(true);
    const cancelar = () => encerrar(false);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', cancelar);
  };

  // chamada como função (não como componente) para o botão não ser recriado durante o arrasto com o dedo
  const alca = (tipo, id, rotulo) => (
    <button key="alca"
      type="button"
      onPointerDown={(e) => iniciar(e, tipo, id)}
      aria-label={`Arrastar para mudar a ordem: ${rotulo}`}
      title="Arraste para mudar a ordem"
      style={{ touchAction: 'none' }}
      className="px-1.5 py-1 text-zinc-500 hover:text-zinc-200 cursor-grab active:cursor-grabbing select-none text-sm font-bold tracking-tighter shrink-0"
    >{ICONE_ARRASTAR}</button>
  );

  const Linha = () => <div className="h-0.5 bg-blue-500 rounded -my-px" aria-hidden="true" />; // só um traço, pode ser recriado

  // lista com o indicador de onde o item vai cair (os índices ignoram o item arrastado)
  const comIndicador = (itens, idArrastado, indice, render) => {
    const saida = [];
    let n = 0;
    itens.forEach((item) => {
      if (indice !== undefined && indice !== null && n === indice && item !== idArrastado) saida.push(<Linha key={`linha-${item}`} />);
      saida.push(render(item));
      if (item !== idArrastado) n += 1;
    });
    if (indice !== undefined && indice !== null && indice >= n) saida.push(<Linha key="linha-fim" />);
    return saida;
  };

  const arrastandoPagina = arrasto?.tipo === 'pagina';
  const arrastandoSecao = arrasto?.tipo === 'secao';

  return (
    <section className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3" ref={raiz}>
      <h3 className="text-xs uppercase tracking-wide text-zinc-500">Páginas e blocos</h3>
      <p className="text-xs text-zinc-500 mt-1 mb-3">Marque para ligar ou desligar. Arraste pelo {ICONE_ARRASTAR} para mudar a ordem: a primeira página da lista é a que abre com o app. Os blocos também podem ser arrastados para outra página.</p>

      <div className="flex flex-col gap-2">
        {comIndicador(layout.paginas, arrastandoPagina ? arrasto.id : null, arrastandoPagina ? alvo?.indice : null, (pid) => {
          const ligada = paginaLigada(config, pid);
          const visivel = paginaVisivel(config, pid, googleOk);
          const lista = layout.secoes[pid] || [];
          const vazia = lista.length === 0;
          return (
            <div key={pid} data-pagina={pid} className={`rounded-lg border ${arrastandoPagina && arrasto.id === pid ? 'opacity-40 border-blue-500' : 'border-zinc-800'} bg-zinc-950/40`}>
              <div className="flex items-center gap-2 px-2 py-2">
                {alca("pagina", pid, PAGINAS[pid].rotulo)}
                <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                  <input type="checkbox" checked={ligada && !vazia} disabled={vazia} onChange={(e) => gravarSePossivel({ paginas: { [FLAG_PAGINA[pid]]: e.target.checked } })} className="w-4 h-4 accent-zinc-300" />
                  <span className={`text-sm font-bold ${visivel ? 'text-zinc-100' : 'text-zinc-500'}`}>{PAGINAS[pid].rotulo}</span>
                  {vazia && <span className="text-[11px] text-zinc-500">desativada: sem itens</span>}
                  {!vazia && ligada && !visivel && <span className="text-[11px] text-zinc-500">sem blocos ligados</span>}
                </label>
              </div>
              <div className="pl-9 pr-2 pb-2 flex flex-col gap-1">
                {vazia && arrastandoSecao && alvo?.pagina === pid ? <Linha /> : null}
                {vazia && !arrastandoSecao && <p className="text-[11px] text-zinc-600 italic py-1">Arraste um bloco para cá para usar esta página.</p>}
                {comIndicador(lista, arrastandoSecao ? arrasto.id : null, arrastandoSecao && alvo?.pagina === pid ? alvo.indice : null, (sid) => {
                  const indisponivel = sid === 'agenda' && !googleOk;
                  return (
                    <div key={sid} data-secao={sid} className={`flex items-center gap-2 rounded px-1 py-1 bg-zinc-900 border ${arrastandoSecao && arrasto.id === sid ? 'opacity-40 border-blue-500' : 'border-zinc-800'}`}>
                      {alca("secao", sid, SECOES[sid].rotulo)}
                      <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                        <input type="checkbox" checked={secaoAtiva(config, sid, googleOk)} disabled={indisponivel} onChange={(e) => gravarSePossivel({ blocos: { [FLAG_SECAO[sid]]: e.target.checked } })} className="w-4 h-4 accent-zinc-300" />
                        <span className="text-sm text-zinc-200 truncate">{SECOES[sid].rotulo}</span>
                        {indisponivel && <span className="text-[11px] text-zinc-500">precisa da integração Google</span>}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div className="rounded-lg border border-dashed border-zinc-800 px-3 py-2 flex items-center gap-2 opacity-60">
          <span className="px-1.5 text-zinc-700 text-sm font-bold">{ICONE_ARRASTAR}</span>
          <input type="checkbox" disabled className="w-4 h-4" />
          <span className="text-sm text-zinc-500">Treinos</span>
          <span className="text-[11px] text-zinc-600">em breve</span>
        </div>
      </div>
      {aviso && <p role="alert" className="text-xs text-amber-400 mt-2">{aviso}</p>}
    </section>
  );
}

export default function Configuracoes({ user, config, atualizarConfig, onVoltar }) {
  const { blocos, integracoes } = config;
  return (
    <div className="w-full max-w-xl flex flex-col gap-4 px-3 sm:px-0 pt-3 pb-10">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100">Configurações</h2>
        <button onClick={onVoltar} className="text-sm text-zinc-400 hover:text-zinc-100 px-3 py-1.5 rounded hover:bg-zinc-800">Voltar</button>
      </div>

      <OrganizarPaginas config={config} atualizarConfig={atualizarConfig} googleOk={integracaoConfigurada()} />

      <Grupo titulo="Grade horária">
        <AlturaGrade valor={config.grade?.pxPorHora} onSalvar={(v) => atualizarConfig({ grade: { pxPorHora: v } })} />
        <Interruptor rotulo="Linha do horário atual" descricao={'Linha que marca "agora" na grade semanal.'} ligado={blocos.linhaAgora} onChange={(v) => atualizarConfig({ blocos: { linhaAgora: v } })} />
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
