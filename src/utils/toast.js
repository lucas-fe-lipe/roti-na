// Avisos rápidos (toasts). Qualquer arquivo pode chamar notificar('mensagem', 'erro'|'sucesso'|'info').
export function notificar(mensagem, tipo = 'info') {
  window.dispatchEvent(new CustomEvent('roti-toast', { detail: { mensagem, tipo } }));
}
