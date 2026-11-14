// Biblioteca de exercícios. "m" = músculos trabalhados e quanto cada um é exigido:
// P = principal (1), S = secundário (0,5), L = leve (0,25). Os ids dos músculos são os do desenho do corpo.
export const P = 1, S = 0.5, L = 0.25;

export const MUSCULOS = {
  trapezius: 'Trapézio', deltoids: 'Deltoide (frente/lado)', 'rear-deltoids': 'Deltoide posterior', chest: 'Peitoral',
  biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraço', lats: 'Dorsais', 'lower-back': 'Lombar',
  'abs-upper': 'Abdômen superior', 'abs-middle': 'Abdômen médio', 'abs-lower': 'Abdômen inferior',
  obliques: 'Oblíquos', 'obliques-lower': 'Oblíquos inferiores',
  quads: 'Quadríceps', 'quads-outer': 'Vasto lateral', adductors: 'Adutores', hamstrings: 'Posteriores da coxa',
  glutes: 'Glúteos', calves: 'Panturrilhas', shins: 'Tibial anterior', 'shins-outer': 'Fibular',
};

export const CATEGORIAS = ['Peito', 'Costas', 'Ombros', 'Braços', 'Pernas', 'Abdômen'];


// Variações (equipamento/execução) NÃO mudam os músculos: ficam dentro do mesmo exercício (campo "eq").
// O que muda a ênfase muscular (pegada, ângulo, posição) é outro exercício, com seus próprios pesos.
export const EQ = {
  supino: ['Barra', 'Halteres', 'Smith', 'Máquina articulada', 'Máquina articulada com anilhas', 'Máquina com polia'],
  maquinaHalt: ['Halteres', 'Máquina articulada', 'Máquina articulada com anilhas', 'Máquina com polia'],
  crucifixo: ['Halteres', 'Polia', 'Máquina (voador)', 'Máquina articulada com anilhas'],
  polia: ['Polia', 'Halteres', 'Máquina articulada', 'Máquina articulada com anilhas'],
  barraFixa: ['Livre', 'Com elástico', 'Máquina assistida', 'Negativa', 'Com peso extra'],
  corpo: ['Livre', 'Com elástico (ajuda)', 'Negativa', 'Com peso extra', 'Apoio nos joelhos'],
  remada: ['Barra', 'Halteres', 'Smith', 'Máquina articulada', 'Máquina articulada com anilhas', 'Polia'],
  puxada: ['Polia', 'Máquina articulada', 'Máquina articulada com anilhas', 'Máquina assistida'],
  ombro: ['Barra', 'Halteres', 'Smith', 'Máquina articulada', 'Máquina articulada com anilhas', 'Polia'],
  elevacao: ['Halteres', 'Polia', 'Máquina articulada', 'Máquina articulada com anilhas'],
  rosca: ['Barra reta', 'Barra W', 'Halteres', 'Polia', 'Máquina articulada'],
  triceps: ['Polia', 'Halteres', 'Barra', 'Máquina articulada', 'Máquina articulada com anilhas'],
  perna: ['Barra', 'Halteres', 'Smith', 'Máquina articulada', 'Máquina articulada com anilhas'],
  prensa: ['Máquina articulada', 'Máquina articulada com anilhas'],
  cadeira: ['Máquina articulada', 'Máquina articulada com anilhas', 'Polia'],
  abdomen: ['Livre', 'Com peso', 'Polia', 'Máquina'],
  panturrilha: ['Barra', 'Halteres', 'Smith', 'Máquina articulada', 'Máquina articulada com anilhas', 'Leg press'],
};

const Q = (v) => ({ quads: v, 'quads-outer': v });
const ABS = (v) => ({ 'abs-upper': v, 'abs-middle': v, 'abs-lower': v });
// E(id, nome, categoria, músculos, equipamentos?, unilateral?)
const E = (id, nome, cat, m, eq, uni = false) => ({ id, nome, cat, m, ...(eq ? { eq: EQ[eq] } : {}), ...(uni ? { uni: true } : {}) });

