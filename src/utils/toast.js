// Avisos rápidos (toasts). Qualquer arquivo pode chamar notificar('mensagem', 'erro'|'sucesso'|'info').
// O 3º parâmetro é opcional: { rotulo: 'Desfazer', fn: () => ... } mostra um botão no aviso.
export function notificar(mensagem, tipo = 'info', acao = null) {
  window.dispatchEvent(new CustomEvent('roti-toast', { detail: { mensagem, tipo, acao } }));
}
