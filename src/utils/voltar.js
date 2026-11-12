// Botão "voltar" do celular (e gesto lateral): em vez de sair do app, fecha a camada aberta mais recente
// (pop-up, menu ou página fora da inicial). Sem nenhuma camada aberta, voltar sai do app normalmente.
//
// Como funciona: ao abrir a primeira camada, o app coloca uma entrada extra no histórico do navegador ("armadilha").
// Voltar cai na entrada anterior; aí fechamos a camada do topo e colocamos a armadilha de novo.
// Fechar um pop-up pelo próprio botão do app não mexe no histórico.
export function criarVoltar(win) {
  const pilha = [];
  let seq = 0;
  let iniciado = false;
  const armadilha = () => { if (!win.history.state?.rotinaTrap) win.history.pushState({ rotinaTrap: true }, ''); };
  const aoVoltar = (ev) => {
    if (ev?.state?.rotinaTrap) return; // chegamos à armadilha (ex.: avançar), nada a fechar
    const topo = pilha.pop();
    if (topo) { win.history.pushState({ rotinaTrap: true }, ''); topo.fechar(); }
    else win.history.back(); // nada aberto: sai do app de verdade
  };
  const iniciar = () => {
    if (iniciado) return;
    iniciado = true;
    armadilha();
    win.addEventListener('popstate', aoVoltar);
  };
  // registra uma camada; devolve a função que a remove (quando ela fecha por outro caminho)
  const registrar = (fechar) => {
    iniciar();
    const camada = { id: ++seq, fechar };
    pilha.push(camada);
    return () => { const i = pilha.indexOf(camada); if (i >= 0) pilha.splice(i, 1); };
  };
  return { registrar, abertas: () => pilha.length };
}

let global = null;
export function voltarGlobal() {
  if (!global && typeof window !== 'undefined' && window.history) global = criarVoltar(window);
  return global;
}
