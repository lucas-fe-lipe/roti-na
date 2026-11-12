// Ligação entre treinos e atividades da grade horária (funções puras, testadas em tests/).
// Uma atividade pode ter "treinoId". Os horários (dia e hora) continuam sendo os da própria atividade.

export const treinoDaAtividade = (treinos = [], atividade) =>
  (atividade?.treinoId && treinos.find((t) => t.id === atividade.treinoId)) || null;

// Valores para pré-preencher uma atividade nova a partir de um treino
export const modeloAtividadeDoTreino = (treino) => {
  const n = (treino?.itens || []).length;
  return { nome: treino?.nome || '', categoria: 'Treinos', treinoId: treino?.id, detalhes: n ? `${n} exercício${n > 1 ? 's' : ''}` : '' };
};

const ORDEM_DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

// Onde o treino está na grade: [{ atividadeId, nome, dia, inicio, fim }], por dia da semana e hora
export function horariosDoTreino(atividades = [], treinoId) {
  const saida = [];
  atividades.filter((a) => a.treinoId === treinoId).forEach((a) => {
    (a.horarios || []).forEach((h) => saida.push({ atividadeId: a.id, nome: a.nome, dia: h.dia, inicio: h.inicio, fim: h.fim }));
  });
  return saida.sort((x, y) => ORDEM_DIAS.indexOf(x.dia) - ORDEM_DIAS.indexOf(y.dia) || String(x.inicio).localeCompare(String(y.inicio)));
}

// Próximo horário do treino a partir de "agora": { dia, inicio, fim, emDias } (emDias = 0 se for hoje e ainda não começou)
export function proximoHorarioDoTreino(atividades = [], treinoId, agora) {
  const lista = horariosDoTreino(atividades, treinoId);
  if (lista.length === 0) return null;
  const hoje = agora.getDay();
  const hhmm = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
  let melhor = null;
  lista.forEach((h) => {
    const idx = ORDEM_DIAS.indexOf(h.dia);
    if (idx < 0) return;
    let emDias = (idx - hoje + 7) % 7;
    if (emDias === 0 && String(h.inicio) < hhmm) emDias = 7;
    if (!melhor || emDias < melhor.emDias || (emDias === melhor.emDias && String(h.inicio) < String(melhor.inicio))) melhor = { ...h, emDias };
  });
  return melhor;
}

// Texto curto: "hoje às 19:00", "amanhã às 07:00", "na QUA às 19:00"
export function rotuloProximo(p) {
  if (!p) return '';
  if (p.emDias === 0) return `hoje às ${p.inicio}`;
  if (p.emDias === 1) return `amanhã às ${p.inicio}`;
  return `${p.dia} às ${p.inicio}`;
}