export const EXERCICIOS = [
  // Peito
  E('supino-reto', 'Supino reto', 'Peito', { chest: P, deltoids: S, triceps: S }, 'supino', true),
  E('supino-reto-aberto', 'Supino reto – pegada aberta', 'Peito', { chest: P, deltoids: S, triceps: L }, 'supino'),
  E('supino-reto-fechado', 'Supino reto – pegada fechada', 'Peito', { triceps: P, chest: S, deltoids: S }, 'supino'),
  E('supino-inclinado', 'Supino inclinado', 'Peito', { chest: P, deltoids: P, triceps: S }, 'supino', true),
  E('supino-inclinado-aberto', 'Supino inclinado – pegada aberta', 'Peito', { chest: P, deltoids: S, triceps: L }, 'supino'),
  E('supino-inclinado-fechado', 'Supino inclinado – pegada fechada', 'Peito', { chest: S, deltoids: P, triceps: P }, 'supino'),
  E('supino-declinado', 'Supino declinado', 'Peito', { chest: P, triceps: S, deltoids: L }, 'supino', true),
  E('supino-neutro', 'Supino – pegada neutra', 'Peito', { chest: P, triceps: S, deltoids: S }, 'maquinaHalt', true),
  E('crucifixo', 'Crucifixo reto', 'Peito', { chest: P, deltoids: S }, 'crucifixo', true),
  E('crucifixo-inclinado', 'Crucifixo inclinado', 'Peito', { chest: P, deltoids: P }, 'crucifixo', true),
  E('crossover', 'Crossover (polia alta)', 'Peito', { chest: P, deltoids: L, 'abs-upper': L }, null, true),
  E('crossover-baixo', 'Crossover (polia baixa)', 'Peito', { chest: P, deltoids: S }, null, true),
  E('flexao', 'Flexão de braço', 'Peito', { chest: P, triceps: S, deltoids: S, ...ABS(L) }, 'corpo'),
  E('flexao-declinada', 'Flexão com pés elevados', 'Peito', { chest: P, deltoids: P, triceps: S, ...ABS(L) }, 'corpo'),
  E('flexao-diamante', 'Flexão diamante', 'Peito', { triceps: P, chest: S, deltoids: S }, 'corpo'),
  E('paralelas', 'Mergulho nas paralelas (peito)', 'Peito', { chest: P, triceps: P, deltoids: S }, 'barraFixa'),
  E('pullover', 'Pullover', 'Peito', { chest: P, lats: P, triceps: L }, 'maquinaHalt'),
  // Costas
  E('puxada-frente', 'Puxada na frente – pronada aberta', 'Costas', { lats: P, biceps: S, 'rear-deltoids': S, trapezius: L, forearms: L }, 'puxada', true),
  E('puxada-fechada', 'Puxada – pronada fechada', 'Costas', { lats: P, biceps: S, 'rear-deltoids': S, forearms: L }, 'puxada', true),
  E('puxada-supinada', 'Puxada – supinada', 'Costas', { lats: P, biceps: P, forearms: S }, 'puxada', true),
  E('puxada-neutra', 'Puxada – pegada neutra (triângulo)', 'Costas', { lats: P, biceps: S, 'rear-deltoids': S, forearms: L }, 'puxada', true),
  E('puxada-atras', 'Puxada atrás da nuca', 'Costas', { lats: P, 'rear-deltoids': S, trapezius: S, biceps: S }, 'puxada'),
  E('barra-fixa', 'Barra fixa – pronada (média)', 'Costas', { lats: P, biceps: S, 'rear-deltoids': S, forearms: S, trapezius: L }, 'barraFixa'),
  E('barra-fixa-aberta', 'Barra fixa – pronada aberta', 'Costas', { lats: P, 'rear-deltoids': S, biceps: L, forearms: S, trapezius: S }, 'barraFixa'),
  E('barra-fixa-supinada', 'Barra fixa – supinada', 'Costas', { lats: P, biceps: P, forearms: S, 'rear-deltoids': L }, 'barraFixa'),
  E('barra-fixa-neutra', 'Barra fixa – pegada neutra', 'Costas', { lats: P, biceps: S, forearms: P, 'rear-deltoids': S }, 'barraFixa'),
  E('remada-curvada', 'Remada curvada – pronada', 'Costas', { lats: P, trapezius: S, 'rear-deltoids': S, biceps: S, 'lower-back': S, forearms: L }, 'remada'),
  E('remada-curvada-supinada', 'Remada curvada – supinada', 'Costas', { lats: P, biceps: P, trapezius: S, 'lower-back': S, forearms: L }, 'remada'),
  E('remada-cavalinho', 'Remada cavalinho (T-bar)', 'Costas', { lats: P, trapezius: P, 'rear-deltoids': S, biceps: S, 'lower-back': S }, 'maquinaHalt'),
  E('remada-baixa', 'Remada baixa – pegada neutra', 'Costas', { lats: P, trapezius: S, 'rear-deltoids': S, biceps: S, forearms: L }, 'polia', true),
  E('remada-baixa-aberta', 'Remada baixa – pegada aberta', 'Costas', { trapezius: P, 'rear-deltoids': P, lats: S, biceps: S }, 'polia'),
  E('remada-baixa-supinada', 'Remada baixa – supinada', 'Costas', { lats: P, biceps: P, trapezius: S, 'rear-deltoids': L }, 'polia', true),
  E('remada-unilateral', 'Remada unilateral (serrote)', 'Costas', { lats: P, 'rear-deltoids': S, biceps: S, trapezius: S, forearms: L }, 'maquinaHalt'),
  E('remada-peito-apoiado', 'Remada com peito apoiado', 'Costas', { lats: P, trapezius: S, 'rear-deltoids': S, biceps: S }, 'remada', true),
  E('pulldown', 'Pulldown (braços retos)', 'Costas', { lats: P, triceps: L, 'abs-upper': L }, 'polia'),
  E('levantamento-terra', 'Levantamento terra', 'Costas', { 'lower-back': P, glutes: P, hamstrings: P, trapezius: S, lats: S, forearms: S, ...Q(S) }, 'perna'),
  E('terra-sumo', 'Levantamento terra sumô', 'Costas', { glutes: P, adductors: P, ...Q(S), hamstrings: S, 'lower-back': S, trapezius: S, forearms: S }, 'perna'),
  E('hiperextensao', 'Hiperextensão lombar', 'Costas', { 'lower-back': P, glutes: S, hamstrings: S }, 'abdomen'),
  E('encolhimento', 'Encolhimento de ombros', 'Costas', { trapezius: P, forearms: L, 'rear-deltoids': L }, 'ombro'),
  // Ombros
  E('desenvolvimento', 'Desenvolvimento (ombros)', 'Ombros', { deltoids: P, triceps: S, trapezius: S }, 'ombro', true),
  E('desenvolvimento-arnold', 'Desenvolvimento Arnold', 'Ombros', { deltoids: P, triceps: S, trapezius: S, 'rear-deltoids': L }, null),
  E('desenvolvimento-neutro', 'Desenvolvimento – pegada neutra', 'Ombros', { deltoids: P, triceps: P, trapezius: L }, 'maquinaHalt', true),
  E('elevacao-lateral', 'Elevação lateral', 'Ombros', { deltoids: P, trapezius: L }, 'elevacao', true),
  E('elevacao-frontal', 'Elevação frontal', 'Ombros', { deltoids: P, chest: L }, 'elevacao', true),
  E('crucifixo-inverso', 'Crucifixo inverso', 'Ombros', { 'rear-deltoids': P, trapezius: S, lats: L }, 'crucifixo', true),
  E('remada-alta', 'Remada alta', 'Ombros', { deltoids: P, trapezius: P, biceps: S, forearms: L }, 'ombro'),
  E('face-pull', 'Face pull', 'Ombros', { 'rear-deltoids': P, trapezius: S, deltoids: L }),
  // Braços
  E('rosca-direta', 'Rosca direta', 'Braços', { biceps: P, forearms: S }, 'rosca'),
  E('rosca-alternada', 'Rosca alternada', 'Braços', { biceps: P, forearms: S }, 'rosca', true),
  E('rosca-martelo', 'Rosca martelo', 'Braços', { biceps: P, forearms: P }, 'rosca', true),
  E('rosca-inversa', 'Rosca inversa (pronada)', 'Braços', { forearms: P, biceps: S }, 'rosca'),
  E('rosca-scott', 'Rosca Scott', 'Braços', { biceps: P, forearms: L }, 'rosca', true),
  E('rosca-concentrada', 'Rosca concentrada', 'Braços', { biceps: P, forearms: L }, 'rosca', true),
  E('rosca-inclinada', 'Rosca inclinada', 'Braços', { biceps: P, forearms: L, deltoids: L }, 'rosca', true),
  E('triceps-corda', 'Tríceps na polia (corda)', 'Braços', { triceps: P }, 'triceps', true),
  E('triceps-barra-reta', 'Tríceps na polia (barra reta)', 'Braços', { triceps: P, forearms: L }, 'triceps'),
  E('triceps-testa', 'Tríceps testa', 'Braços', { triceps: P, forearms: L }, 'triceps', true),
  E('triceps-frances', 'Tríceps francês', 'Braços', { triceps: P }, 'triceps', true),
  E('triceps-coice', 'Tríceps coice', 'Braços', { triceps: P, 'rear-deltoids': L }, 'triceps', true),
  E('triceps-banco', 'Tríceps no banco (mergulho)', 'Braços', { triceps: P, chest: L, deltoids: S }, 'corpo'),
  E('rosca-punho', 'Rosca de punho', 'Braços', { forearms: P }, 'rosca', true),
  // Pernas
  E('agachamento', 'Agachamento livre', 'Pernas', { ...Q(P), glutes: P, adductors: S, hamstrings: S, 'lower-back': S, ...ABS(L) }, 'perna'),
  E('agachamento-frontal', 'Agachamento frontal', 'Pernas', { ...Q(P), glutes: S, adductors: S, 'abs-upper': S, 'lower-back': S }, 'perna'),
  E('agachamento-sumo', 'Agachamento sumô', 'Pernas', { adductors: P, glutes: P, ...Q(S), hamstrings: S }, 'perna'),
  E('agachamento-goblet', 'Agachamento goblet', 'Pernas', { ...Q(P), glutes: S, adductors: S, 'abs-upper': L }),
  E('leg-press', 'Leg press 45°', 'Pernas', { ...Q(P), glutes: S, adductors: S, hamstrings: L }, 'prensa', true),
  E('leg-press-horizontal', 'Leg press horizontal', 'Pernas', { ...Q(P), glutes: S, adductors: S, hamstrings: L }, 'prensa', true),
  E('leg-press-pes-altos', 'Leg press – pés altos e afastados', 'Pernas', { glutes: P, hamstrings: S, adductors: S, ...Q(S) }, 'prensa', true),
  E('hack', 'Agachamento hack', 'Pernas', { ...Q(P), glutes: S, adductors: L }, 'prensa'),
  E('cadeira-extensora', 'Cadeira extensora', 'Pernas', { ...Q(P) }, 'cadeira', true),
  E('afundo', 'Afundo / avanço', 'Pernas', { ...Q(P), glutes: P, adductors: S, hamstrings: S }, 'perna', true),
  E('passada', 'Passada (caminhando)', 'Pernas', { ...Q(P), glutes: P, adductors: S, hamstrings: S }, 'perna'),
  E('bulgaro', 'Agachamento búlgaro', 'Pernas', { ...Q(P), glutes: P, adductors: S, hamstrings: S }, 'perna'),
  E('step-up', 'Subida no banco (step-up)', 'Pernas', { ...Q(P), glutes: P, hamstrings: L }, 'perna', true),
  E('stiff', 'Stiff', 'Pernas', { hamstrings: P, glutes: P, 'lower-back': S, forearms: L }, 'perna', true),
  E('mesa-flexora', 'Mesa flexora', 'Pernas', { hamstrings: P, calves: L }, 'cadeira', true),
  E('cadeira-flexora', 'Cadeira flexora', 'Pernas', { hamstrings: P, calves: L }, 'cadeira', true),
  E('elevacao-pelvica', 'Elevação pélvica', 'Pernas', { glutes: P, hamstrings: S, adductors: L, quads: L }, 'perna', true),
  E('cadeira-adutora', 'Cadeira adutora', 'Pernas', { adductors: P }, 'cadeira'),
  E('cadeira-abdutora', 'Cadeira abdutora', 'Pernas', { glutes: P, 'quads-outer': L }, 'cadeira'),
  E('abducao-polia', 'Abdução de quadril na polia', 'Pernas', { glutes: P, 'quads-outer': L, obliques: L }, null, true),
  E('gluteo-polia', 'Glúteo na polia (coice)', 'Pernas', { glutes: P, hamstrings: L }, 'cadeira', true),
  E('gluteo-maquina', 'Glúteo na máquina (coice)', 'Pernas', { glutes: P, hamstrings: S }, 'cadeira', true),
  E('panturrilha-em-pe', 'Panturrilha em pé', 'Pernas', { calves: P, shins: L }, 'panturrilha', true),
  E('panturrilha-sentado', 'Panturrilha sentado', 'Pernas', { calves: P }, 'panturrilha', true),
  E('tibial', 'Elevação de pontas (tibial)', 'Pernas', { shins: P, 'shins-outer': S }, 'cadeira'),
  // Abdômen
  E('abdominal', 'Abdominal (crunch)', 'Abdômen', { 'abs-upper': P, 'abs-middle': S, obliques: L }, 'abdomen'),
  E('abdominal-infra', 'Elevação de pernas (infra)', 'Abdômen', { 'abs-lower': P, 'abs-middle': S, 'obliques-lower': S, quads: L }, 'abdomen'),
  E('abdominal-canivete', 'Abdominal canivete', 'Abdômen', { ...ABS(P), quads: L }),
  E('prancha', 'Prancha', 'Abdômen', { 'abs-upper': S, 'abs-middle': P, 'abs-lower': S, obliques: S, 'lower-back': L, deltoids: L }, 'abdomen'),
  E('prancha-lateral', 'Prancha lateral', 'Abdômen', { obliques: P, 'obliques-lower': P, 'abs-middle': S, glutes: L }),
  E('abdominal-obliquo', 'Abdominal oblíquo', 'Abdômen', { obliques: P, 'obliques-lower': P, 'abs-middle': S }, 'abdomen'),
  E('abdominal-polia', 'Abdominal na polia (corda)', 'Abdômen', { 'abs-upper': P, 'abs-middle': P, 'abs-lower': S, obliques: L }),
  E('roda-abdominal', 'Roda abdominal', 'Abdômen', { ...ABS(P), obliques: S, lats: S, 'lower-back': L }),
  E('russian-twist', 'Russian twist', 'Abdômen', { obliques: P, 'obliques-lower': S, 'abs-middle': S }, 'abdomen'),
  E('elevacao-pernas-barra', 'Elevação de pernas na barra', 'Abdômen', { 'abs-lower': P, 'abs-middle': S, 'obliques-lower': S, forearms: S }),
];

