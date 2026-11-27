// Reduz a foto escolhida para um quadrado pequeno (corta o centro) e devolve um JPEG em base64 (~5–15 KB),
// pequeno o bastante para ficar no documento da pessoa no Firestore (sem usar o Storage, que é pago).
export function reduzirParaAvatar(arquivo, lado = 160, qualidade = 0.82) {
  return new Promise((resolve, reject) => {
    if (!arquivo || !/^image\//.test(arquivo.type)) { reject(new Error('Escolha um arquivo de imagem.')); return; }
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const lado0 = Math.min(img.naturalWidth, img.naturalHeight);
      if (!lado0) { reject(new Error('Não foi possível ler a imagem.')); return; }
      const c = document.createElement('canvas');
      c.width = lado; c.height = lado;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, lado, lado);
      ctx.drawImage(img, (img.naturalWidth - lado0) / 2, (img.naturalHeight - lado0) / 2, lado0, lado0, 0, 0, lado, lado);
      resolve(c.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não foi possível abrir essa imagem.')); };
    img.src = url;
  });
}
