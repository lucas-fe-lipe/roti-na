// Biblioteca inicial de exercícios. "m" = músculos trabalhados e quanto cada um é exigido:
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

const Q = (v) => ({ quads: v, 'quads-outer': v });
const ABS = (v) => ({ 'abs-upper': v, 'abs-middle': v, 'abs-lower': v });

export const EXERCICIOS = [
  // Peito
  { id: 'supino-reto', nome: 'Supino reto', cat: 'Peito', m: { chest: P, deltoids: S, triceps: S } },
  { id: 'supino-inclinado', nome: 'Supino inclinado', cat: 'Peito', m: { chest: P, deltoids: P, triceps: S } },
  { id: 'supino-declinado', nome: 'Supino declinado', cat: 'Peito', m: { chest: P, triceps: S, deltoids: L } },
  { id: 'crucifixo', nome: 'Crucifixo', cat: 'Peito', m: { chest: P, deltoids: S } },
  { id: 'crossover', nome: 'Crossover (polia)', cat: 'Peito', m: { chest: P, deltoids: L, 'abs-upper': L } },
  { id: 'flexao', nome: 'Flexão de braço', cat: 'Peito', m: { chest: P, triceps: S, deltoids: S, ...ABS(L) } },
  { id: 'paralelas', nome: 'Mergulho nas paralelas', cat: 'Peito', m: { chest: P, triceps: P, deltoids: S } },
  // Costas
  { id: 'puxada-frente', nome: 'Puxada na frente', cat: 'Costas', m: { lats: P, biceps: S, 'rear-deltoids': S, trapezius: L, forearms: L } },
  { id: 'barra-fixa', nome: 'Barra fixa', cat: 'Costas', m: { lats: P, biceps: S, 'rear-deltoids': S, forearms: S, trapezius: L } },
  { id: 'remada-curvada', nome: 'Remada curvada', cat: 'Costas', m: { lats: P, trapezius: S, 'rear-deltoids': S, biceps: S, 'lower-back': S, forearms: L } },
  { id: 'remada-baixa', nome: 'Remada baixa (sentada)', cat: 'Costas', m: { lats: P, trapezius: S, 'rear-deltoids': S, biceps: S, forearms: L } },
  { id: 'remada-unilateral', nome: 'Remada unilateral (serrote)', cat: 'Costas', m: { lats: P, 'rear-deltoids': S, biceps: S, trapezius: S, forearms: L } },
  { id: 'pulldown', nome: 'Pulldown (braços retos)', cat: 'Costas', m: { lats: P, triceps: L, 'abs-upper': L } },
  { id: 'levantamento-terra', nome: 'Levantamento terra', cat: 'Costas', m: { 'lower-back': P, glutes: P, hamstrings: P, trapezius: S, lats: S, forearms: S, ...Q(S) } },
  { id: 'hiperextensao', nome: 'Hiperextensão lombar', cat: 'Costas', m: { 'lower-back': P, glutes: S, hamstrings: S } },
  { id: 'encolhimento', nome: 'Encolhimento de ombros', cat: 'Costas', m: { trapezius: P, forearms: L, 'rear-deltoids': L } },
  // Ombros
  { id: 'desenvolvimento', nome: 'Desenvolvimento (ombros)', cat: 'Ombros', m: { deltoids: P, triceps: S, trapezius: S } },
  { id: 'elevacao-lateral', nome: 'Elevação lateral', cat: 'Ombros', m: { deltoids: P, trapezius: L } },
  { id: 'elevacao-frontal', nome: 'Elevação frontal', cat: 'Ombros', m: { deltoids: P, chest: L } },
  { id: 'crucifixo-inverso', nome: 'Crucifixo inverso', cat: 'Ombros', m: { 'rear-deltoids': P, trapezius: S, lats: L } },
  { id: 'remada-alta', nome: 'Remada alta', cat: 'Ombros', m: { deltoids: P, trapezius: P, biceps: S, forearms: L } },
  { id: 'face-pull', nome: 'Face pull', cat: 'Ombros', m: { 'rear-deltoids': P, trapezius: S, deltoids: L } },
  // Braços
  { id: 'rosca-direta', nome: 'Rosca direta', cat: 'Braços', m: { biceps: P, forearms: S } },
  { id: 'rosca-alternada', nome: 'Rosca alternada', cat: 'Braços', m: { biceps: P, forearms: S } },
  { id: 'rosca-martelo', nome: 'Rosca martelo', cat: 'Braços', m: { biceps: P, forearms: P } },
  { id: 'rosca-scott', nome: 'Rosca Scott', cat: 'Braços', m: { biceps: P, forearms: L } },
  { id: 'triceps-corda', nome: 'Tríceps na polia (corda)', cat: 'Braços', m: { triceps: P } },
  { id: 'triceps-testa', nome: 'Tríceps testa', cat: 'Braços', m: { triceps: P, forearms: L } },
  { id: 'triceps-frances', nome: 'Tríceps francês', cat: 'Braços', m: { triceps: P } },
  { id: 'rosca-punho', nome: 'Rosca de punho', cat: 'Braços', m: { forearms: P } },
  // Pernas
  { id: 'agachamento', nome: 'Agachamento livre', cat: 'Pernas', m: { ...Q(P), glutes: P, adductors: S, hamstrings: S, 'lower-back': S, ...ABS(L) } },
  { id: 'agachamento-frontal', nome: 'Agachamento frontal', cat: 'Pernas', m: { ...Q(P), glutes: S, adductors: S, 'abs-upper': S, 'lower-back': S } },
  { id: 'leg-press', nome: 'Leg press 45°', cat: 'Pernas', m: { ...Q(P), glutes: S, adductors: S, hamstrings: L } },
  { id: 'hack', nome: 'Agachamento hack', cat: 'Pernas', m: { ...Q(P), glutes: S, adductors: L } },
  { id: 'cadeira-extensora', nome: 'Cadeira extensora', cat: 'Pernas', m: { ...Q(P) } },
  { id: 'afundo', nome: 'Afundo / avanço', cat: 'Pernas', m: { ...Q(P), glutes: P, adductors: S, hamstrings: S } },
  { id: 'bulgaro', nome: 'Agachamento búlgaro', cat: 'Pernas', m: { ...Q(P), glutes: P, adductors: S, hamstrings: S } },
  { id: 'stiff', nome: 'Stiff', cat: 'Pernas', m: { hamstrings: P, glutes: P, 'lower-back': S, forearms: L } },
  { id: 'mesa-flexora', nome: 'Mesa flexora', cat: 'Pernas', m: { hamstrings: P, calves: L } },
  { id: 'cadeira-flexora', nome: 'Cadeira flexora', cat: 'Pernas', m: { hamstrings: P, calves: L } },
  { id: 'elevacao-pelvica', nome: 'Elevação pélvica', cat: 'Pernas', m: { glutes: P, hamstrings: S, adductors: L, quads: L } },
  { id: 'cadeira-adutora', nome: 'Cadeira adutora', cat: 'Pernas', m: { adductors: P } },
  { id: 'gluteo-polia', nome: 'Glúteo na polia (coice)', cat: 'Pernas', m: { glutes: P, hamstrings: L } },
  { id: 'panturrilha-em-pe', nome: 'Panturrilha em pé', cat: 'Pernas', m: { calves: P, shins: L } },
  { id: 'panturrilha-sentado', nome: 'Panturrilha sentado', cat: 'Pernas', m: { calves: P } },
  { id: 'tibial', nome: 'Elevação de pontas (tibial)', cat: 'Pernas', m: { shins: P, 'shins-outer': S } },
  // Abdômen
  { id: 'abdominal', nome: 'Abdominal (crunch)', cat: 'Abdômen', m: { 'abs-upper': P, 'abs-middle': S, obliques: L } },
  { id: 'abdominal-infra', nome: 'Elevação de pernas (infra)', cat: 'Abdômen', m: { 'abs-lower': P, 'abs-middle': S, 'obliques-lower': S, quads: L } },
  { id: 'prancha', nome: 'Prancha', cat: 'Abdômen', m: { 'abs-upper': S, 'abs-middle': P, 'abs-lower': S, obliques: S, 'lower-back': L, deltoids: L } },
  { id: 'abdominal-obliquo', nome: 'Abdominal oblíquo', cat: 'Abdômen', m: { obliques: P, 'obliques-lower': P, 'abs-middle': S } },
  { id: 'roda-abdominal', nome: 'Roda abdominal', cat: 'Abdômen', m: { ...ABS(P), obliques: S, lats: S, 'lower-back': L } },
  { id: 'russian-twist', nome: 'Russian twist', cat: 'Abdômen', m: { obliques: P, 'obliques-lower': S, 'abs-middle': S } },
];

export const porId = (id) => EXERCICIOS.find((e) => e.id === id) || null;