// Exercícios criados pelo usuário (vêm da conta ou do armazenamento local); o app registra aqui para todos os lookups.
let custom = [];
export const registrarCustom = (lista) => { custom = Array.isArray(lista) ? lista : []; };
export const todosExercicios = () => (custom.length ? [...EXERCICIOS, ...custom] : EXERCICIOS);
export const achar = (id) => todosExercicios().find((e) => e.id === id) || null;
export const porId = achar;
// Texto da variação escolhida: "Halteres · unilateral"
export const rotuloVariacao = (v, uni) => [v, uni ? 'unilateral' : ''].filter(Boolean).join(' · ');

// ---------- equipamentos e filtros ----------
export const EQP = { maquinas: 'Máquinas', livres: 'Pesos livres', barras: 'Barras (fixa e paralelas)', corpo: 'Só o corpo' };

// Músculos que "pertencem" a cada categoria: um exercício atende a categoria se é dela
// ou se exige algum desses músculos pelo menos como auxiliar.
export const CAT_MUSCULOS = {
  Peito: ['chest'],
  Costas: ['lats', 'trapezius', 'lower-back', 'rear-deltoids'],
  Ombros: ['deltoids', 'rear-deltoids'],
  Braços: ['biceps', 'triceps', 'forearms'],
  Pernas: ['quads', 'quads-outer', 'adductors', 'hamstrings', 'glutes', 'calves', 'shins', 'shins-outer'],
  Abdômen: ['abs-upper', 'abs-middle', 'abs-lower', 'obliques', 'obliques-lower'],
};
export const atendeCategoria = (ex, cat) => ex.cat === cat || (CAT_MUSCULOS[cat] || []).some((g) => (ex.m?.[g] || 0) >= S);

