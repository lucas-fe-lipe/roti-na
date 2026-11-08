import { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function Treino({ user }) {
  const [genero, setGenero] = useState('masculino'); 
  const [vistaAtual, setVistaAtual] = useState(0); // 0: Anterior, 1: Lateral, 2: Posterior
  const vistas = ['Anterior', 'Lateral', 'Posterior'];

  const [historicoAltura, setHistoricoAltura] = useState([{ id: 1, valor: 1.75, data: '2026-01-01' }]);
  const [historicoPeso, setHistoricoPeso] = useState([{ id: 1, valor: 72, data: '2026-01-01' }]);
  const [meta, setMeta] = useState({ valor: 75 });

  // Medidas Base (para a regra de 3)
  const medidasBase = {
    ombro: 110, peito: 100, cintura: 80, quadril: 95, 
    coxa: 55, perna: 38, braco: 35, antebraco: 28
  };

  const [medidas, setMedidas] = useState({
    ombro: 110, peito: 100, cintura: 80, quadril: 95,
    coxaD: 55, coxaE: 55, pernaD: 38, pernaE: 38,
    bracoD: 35, bracoE: 35, antebracoD: 28, antebracoE: 28
  });

  const [modalAlturaOpen, setModalAlturaOpen] = useState(false);
  const [modalPesoOpen, setModalPesoOpen] = useState(false);
  const [modalMetaOpen, setModalMetaOpen] = useState(false);
  const [modalMaisMedidasOpen, setModalMaisMedidasOpen] = useState(false);
  const [modalInfoImcOpen, setModalInfoImcOpen] = useState(false);

  const [novoValor, setNovoValor] = useState('');
  const [novaData, setNovaData] = useState(new Date().toISOString().split('T')[0]);

  const alturaAtual = historicoAltura[historicoAltura.length - 1]?.valor || 1.75;
  const pesoAtual = historicoPeso[historicoPeso.length - 1]?.valor || 70;

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

  // Escala Dinâmica (2.5m = 100%)
  const maxAltura = 2.5;
  const fatorAltura = Math.min(alturaAtual / maxAltura, 1); 
  
  // Regras de 3 para Escala X de cada membro
  // Baseado nas medidas ou no IMC caso as medidas não tenham sido alteradas
  const imcScale = imc < 18.5 ? 0.9 : imc > 25 ? 1.15 : 1.0;
  
  const scaleTorso = (medidas.ombro / medidasBase.ombro) * imcScale;
  const scaleCintura = (medidas.cintura / medidasBase.cintura) * imcScale;
  const scaleBracoD = (medidas.bracoD / medidasBase.braco) * imcScale;
  const scaleBracoE = (medidas.bracoE / medidasBase.braco) * imcScale;
  const scaleCoxaD = (medidas.coxaD / medidasBase.coxa) * imcScale;
  const scaleCoxaE = (medidas.coxaE / medidasBase.coxa) * imcScale;
  const scalePernaD = (medidas.pernaD / medidasBase.perna) * imcScale;
  const scalePernaE = (medidas.pernaE / medidasBase.perna) * imcScale;

  useEffect(() => {
    // Simulação de carregamento do Firebase
  }, [user]);

  const adicionarAltura = () => {
    if (!novoValor) return;
    setHistoricoAltura([...historicoAltura, { id: Date.now(), valor: parseFloat(novoValor), data: novaData }]);
    setModalAlturaOpen(false); setNovoValor('');
  };

  const adicionarPeso = () => {
    if (!novoValor) return;
    setHistoricoPeso([...historicoPeso, { id: Date.now(), valor: parseFloat(novoValor), data: novaData }]);
    setModalPesoOpen(false); setNovoValor('');
  };

  // Cores do Desenho
  const cPele = "#d4d4d8";
  const cSombra = "#a1a1aa";
  const cEscura = "#3f3f46";
  const cContorno = "#18181b";

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 p-4 sm:p-6 text-zinc-100">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold">Avaliação e Biometria</h1>
        <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          <button onClick={() => setGenero('masculino')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${genero === 'masculino' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>Masculino</button>
          <button onClick={() => setGenero('feminino')} className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${genero === 'feminino' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}>Feminino</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* DESENHO ANATÔMICO */}
        <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center relative min-h-[600px] overflow-hidden">
          
          <div className="absolute top-4 flex items-center gap-6 bg-zinc-950/80 border border-zinc-800 px-4 py-2 rounded-full text-sm z-10 shadow-lg">
            <button onClick={() => setVistaAtual(prev => (prev > 0 ? prev - 1 : 2))} className="text-zinc-400 hover:text-white">◀</button>
            <span className="font-bold tracking-wider uppercase text-zinc-200 w-24 text-center">{vistas[vistaAtual]}</span>
            <button onClick={() => setVistaAtual(prev => (prev < 2 ? prev + 1 : 0))} className="text-zinc-400 hover:text-white">▶</button>
          </div>

          {/* SVG Container: A altura máxima (2.5m) ocupa 100% da div. */}
          <div 
            className="w-full h-[500px] flex items-end justify-center transition-all duration-500 ease-in-out" 
          >
            <svg 
              viewBox="0 0 200 450" 
              className="w-auto transition-all duration-500 origin-bottom drop-shadow-2xl"
              style={{ height: `${fatorAltura * 100}%` }}
            >
              <g fill={cPele} stroke={cContorno} strokeWidth="1.5" strokeLinejoin="round">
                
                {/* === VISTA ANTERIOR === */}
                {vistaAtual === 0 && (
                  <>
                    {/* Cabeça e Pescoço */}
                    <path d="M92,50 Q100,75 108,50 Z" fill={cSombra}/>
                    <path d={genero === 'masculino' ? "M88,15 C88,0 112,0 112,15 C112,35 108,45 100,50 C92,45 88,35 88,15 Z" : "M89,15 C89,5 111,5 111,15 C111,35 106,45 100,48 C94,45 89,35 89,15 Z"} fill={cPele}/>

                    {/* Tronco (Ombros, Peito, Cintura) */}
                    <g style={{ transform: `scaleX(${scaleTorso})`, transformOrigin: '100px 100px' }}>
                      <path d={genero === 'masculino' 
                        ? "M75,55 C60,60 55,75 60,95 C65,130 80,140 85,180 L115,180 C120,140 135,130 140,95 C145,75 140,60 125,55 Q100,70 75,55 Z" 
                        : "M80,55 C70,60 65,75 68,95 C75,130 85,140 85,180 L115,180 C115,140 125,130 132,95 C135,75 130,60 120,55 Q100,70 80,55 Z"
                      } fill={cPele}/>
                      
                      {/* Detalhes Peitoral/Seios */}
                      <path d={genero === 'masculino' ? "M70,95 Q100,105 100,95 Q100,105 130,95" : "M72,95 Q85,115 100,95 Q115,115 128,95"} fill="none" stroke={cSombra} strokeWidth="1"/>
                      
                      {/* Linha Abdominal */}
                      <path d="M100,105 L100,175" fill="none" stroke={cSombra} strokeWidth="1" opacity="0.5"/>
                    </g>

                    {/* Braço Direito */}
                    <g style={{ transform: `scaleX(${scaleBracoD})`, transformOrigin: '65px 120px' }}>
                      <path d={genero === 'masculino' ? "M60,80 C50,90 50,140 65,160 L60,210 Q65,220 70,210 L75,160 C85,140 80,100 70,80 Z" : "M68,80 C60,90 60,140 70,150 L65,200 Q70,205 75,200 L80,150 C85,140 80,100 75,80 Z"} fill={cPele}/>
                    </g>

                    {/* Braço Esquerdo */}
                    <g style={{ transform: `scaleX(${scaleBracoE})`, transformOrigin: '135px 120px' }}>
                      <path d={genero === 'masculino' ? "M140,80 C150,90 150,140 135,160 L140,210 Q135,220 130,210 L125,160 C115,140 120,100 130,80 Z" : "M132,80 C140,90 140,140 130,150 L135,200 Q130,205 125,200 L120,150 C115,140 120,100 125,80 Z"} fill={cPele}/>
                    </g>

                    {/* Perna/Coxa Direita */}
                    <g style={{ transform: `scaleX(${scaleCoxaD}) scaleY(${scalePernaD})`, transformOrigin: '85px 250px' }}>
                      <path d={genero === 'masculino' 
                        ? "M85,180 C70,200 65,250 78,280 C75,320 80,360 82,390 L98,390 C100,360 102,320 95,280 C102,250 100,200 100,180 Z"
                        : "M85,180 C65,210 65,260 80,280 C77,320 82,360 84,390 L98,390 C100,360 101,320 95,280 C103,250 100,200 100,180 Z"
                      } fill={cPele}/>
                      <ellipse cx="90" cy="400" rx="10" ry="6" fill={cEscura}/>
                    </g>

                    {/* Perna/Coxa Esquerda */}
                    <g style={{ transform: `scaleX(${scaleCoxaE}) scaleY(${scalePernaE})`, transformOrigin: '115px 250px' }}>
                      <path d={genero === 'masculino'
                        ? "M115,180 C130,200 135,250 122,280 C125,320 120,360 118,390 L102,390 C100,360 98,320 105,280 C98,250 100,200 100,180 Z"
                        : "M115,180 C135,210 135,260 120,280 C123,320 118,360 116,390 L102,390 C100,360 99,320 105,280 C97,250 100,200 100,180 Z"
                      } fill={cPele}/>
                      <ellipse cx="110" cy="400" rx="10" ry="6" fill={cEscura}/>
                    </g>
                    
                    {/* Linha Pélvica */}
                    <path d="M85,180 Q100,200 115,180" fill="none" stroke={cSombra} strokeWidth="1.5"/>
                  </>
                )}

                {/* === VISTA LATERAL === */}
                {vistaAtual === 1 && (
                  <>
                    <path d="M94,50 Q100,60 104,50 Z" fill={cSombra}/>
                    <path d="M90,15 C90,5 110,5 110,15 C110,30 108,45 100,48 C94,45 90,30 90,15 Z" fill={cPele}/>
                    
                    {/* Perfil Tronco */}
                    <g style={{ transform: `scaleX(${scaleCintura})`, transformOrigin: '100px 100px' }}>
                      <path d={genero === 'masculino' 
                        ? "M90,55 C120,60 125,90 115,130 C110,170 110,180 105,180 L85,180 C80,150 85,90 90,55 Z"
                        : "M92,55 C115,60 130,95 110,130 C105,170 115,180 105,180 L80,180 C75,140 85,90 92,55 Z"
                      } fill={cPele}/>
                    </g>
                    
                    {/* Braço Lateral */}
                    <g style={{ transform: `scaleX(${scaleBracoD})`, transformOrigin: '100px 120px' }}>
                      <path d="M92,75 C108,80 110,120 105,150 L108,205 Q100,210 95,205 L92,150 C85,120 85,80 92,75 Z" fill={cSombra}/>
                    </g>

                    {/* Perna Lateral */}
                    <g style={{ transform: `scaleX(${scaleCoxaD}) scaleY(${scalePernaD})`, transformOrigin: '95px 250px' }}>
                      <path d={genero === 'masculino'
                        ? "M85,180 C110,190 120,240 105,280 C115,310 110,360 105,390 L90,390 C85,350 80,310 90,280 C80,240 85,200 85,180 Z"
                        : "M80,180 C120,190 125,250 105,280 C115,310 110,360 105,390 L90,390 C85,350 80,310 90,280 C75,240 85,200 80,180 Z"
                      } fill={cPele}/>
                      <ellipse cx="102" cy="400" rx="14" ry="6" fill={cEscura}/>
                    </g>
                  </>
                )}

                {/* === VISTA POSTERIOR === */}
                {vistaAtual === 2 && (
                  <>
                    <path d="M92,50 Q100,75 108,50 Z" fill={cSombra}/>
                    <path d={genero === 'masculino' ? "M88,15 C88,0 112,0 112,15 C112,35 108,45 100,50 C92,45 88,35 88,15 Z" : "M89,15 C89,5 111,5 111,15 C111,35 106,45 100,48 C94,45 89,35 89,15 Z"} fill={cPele}/>

                    <g style={{ transform: `scaleX(${scaleTorso})`, transformOrigin: '100px 100px' }}>
                      {/* Costas */}
                      <path d={genero === 'masculino' 
                        ? "M75,55 C60,60 55,75 60,95 C65,130 80,140 85,180 L115,180 C120,140 135,130 140,95 C145,75 140,60 125,55 L100,65 Z" 
                        : "M80,55 C70,60 65,75 68,95 C75,130 85,140 85,180 L115,180 C115,140 125,130 132,95 C135,75 130,60 120,55 L100,65 Z"
                      } fill={cPele}/>
                      
                      {/* Dorsais/Trapézio */}
                      <path d="M85,100 L100,160 L115,100" fill="none" stroke={cSombra} strokeWidth="1.5"/>
                      <path d="M100,50 L100,160" fill="none" stroke={cSombra} strokeWidth="1"/>
                    </g>

                    <g style={{ transform: `scaleX(${scaleBracoD})`, transformOrigin: '65px 120px' }}>
                      <path d={genero === 'masculino' ? "M60,80 C50,90 50,140 65,160 L60,210 Q65,220 70,210 L75,160 C85,140 80,100 70,80 Z" : "M68,80 C60,90 60,140 70,150 L65,200 Q70,205 75,200 L80,150 C85,140 80,100 75,80 Z"} fill={cSombra}/>
                    </g>

                    <g style={{ transform: `scaleX(${scaleBracoE})`, transformOrigin: '135px 120px' }}>
                      <path d={genero === 'masculino' ? "M140,80 C150,90 150,140 135,160 L140,210 Q135,220 130,210 L125,160 C115,140 120,100 130,80 Z" : "M132,80 C140,90 140,140 130,150 L135,200 Q130,205 125,200 L120,150 C115,140 120,100 125,80 Z"} fill={cSombra}/>
                    </g>

                    {/* Glúteos e Posterior Perna */}
                    <g style={{ transform: `scaleX(${scaleCintura})`, transformOrigin: '100px 180px' }}>
                       <path d={genero === 'masculino' ? "M85,180 Q100,210 115,180 Q120,210 100,210 Q80,210 85,180 Z" : "M82,180 C80,210 100,220 100,185 C100,220 120,210 118,180 Z"} fill={cSombra}/>
                    </g>

                    <g style={{ transform: `scaleX(${scaleCoxaD}) scaleY(${scalePernaD})`, transformOrigin: '85px 250px' }}>
                      <path d={genero === 'masculino' 
                        ? "M85,200 C70,220 65,250 78,280 C75,320 80,360 82,390 L98,390 C100,360 102,320 95,280 C102,250 100,220 100,200 Z"
                        : "M85,205 C65,220 65,260 80,280 C77,320 82,360 84,390 L98,390 C100,360 101,320 95,280 C103,250 100,220 100,205 Z"
                      } fill={cPele}/>
                      <ellipse cx="90" cy="400" rx="10" ry="6" fill={cEscura}/>
                    </g>

                    <g style={{ transform: `scaleX(${scaleCoxaE}) scaleY(${scalePernaE})`, transformOrigin: '115px 250px' }}>
                      <path d={genero === 'masculino'
                        ? "M115,200 C130,220 135,250 122,280 C125,320 120,360 118,390 L102,390 C100,360 98,320 105,280 C98,250 100,220 100,200 Z"
                        : "M115,205 C135,220 135,260 120,280 C123,320 118,360 116,390 L102,390 C100,360 99,320 105,280 C97,250 100,220 100,205 Z"
                      } fill={cPele}/>
                      <ellipse cx="110" cy="400" rx="10" ry="6" fill={cEscura}/>
                    </g>
                  </>
                )}
              </g>
            </svg>
          </div>

          <div className="absolute bottom-4 bg-zinc-950/80 px-4 py-1.5 rounded-lg border border-zinc-800 text-[11px] text-zinc-400 font-mono tracking-wide">
            Escala renderizada: {alturaAtual}m • Biotipo ajustado por medidas
          </div>
        </div>

        {/* COLUNA DIREITA: DADOS E MÉTRICAS */}
        <div className="lg:col-span-6 flex flex-col gap-5">
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-sm text-zinc-400 block font-medium mb-1">Altura Atual</span>
              <span className="text-2xl font-bold font-mono text-zinc-100">{alturaAtual} <span className="text-lg text-zinc-500">m</span></span>
            </div>
            <button onClick={() => setModalAlturaOpen(true)} className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center justify-center font-bold text-xl transition-colors">+</button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-sm text-zinc-400 block font-medium mb-1">Peso Atual</span>
              <span className="text-2xl font-bold font-mono text-zinc-100">{pesoAtual} <span className="text-lg text-zinc-500">kg</span></span>
            </div>
            <button onClick={() => setModalPesoOpen(true)} className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center justify-center font-bold text-xl transition-colors">+</button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div>
              <span className="text-sm text-zinc-400 block font-medium mb-1">Meta de Peso</span>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold font-mono text-zinc-100">{meta.valor} <span className="text-lg text-zinc-500">kg</span></span>
                <span className={`text-xs px-2.5 py-1 rounded-md font-semibold tracking-wide ${diferencaMeta == 0 ? 'bg-green-900/50 text-green-400 border border-green-800' : diferencaMeta > 0 ? 'bg-blue-900/50 text-blue-400 border border-blue-800' : 'bg-orange-900/50 text-orange-400 border border-orange-800'}`}>
                  {diferencaMeta == 0 ? 'Meta atingida!' : diferencaMeta > 0 ? `Faltam ${diferencaMeta} kg` : `Eliminar ${Math.abs(diferencaMeta)} kg`}
                </span>
              </div>
            </div>
            <button onClick={() => setModalMetaOpen(true)} className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl flex items-center justify-center font-bold text-xl transition-colors">+</button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-4">
              <div className={`w-4 h-4 rounded-full ${imcStatus.cor} shadow-[0_0_10px_rgba(0,0,0,0.5)] shadow-${imcStatus.cor.split('-')[1]}-500/50 animate-pulse`}></div>
              <div>
                <span className="text-sm text-zinc-400 block font-medium mb-1">IMC (Massa Corporal)</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-zinc-100">{imc}</span>
                  <span className="text-sm text-zinc-400 font-medium">({imcStatus.texto})</span>
                </div>
              </div>
            </div>
            <button onClick={() => setModalInfoImcOpen(true)} className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full flex items-center justify-center font-serif italic text-sm transition-colors border border-zinc-700">i</button>
          </div>

          <button onClick={() => setModalMaisMedidasOpen(true)} className="w-full mt-2 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-2xl font-bold text-sm transition-colors border border-zinc-700 shadow-lg flex items-center justify-center gap-2 tracking-wide uppercase">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M3 21l18-18" /></svg>
            Editar Medidas Corporais
          </button>
        </div>
      </div>

      {/* MODAL DE MAIS MEDIDAS */}
      {modalMaisMedidasOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 text-zinc-100 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-zinc-800">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <h3 className="text-xl font-bold">Medidas (cm)</h3>
              <button onClick={() => setModalMaisMedidasOpen(false)} className="text-zinc-500 hover:text-white bg-zinc-800 w-8 h-8 rounded-full flex justify-center items-center">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
              {Object.keys(medidas).map((key) => (
                <div key={key} className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex flex-col gap-1.5 focus-within:border-zinc-600 transition-colors">
                  <label className="text-zinc-400 font-semibold uppercase text-[10px] tracking-wider">{key.replace('D', ' (Dir)').replace('E', ' (Esq)')}</label>
                  <input 
                    type="number" 
                    value={medidas[key]} 
                    onChange={(e) => setMedidas({...medidas, [key]: parseFloat(e.target.value) || 0})}
                    className="bg-transparent outline-none text-white font-mono text-lg"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-5 border-t border-zinc-800 mt-2">
              <button onClick={() => setModalMaisMedidasOpen(false)} className="px-6 py-2.5 bg-zinc-100 text-zinc-950 hover:bg-zinc-300 rounded-xl text-sm font-bold transition-colors">Salvar no Avatar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INFO IMC */}
      {modalInfoImcOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 text-zinc-100 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-5 border border-zinc-800">
            <h3 className="text-xl font-bold border-b border-zinc-800 pb-3">Cálculo de IMC</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              O IMC é calculado dividindo o seu peso (kg) pela altura (m) ao quadrado.
            </p>
            <div className="space-y-2 text-sm text-zinc-300 font-medium">
              <div className="flex justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800/50"><span>&lt; 18.5</span><span className="text-yellow-500">Abaixo do peso</span></div>
              <div className="flex justify-between p-3 bg-zinc-950 rounded-xl border border-green-900/30"><span>18.5 a 24.9</span><span className="text-green-500">Peso normal</span></div>
              <div className="flex justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800/50"><span>25.0 a 29.9</span><span className="text-yellow-500">Sobrepeso</span></div>
              <div className="flex justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800/50"><span>&gt; 30.0</span><span className="text-red-500">Obesidade</span></div>
            </div>
            <button onClick={() => setModalInfoImcOpen(false)} className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-bold transition-colors mt-2">Entendi</button>
          </div>
        </div>
      )}

      {/* MODAL GENÉRICO PARA ADICIONAR VALORES (Altura, Peso, Meta) */}
      {(modalAlturaOpen || modalPesoOpen || modalMetaOpen) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 text-zinc-100 rounded-3xl w-full max-w-xs p-6 shadow-2xl space-y-4 border border-zinc-800">
            <h3 className="text-lg font-bold border-b border-zinc-800 pb-2">
              {modalAlturaOpen ? 'Nova Altura' : modalPesoOpen ? 'Novo Peso' : 'Nova Meta de Peso'}
            </h3>
            
            <div className="space-y-4 pt-2">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus-within:border-zinc-600 transition-colors">
                <label className="text-zinc-500 uppercase text-[10px] font-bold block mb-1">Valor ({modalAlturaOpen ? 'metros' : 'kg'})</label>
                <input 
                  type="number" step="0.01" value={novoValor} 
                  onChange={(e) => setNovoValor(e.target.value)} 
                  placeholder={modalAlturaOpen ? "Ex: 1.75" : "Ex: 72"}
                  className="w-full bg-transparent outline-none text-white font-mono text-xl" autoFocus
                />
              </div>
              {!modalMetaOpen && (
                <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 focus-within:border-zinc-600 transition-colors">
                  <label className="text-zinc-500 uppercase text-[10px] font-bold block mb-1">Data do Registro</label>
                  <input 
                    type="date" value={novaData} 
                    onChange={(e) => setNovaData(e.target.value)} 
                    className="w-full bg-transparent outline-none text-white [color-scheme:dark]"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => { setModalAlturaOpen(false); setModalPesoOpen(false); setModalMetaOpen(false); }} className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium">Cancelar</button>
              <button 
                onClick={() => {
                  if (modalAlturaOpen) adicionarAltura();
                  else if (modalPesoOpen) adicionarPeso();
                  else { setMeta({ valor: parseFloat(novoValor) || meta.valor }); setModalMetaOpen(false); }
                }} 
                className="px-5 py-2.5 bg-zinc-100 text-zinc-950 font-bold rounded-xl text-sm hover:bg-zinc-300 transition-colors"
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
