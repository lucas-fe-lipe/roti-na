import { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

export default function Treino({ user }) {
  // Estados de dados corporais
  const [genero, setGenero] = useState('masculino'); // 'masculino' ou 'feminino'
  const [vistaAtual, setVistaAtual] = useState(0); // 0: Anterior, 1: Lateral, 2: Posterior
  const vistas = ['Anterior', 'Lateral', 'Posterior'];

  const [historicoAltura, setHistoricoAltura] = useState([
    { id: 1, valor: 1.75, data: '2026-01-01' }
  ]);
  const [historicoPeso, setHistoricoPeso] = useState([
    { id: 1, valor: 72, data: '2026-01-01' }
  ]);
  const [meta, setMeta] = useState({ valor: 75 }); // Meta de peso

  // Medidas detalhadas
  const [medidas, setMedidas] = useState({
    ombro: 110,
    peito: 100,
    cintura: 80,
    quadril: 95,
    coxaD: 55,
    coxaE: 55,
    pernaD: 38,
    pernaE: 38,
    bracoD: 35,
    bracoE: 35,
    antebracoD: 28,
    antebracoE: 28
  });

  // Modais
  const [modalAlturaOpen, setModalAlturaOpen] = useState(false);
  const [modalPesoOpen, setModalPesoOpen] = useState(false);
  const [modalMetaOpen, setModalMetaOpen] = useState(false);
  const [modalMaisMedidasOpen, setModalMaisMedidasOpen] = useState(false);
  const [modalInfoImcOpen, setModalInfoImcOpen] = useState(false);

  // Inputs temporários para modais
  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);

  // Valores Atuais (último registrado)
  const alturaAtual = historicoAltura[historicoAltura.length - 1]?.valor || 1.75;
  const pesoAtual = historicoPeso[historicoPeso.length - 1]?.valor || 70;

  // Cálculo de IMC
  const imc = (pesoAtual / (alturaAtual * alturaAtual)).toFixed(1);

  const getImcStatus = (val) => {
    const num = parseFloat(val);
    if (num < 18.5) return { texto: 'Abaixo do peso', cor: 'bg-yellow-500' };
    if (num < 25) return { texto: 'Peso normal', cor: 'bg-green-500' };
    if (num < 30) return { texto: 'Sobrepeso', cor: 'bg-yellow-500' };
    return { texto: 'Obesidade', cor: 'bg-red-600' };
  };

  const imcStatus = getImcStatus(imc);
  const diferencaMeta = (meta.valor - pesoAtual).toFixed(1);

  // Carregar dados do Firebase ou LocalStorage
  useEffect(() => {
    const carregarDados = async () => {
      if (user) {
        try {
          const snap = await getDocs(collection(db, 'users', user.uid, 'dados_corporais'));
          if (!snap.empty) {
            // Se houver dados salvos, você pode popular os estados aqui
          }
        } catch (e) {
          console.error("Erro ao carregar dados corporais", e);
        }
      }
    };
    carregarDados();
  }, [user]);

  // Funções de salvamento
  const adicionarAltura = () => {
    if (!novoValor) return;
    const novo = [...historicoAltura, { id: Date.now(), valor: parseFloat(novoValor), data: novaData }];
    setHistoricoAltura(novo);
    setModalAlturaOpen(false);
    setNovoValor('');
  };

  const adicionarPeso = () => {
    if (!novoValor) return;
    const novo = [...historicoPeso, { id: Date.now(), valor: parseFloat(novoValor), data: novaData }];
    setHistoricoPeso(novo);
    setModalPesoOpen(false);
    setNovoValor('');
  };

  // Cálculo de escala do SVG baseado na altura (2.5m = 100% da altura do container)
  const fatorAltura = Math.min(Math.max(alturaAtual / 2.5, 0.5), 1.1);
  const fatorMagreza = imc < 18.5 ? 0.85 : imc > 25 ? 1.2 : 1.0;

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 p-4 sm:p-6 text-zinc-100">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold">Avaliação e Biometria Corporal</h1>
        
        {/* Chave Gênero */}
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button 
            onClick={() => setGenero('masculino')} 
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${genero === 'masculino' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Masculino
          </button>
          <button 
            onClick={() => setGenero('feminino')} 
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${genero === 'feminino' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            Feminino
          </button>
        </div>
      </div>

      {/* Conteúdo Principal: Lado a Lado (Desenho e Dados) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: DESENHO ANATÔMICO (SVG Dinâmico em P&B e Cinza) */}
        <div className="lg:col-span-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center relative min-h-[550px]">
          
          {/* Seletor de Vista */}
          <div className="absolute top-4 flex items-center gap-4 bg-zinc-950/80 border border-zinc-800 px-3 py-1.5 rounded-full text-xs">
            <button 
              onClick={() => setVistaAtual(prev => (prev > 0 ? prev - 1 : vistas.length - 1))}
              className="text-zinc-400 hover:text-white px-1"
            >
              ◀
            </button>
            <span className="font-bold tracking-wider uppercase text-zinc-300">{vistas[vistaAtual]}</span>
            <button 
              onClick={() => setVistaAtual(prev => (prev < vistas.length - 1 ? prev + 1 : 0))}
              className="text-zinc-400 hover:text-white px-1"
            >
              ▶
            </button>
          </div>

          {/* Renderização do Boneco em SVG puro (Preto, Branco, Cinza) */}
          <div className="w-full flex items-center justify-center transition-all duration-300 mt-6" style={{ transform: `scale(${fatorAltura})`, transformOrigin: 'center' }}>
            <svg viewBox="0 0 200 400" className="w-64 h-[450px] drop-shadow-2xl">
              <g fill="#27272a" stroke="#71717a" strokeWidth="1.5">
                {/* CABEÇA */}
                <ellipse cx="100" cy="45" rx={genero === 'feminino' ? "14" : "16"} ry="20" fill="#3f3f46" />
                <path d="M 90 60 Q 100 68 110 60" fill="none" stroke="#71717a" strokeWidth="1.5" />

                {/* VISTA ANTERIOR */}
                {vistaAtual === 0 && (
                  <>
                    {/* Pescoço */}
                    <path d="M 92 65 L 94 80 L 106 80 L 108 65 Z" fill="#52525b" />
                    {/* Ombros / Peitoral (Escalado pelas medidas de ombro/peito) */}
                    <path d={`M 70 85 Q 100 80 ${130 * (medidas.ombro/110)} 85 L 125 120 Q 100 125 75 120 Z`} fill="#d4d4d8" />
                    {/* Abdômen / Core */}
                    <rect x="85" y="125" width={`{30 * (medidas.cintura/80)}`} height="60" rx="5" fill="#71717a" />
                    {/* Braços */}
                    <rect x="55" y="90" width={14 * (medidas.bracoD/35)} height="90" rx="6" fill="#a1a1aa" />
                    <rect x="131" y="90" width={14 * (medidas.bracoE/35)} height="90" rx="6" fill="#a1a1aa" />
                    {/* Pernas / Coxas */}
                    <path d={`M 78 190 Q 75 260 82 310 L 98 310 Q 102 260 96 190 Z`} fill="#e4e4e7" />
                    <path d={`M 102 190 Q 98 260 104 310 L 120 310 Q 125 260 122 190 Z`} fill="#e4e4e7" />
                    {/* Pés */}
                    <ellipse cx="85" cy="320" rx="10" ry="5" fill="#52525b" />
                    <ellipse cx="115" cy="320" rx="10" ry="5" fill="#52525b" />
                  </>
                )}

                {/* VISTA LATERAL */}
                {vistaAtual === 1 && (
                  <>
                    <path d="M 92 65 L 94 80 L 104 80 L 102 65 Z" fill="#52525b" />
                    {/* Perfil Tronco */}
                    <path d="M 90 85 Q 115 90 110 130 Q 105 180 95 190 L 85 180 Q 90 130 85 85 Z" fill="#d4d4d8" />
                    {/* Braço Lateral */}
                    <rect x="92" y="95" width="16" height="85" rx="6" fill="#a1a1aa" />
                    {/* Perna Lateral */}
                    <path d="M 88 190 Q 100 250 92 310 L 104 310 Q 112 250 100 190 Z" fill="#e4e4e7" />
                    <ellipse cx="96" cy="320" rx="12" ry="5" fill="#52525b" />
                  </>
                )}

                {/* VISTA POSTERIOR */}
                {vistaAtual === 2 && (
                  <>
                    <path d="M 92 65 L 94 80 L 106 80 L 108 65 Z" fill="#52525b" />
                    {/* Costas / Trapézio / Dorsais */}
                    <path d="M 75 85 Q 100 78 125 85 L 120 135 Q 100 140 80 135 Z" fill="#71717a" />
                    {/* Glúteos e Lombar */}
                    <rect x="80" y="140" width="40" height="45" rx="6" fill="#52525b" />
                    {/* Braços Posteriores */}
                    <rect x="55" y="90" width="14" height="90" rx="6" fill="#a1a1aa" />
                    <rect x="131" y="90" width="14" height="90" rx="6" fill="#a1a1aa" />
                    {/* Posteriores de Perna */}
                    <path d="M 78 190 L 82 310 L 98 310 L 96 190 Z" fill="#a1a1aa" />
                    <path d="M 102 190 L 104 310 L 120 310 L 122 190 Z" fill="#a1a1aa" />
                    <ellipse cx="85" cy="320" rx="10" ry="5" fill="#52525b" />
                    <ellipse cx="115" cy="320" rx="10" ry="5" fill="#52525b" />
                  </>
                )}
              </g>
            </svg>
          </div>

          <div className="absolute bottom-3 text-[11px] text-zinc-500 font-mono">
            Escala proporcional baseada em {alturaAtual}m e IMC {imc}
          </div>
        </div>

        {/* COLUNA DIREITA: DADOS E MÉTRICAS */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          {/* Card Altura */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Altura Atual</span>
              <span className="text-xl font-bold font-mono text-zinc-100">{alturaAtual} m</span>
            </div>
            <button 
              onClick={() => setModalAlturaOpen(true)}
              className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center justify-center font-bold text-lg transition-colors"
            >
              +
            </button>
          </div>

          {/* Card Peso */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Peso Atual</span>
              <span className="text-xl font-bold font-mono text-zinc-100">{pesoAtual} kg</span>
            </div>
            <button 
              onClick={() => setModalPesoOpen(true)}
              className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center justify-center font-bold text-lg transition-colors"
            >
              +
            </button>
          </div>

          {/* Card Meta (Sem pedir data, calculando quanto ganhar/perder) */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div>
              <span className="text-xs text-zinc-400 block font-medium">Meta de Peso</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono text-zinc-100">{meta.valor} kg</span>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${diferencaMeta == 0 ? 'bg-green-900/50 text-green-400' : diferencaMeta > 0 ? 'bg-blue-900/50 text-blue-400' : 'bg-orange-900/50 text-orange-400'}`}>
                  {diferencaMeta == 0 ? 'Meta atingida!' : diferencaMeta > 0 ? `Faltam ${diferencaMeta} kg` : `Eliminar ${Math.abs(diferencaMeta)} kg`}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setModalMetaOpen(true)}
              className="w-9 h-9 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg flex items-center justify-center font-bold text-lg transition-colors"
            >
              +
            </button>
          </div>

          {/* Card IMC Calculado */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${imcStatus.cor} animate-pulse`}></div>
              <div>
                <span className="text-xs text-zinc-400 block font-medium">IMC (Índice de Massa Corporal)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold font-mono text-zinc-100">{imc}</span>
                  <span className="text-xs text-zinc-400 font-medium">({imcStatus.texto})</span>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setModalInfoImcOpen(true)}
              className="w-7 h-7 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full flex items-center justify-center font-serif italic text-xs transition-colors"
              title="Informações sobre o IMC"
            >
              i
            </button>
          </div>

          {/* Botão Mais Medidas */}
          <button 
            onClick={() => setModalMaisMedidasOpen(true)}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-xl font-semibold text-sm transition-colors border border-zinc-700 shadow-md flex items-center justify-center gap-2"
          >
            <span>📏</span> Mais Medidas Corporais
          </button>

        </div>
      </div>

      {/* MODAL DE MAIS MEDIDAS */}
      {modalMaisMedidasOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 text-zinc-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto border border-zinc-800">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="text-lg font-bold">Medidas Corporais Detalhadas (cm)</h3>
              <button onClick={() => setModalMaisMedidasOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {Object.keys(medidas).map((key) => (
                <div key={key} className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 flex flex-col gap-1">
                  <label className="text-zinc-400 capitalize">{key.replace('D', ' (Direita)').replace('E', ' (Esquerda)')}</label>
                  <input 
                    type="number" 
                    value={medidas[key]} 
                    onChange={(e) => setMedidas({...medidas, [key]: parseFloat(e.target.value) || 0})}
                    className="bg-zinc-900 border border-zinc-700 rounded p-1.5 text-white font-mono"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
              <button onClick={() => setModalMaisMedidasOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium">Salvar Medidas</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFO IMC */}
      {modalInfoImcOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 text-zinc-100 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 border border-zinc-800">
            <h3 className="text-lg font-bold">Como o IMC é calculado?</h3>
            <p className="text-xs text-zinc-300 leading-relaxed">
              O IMC (Índice de Massa Corporal) é calculado dividindo o peso (em kg) pela altura ao quadrado (em metros).
            </p>
            <div className="space-y-1.5 text-xs text-zinc-400">
              <div className="flex justify-between p-2 bg-zinc-950 rounded"><span>Menor que 18.5</span><span className="text-yellow-500 font-bold">Abaixo do peso</span></div>
              <div className="flex justify-between p-2 bg-zinc-950 rounded"><span>18.5 a 24.9</span><span className="text-green-500 font-bold">Peso normal</span></div>
              <div className="flex justify-between p-2 bg-zinc-950 rounded"><span>25.0 a 29.9</span><span className="text-yellow-500 font-bold">Sobrepeso</span></div>
              <div className="flex justify-between p-2 bg-zinc-950 rounded"><span>Acima de 30</span><span className="text-red-500 font-bold">Obesidade</span></div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setModalInfoImcOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GENÉRICO PARA ADICIONAR VALORES (Altura, Peso, Meta) */}
      {(modalAlturaOpen || modalPesoOpen || modalMetaOpen) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 text-zinc-100 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 border border-zinc-800">
            <h3 className="text-lg font-bold">
              {modalAlturaOpen ? 'Adicionar Altura' : modalPesoOpen ? 'Adicionar Peso' : 'Definir Meta de Peso'}
            </h3>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Valor ({modalAlturaOpen ? 'metros' : 'kg'})</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={novoValor} 
                  onChange={(e) => setNovoValor(e.target.value)} 
                  placeholder={modalAlturaOpen ? "Ex: 1.75" : "Ex: 72"}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              {!modalMetaOpen && (
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Data</label>
                  <input 
                    type="date" 
                    value={novaData} 
                    onChange={(e) => setNovaData(e.target.value)} 
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white [color-scheme:dark]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => { setModalAlturaOpen(false); setModalPesoOpen(false); setModalMetaOpen(false); }} 
                className="px-4 py-2 text-zinc-400 hover:text-white text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  if (modalAlturaOpen) adicionarAltura();
                  else if (modalPesoOpen) adicionarPeso();
                  else { setMeta({ valor: parseFloat(novoValor) || meta.valor }); setModalMetaOpen(false); }
                }} 
                className="px-4 py-2 bg-zinc-100 text-zinc-950 font-medium rounded-lg text-sm hover:bg-zinc-300"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
