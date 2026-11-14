// Botão "voltar" do celular (e gesto lateral): em vez de sair do app, fecha a camada aberta mais recente
// (pop-up, menu ou página fora da inicial). Sem nenhuma camada aberta, voltar sai do app normalmente.
//
// Como funciona: cada camada que abre coloca uma entrada no histórico do navegador (feito no clique que abriu a
// camada; o Chrome do celular ignora entradas criadas sem toque do usuário, por isso nunca criamos entradas ao voltar).
// Voltar consome a entrada e fechamos a camada do topo. Se a camada foi fechada pelo botão do app, a entrada
// sobra; quando não resta nenhuma camada, as sobras são descartadas de uma vez (go(-n)), sem o usuário perceber.
export function criarVoltar(win, agendar = (f) => setTimeout(f, 0)) {
  const pilha = [];
  let seq = 0;
  let iniciado = false;
  let entradas = 0; // entradas de histórico que colocamos e ainda não foram consumidas
  let ignorar = 0; // "voltas" provocadas por nós mesmos (limpeza)
  let limpezaAgendada = false;

  const limpar = () => {
    limpezaAgendada = false;
    if (pilha.length > 0 || entradas === 0) return;
    const n = entradas;
    entradas = 0;
    ignorar += 1;
    win.history.go(-n);
  };
  const agendarLimpeza = () => {
    if (limpezaAgendada || pilha.length > 0 || entradas === 0) return;
    limpezaAgendada = true;
    agendar(limpar);
  };
  const aoVoltar = () => {
    if (ignorar > 0) { ignorar -= 1; return; }
    const topo = pilha.pop();
    if (!topo) return; // sem camadas: o navegador já fez o que devia (sair, se foi o caso)
    entradas = Math.max(0, entradas - 1);
    topo.fechar();
    agendarLimpeza();
  };
  // registra uma camada; devolve a função que a remove (quando ela fecha por outro caminho)
  const registrar = (fechar) => {
    if (!iniciado) { iniciado = true; win.addEventListener('popstate', aoVoltar); }
    win.history.pushState({ rotinaTrap: true }, '');
    entradas += 1;
    const camada = { id: ++seq, fechar };
    pilha.push(camada);
    return () => {
      const i = pilha.indexOf(camada);
      if (i >= 0) { pilha.splice(i, 1); agendarLimpeza(); }
    };
  };
  return { registrar, abertas: () => pilha.length };
}

let global = null;
export function voltarGlobal() {
  if (!global && typeof window !== 'undefined' && window.history) global = criarVoltar(window);
  return global;
}
