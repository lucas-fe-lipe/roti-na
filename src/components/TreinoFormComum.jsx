import { useState } from 'react';
import useVoltar from '../hooks/useVoltar';
import IconeTreino from './IconeTreino';
import CampoFaixa from './CampoFaixa';
import { TIPOS, MODALIDADES, INTENSIDADES, UNIDADES_DIST, validarTreinoGeral, faixaParaTexto } from '../utils/treinoTipos';

// Primeiro pop-up: que tipo de treino?
export function EscolherTipo({ onEscolher, onClose }) {
  useVoltar(true, onClose);
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Tipo de treino" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-sm p-4 shadow-2xl border border-zinc-800 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">Que tipo de treino?</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="flex flex-col gap-2">
          {Object.entries(TIPOS).map(([k, t]) => (
            <button key={k} onClick={() => onEscolher(k)} className="flex items-center gap-3 text-left bg-zinc-950/60 border border-zinc-800 hover:border-zinc-500 rounded-xl p-3 transition-colors">
              <IconeTreino chave={k === 'cardio' ? 'corrida' : k === 'outro' ? 'braco' : 'bike'} className={`w-10 h-10 shrink-0 text-zinc-300 ${k === 'forca' ? 'hidden' : ''}`} />
              {k === 'forca' && <span className="w-10 h-10 shrink-0 flex items-center justify-center text-2xl" aria-hidden="true">🏋️</span>}
              <span className="min-w-0">
                <span className="block text-sm font-bold">{t.nome}</span>
                <span className="block text-xs text-zinc-500">{t.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Vincular o treino a uma atividade da grade: nenhuma, uma existente ou criar uma com o mesmo nome
export function VinculoAtividade({ valor, onChange, atividades = [], treinoId }) {
  const livres = atividades.filter((a) => !a.treinoId || a.treinoId === treinoId);
  return (
    <label className="flex flex-col text-[11px] text-zinc-400">Atividade na grade horária
      <select value={valor} onChange={(e) => onChange(e.target.value)} className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white">
        <option value="">Não vincular</option>
        <option value="criar">+ Criar atividade com o mesmo nome (categoria Treinos)</option>
        {livres.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
      </select>
    </label>
  );
}

const rotuloCampo = 'flex flex-col text-[11px] text-zinc-400';
const entrada = 'mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white';

// Formulário dos treinos de cardio e "outro"
export function EditorTreinoSimples({ tipo, inicial, atividades, vinculoInicial = '', onClose, onSalvar }) {
  useVoltar(true, onClose);
  const [nome, setNome] = useState(inicial.nome || '');
  const [modalidade, setModalidade] = useState(inicial.modalidade || 'corrida');
  const [modalidadeNome, setModalidadeNome] = useState(inicial.modalidadeNome || '');
  const [intensidade, setIntensidade] = useState(inicial.intensidade || 'moderada');
  const [duracaoTexto, setDuracaoTexto] = useState(faixaParaTexto(inicial.duracao));
  const [distanciaTexto, setDistanciaTexto] = useState(faixaParaTexto(inicial.distancia?.faixa));
  const [distanciaUnidade, setDistanciaUnidade] = useState(inicial.distancia?.unidade || 'km');
  const [vinculo, setVinculo] = useState(vinculoInicial);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const nomeFinal = nome.trim() || (tipo === 'cardio' ? (modalidade === 'outra' ? modalidadeNome.trim() : MODALIDADES[modalidade].nome) : '');
    const r = validarTreinoGeral({ tipo, nome: nomeFinal, modalidade, modalidadeNome, intensidade, duracaoTexto, distanciaTexto, distanciaUnidade });
    if (!r.ok) return setErro(r.erro);
    setErro('');
    setSalvando(true);
    await onSalvar({ ...r.treino, id: inicial.id, criadoEm: inicial.criadoEm }, vinculo);
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Treino" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-md p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{inicial.id ? 'Editar treino' : tipo === 'cardio' ? 'Novo treino de cardio' : 'Novo treino'}</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>

        {tipo === 'cardio' && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] text-zinc-400">Tipo de treino</span>
            <div className="grid grid-cols-4 gap-1.5" role="group" aria-label="Tipo de cardio">
              {Object.entries(MODALIDADES).map(([k, m]) => (
                <button key={k} type="button" onClick={() => setModalidade(k)} aria-pressed={modalidade === k} className={`flex flex-col items-center gap-0.5 rounded-lg border p-1.5 text-[10px] leading-tight text-center ${modalidade === k ? 'border-zinc-100 bg-zinc-800 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                  <IconeTreino chave={k} className="w-8 h-8" />
                  {k === 'outra' ? 'Adicionar' : m.nome}
                </button>
              ))}
            </div>
            {modalidade === 'outra' && <input aria-label="Nome do tipo de cardio" maxLength={30} value={modalidadeNome} onChange={(e) => setModalidadeNome(e.target.value)} placeholder="Ex.: Remo, Esqui…" className={entrada} />}
          </div>
        )}

        <label className={rotuloCampo}>Nome do treino{tipo === 'cardio' ? ' (opcional)' : ''}
          <input type="text" maxLength={60} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={tipo === 'cardio' ? 'Ex.: Corrida no parque' : 'Ex.: Pilates, Basquete…'} className={entrada} />
        </label>

        <CampoFaixa rotulo="Duração" sufixo={<span className="text-xs text-zinc-400 shrink-0">min</span>} valor={duracaoTexto} onChange={setDuracaoTexto} placeholder="45" />

        {tipo === 'cardio' ? (
          <div className="flex flex-col gap-1">
            <CampoFaixa rotulo="Distância (opcional)" valor={distanciaTexto} onChange={setDistanciaTexto} placeholder="5"
              sufixo={(
                <select aria-label="Unidade da distância" value={distanciaUnidade} onChange={(e) => setDistanciaUnidade(e.target.value)} className="bg-zinc-950 border border-zinc-700 rounded p-2 text-xs text-white shrink-0">
                  {Object.entries(UNIDADES_DIST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              )} />
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-zinc-400">Intensidade</span>
            <div className="flex rounded border border-zinc-700 overflow-hidden" role="group" aria-label="Intensidade">
              {Object.entries(INTENSIDADES).map(([k, v]) => (
                <button key={k} type="button" onClick={() => setIntensidade(k)} aria-pressed={intensidade === k} className={`flex-1 text-xs py-2 ${intensidade === k ? 'bg-zinc-100 text-zinc-900 font-bold' : 'text-zinc-400 hover:bg-zinc-800'}`}>{v.nome}</button>
              ))}
            </div>
          </div>
        )}

        <VinculoAtividade valor={vinculo} onChange={setVinculo} atividades={atividades} treinoId={inicial.id} />

        {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
          <button onClick={onClose} className="px-3 py-1.5 bg-zinc-800 rounded text-zinc-300 hover:bg-zinc-700 text-sm font-bold">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="px-3 py-1.5 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 text-sm font-bold disabled:opacity-60">Salvar</button>
        </div>
      </div>
    </div>
  );
}
