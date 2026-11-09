// Notas de atualização. Para anunciar algo novo: adicione um item NO TOPO da lista
// e atualize VERSAO_ATUAL com a mesma versão. O selo "novo" aparece até a pessoa abrir a página.
export const VERSAO_ATUAL = '1.4';

export const NOVIDADES = [
  {
    versao: '1.4',
    data: '2026-11-08',
    titulo: 'Sincronização com o Google Agenda',
    itens: [
      'Menu da conta → Exportar para o Google Agenda → "Sincronizar com o Google": cria a agenda "roti-na" na sua conta e envia atividades, tarefas e avaliações.',
      'Só envia o que ainda não está na agenda e, se você quiser, atualiza o que mudou e remove o que foi excluído ou concluído.',
      'O Google passa a avisar os lembretes, inclusive com o app fechado. O app só enxerga a agenda "roti-na".',
    ],
  },
  {
    versao: '1.3',
    data: '2026-11-08',
    titulo: 'Exportar para o Google Agenda',
    itens: [
      'Menu da conta → "Exportar para o Google Agenda": gera um arquivo .ics com atividades (com data de início e fim), tarefas e avaliações.',
      'Opção "só o que ainda não foi exportado" e escolha de lembrete.',
      'Avaliações da página Notas agora aparecem em preto na lista de tarefas.',
      'Novidades e Configurações foram para a parte de baixo do menu.',
    ],
  },
  {
    versao: '1.2',
    data: '2026-11-08',
    titulo: 'Configurações e Novidades',
    itens: [
      'Nova página Configurações: escolha quais páginas e blocos aparecem.',
      'Nova página Novidades, com o histórico de mudanças do app.',
      'Código reorganizado por dentro (sem mudar o que você vê) e testes automáticos das funções de data e horário.',
    ],
  },
  {
    versao: '1.1',
    data: '2026-11-08',
    titulo: 'Metas que reiniciam e grade melhor',
    itens: [
      'As metas diárias agora voltam a zero sozinhas, no horário "Reiniciar às".',
      'Atividades no mesmo horário aparecem lado a lado na grade.',
      'Atividades podem passar da meia-noite (ex.: 22:00 até 02:00).',
      'Excluir tarefa, atividade ou meta agora tem "Desfazer".',
      'Progresso do dia (feitas/total) na lista Hoje e textos em português do Brasil.',
    ],
  },
  {
    versao: '1.0',
    data: '2026-11-08',
    titulo: 'Mais segurança para os seus dados',
    itens: [
      'Avisos na tela quando algo não puder ser salvo.',
      'Backup: exportar e importar seus dados em arquivo (Menu da conta → Meus dados).',
      'Regras de segurança do banco de dados revisadas.',
    ],
  },
];
