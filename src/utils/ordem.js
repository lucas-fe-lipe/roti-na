// Posição de destino (contada sem o item arrastado) a partir dos centros verticais dos outros itens
export const indiceAlvoY = (centros = [], y = 0) => centros.filter((c) => y > c).length;
