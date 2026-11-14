// Desenhos simples (traço) para treinos que não são de força: um por tipo de cardio e um braço fazendo força.
const base = { viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round', role: 'img' };

const Pessoa = ({ y = 0 }) => (
  <>
    <circle cx="38" cy={13 + y} r="4.5" />
  </>
);

const DESENHOS = {
  corrida: (
    <>
      <Pessoa />
      <path d="M34 22 L28 34 L38 40 L36 54" />
      <path d="M28 34 L20 46 L12 46" />
      <path d="M34 24 L46 28 M34 24 L24 22 L18 30" />
    </>
  ),
  caminhada: (
    <>
      <Pessoa />
      <path d="M36 21 L35 36 M35 36 L28 54 M35 36 L42 54" />
      <path d="M36 24 L28 32 M36 24 L44 32" />
    </>
  ),
  bike: (
    <>
      <circle cx="14" cy="44" r="10" />
      <circle cx="50" cy="44" r="10" />
      <path d="M14 44 L26 24 L42 24 L50 44 M26 24 L32 44 L14 44 M32 44 L42 24 M24 20 L30 20 M40 20 L46 22" />
    </>
  ),
  trilha: (
    <>
      <path d="M4 54 L24 18 L34 36 L42 26 L60 54 Z" />
      <path d="M24 18 L28 25 L24 24 L20 26 Z" />
      <path d="M30 54 C 30 48, 38 48, 36 42" strokeDasharray="1 5" />
    </>
  ),
  'trilha-bike': (
    <>
      <path d="M2 36 L16 12 L24 24 L30 16 L44 36" />
      <circle cx="14" cy="50" r="8" />
      <circle cx="48" cy="50" r="8" />
      <path d="M14 50 L24 36 L38 36 L48 50 M24 36 L28 50 L14 50 M28 50 L38 36" />
    </>
  ),
  nado: (
    <>
      <circle cx="40" cy="22" r="4.5" />
      <path d="M12 30 C 20 22, 30 22, 36 26 L44 30" />
      <path d="M4 44 C 10 40, 16 48, 22 44 S 34 40, 40 44 S 52 48, 60 44" />
      <path d="M4 54 C 10 50, 16 58, 22 54 S 34 50, 40 54 S 52 58, 60 54" />
    </>
  ),
  outra: (
    <>
      <path d="M32 54 C 8 38, 8 16, 22 14 C 28 13, 31 17, 32 20 C 33 17, 36 13, 42 14 C 56 16, 56 38, 32 54 Z" />
      <path d="M14 32 L24 32 L28 24 L34 40 L38 32 L50 32" />
    </>
  ),
  // treinos "outro" (pilates, fisioterapia, esportes…): um braço fazendo força
  braco: (
    <>
      <path d="M10 54 L10 38 C 10 30, 16 26, 22 28 L30 30 C 32 22, 38 12, 46 12 C 52 12, 54 18, 50 22 C 56 24, 58 32, 54 40 C 50 50, 40 54, 30 54 Z" />
      <path d="M36 30 C 40 34, 46 34, 50 30" />
    </>
  ),
};

export const chaveIcone = (treino) => (treino?.tipo === 'cardio' ? (DESENHOS[treino.modalidade] ? treino.modalidade : 'outra') : 'braco');

export default function IconeTreino({ chave = 'braco', className = '', titulo }) {
  return (
    <svg {...base} className={className} aria-label={titulo || chave}>
      {DESENHOS[chave] || DESENHOS.braco}
    </svg>
  );
}