const BARRAS = /^(barra-fixa|paralelas|elevacao-pernas-barra)/;
const EXTRA_EQP = {
  crossover: ['maquinas'], 'crossover-baixo': ['maquinas'], 'face-pull': ['maquinas'], 'abducao-polia': ['maquinas'], 'abdominal-polia': ['maquinas'],
  'desenvolvimento-arnold': ['livres'], 'agachamento-goblet': ['livres'], 'abdominal-canivete': ['corpo'], prancha: ['corpo'], 'prancha-lateral': ['corpo'],
  'roda-abdominal': ['livres'], 'russian-twist': ['corpo', 'livres'], 'triceps-banco': ['corpo'], 'abdominal-infra': ['corpo'],
};
// Equipamentos de um exercício: os do próprio exercício (criados pelo usuário) ou deduzidos das variações.
export function equipamentosDe(ex) {
  if (Array.isArray(ex.eqp) && ex.eqp.length) return ex.eqp;
  if (EXTRA_EQP[ex.id]) return EXTRA_EQP[ex.id];
  const r = new Set();
  if (BARRAS.test(ex.id)) r.add('barras');
  (ex.eq || []).forEach((v) => {
    if (/^(Máquina|Polia|Smith|Leg press)/.test(v)) r.add('maquinas');
    else if (/^(Barra|Halteres|Com peso)/.test(v) && !BARRAS.test(ex.id)) r.add('livres');
    else if (/^(Livre|Com elástico|Negativa|Apoio)/.test(v) && !BARRAS.test(ex.id)) r.add('corpo');
  });
  if (r.size === 0) r.add('corpo');
  return [...r];
}

// Filtros: categorias = TODAS as selecionadas; equipamentos = PELO MENOS UM dos selecionados.
export function filtrarExercicios(lista, { busca = '', cats = [], eqps = [] } = {}) {
  const q = busca.trim().toLowerCase();
  return lista.filter((e) => {
    if (q && !e.nome.toLowerCase().includes(q)) return false;
    if (cats.length && !cats.every((c) => atendeCategoria(e, c))) return false;
    if (eqps.length && !equipamentosDe(e).some((x) => eqps.includes(x))) return false;
    return true;
  });
}
