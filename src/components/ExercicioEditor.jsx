import { useState, useMemo } from 'react';
import useVoltar from '../hooks/useVoltar';
import AvatarMuscular from './AvatarMuscular';
import { CATEGORIAS, MUSCULOS, EQP, todosExercicios } from '../data/exercicios';
import { validarExercicio, proximoNivel, rotuloNivel } from '../utils/exercicioCustom';
import { intensidadeDoExercicio } from '../utils/treino';

// Criar/editar um exercício próprio: nome, categoria e quanto cada músculo é exigido
export default function ExercicioEditor({ inicial, config, onSalvar, onClose }) {
  useVoltar(true, onClose);
  const [nome, setNome] = useState(inicial?.nome || '');
  const [cat, setCat] = useState(inicial?.cat || '');
  const [m, setM] = useState(inicial?.m || {});
  const [eqp, setEqp] = useState(inicial?.eqp || []);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { sexo, cor } = config.treino;
  const intensidades = useMemo(() => intensidadeDoExercicio({ m }), [m]);

  const salvar = async () => {
    const r = validarExercicio({ nome, cat, m, eqp }, todosExercicios(), inicial?.id);
    if (!r.ok) return setErro(r.erro);
    setErro('');
    setSalvando(true);
    await onSalvar({ ...r.exercicio, id: inicial?.id, criadoEm: inicial?.criadoEm });
    setSalvando(false);
  };

  const girar = (g) => setM((x) => {
    const w = proximoNivel(x[g] || 0);
    const novo = { ...x };
    if (w === 0) delete novo[g]; else novo[g] = w;
    return novo;
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-3" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label="Exercício" className="bg-zinc-900 text-zinc-100 rounded-xl w-full max-w-lg p-4 shadow-2xl border border-zinc-800 max-h-[92vh] overflow-y-auto space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{inicial?.id ? 'Editar exercício' : 'Novo exercício'}</h2>
          <button aria-label="Fechar" onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <label className="flex flex-col text-[11px] text-zinc-400">Nome
          <input type="text" maxLength={50} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Remada no TRX" className="mt-0.5 bg-zinc-950 border border-zinc-700 rounded p-2 text-sm text-white" />
        </label>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Categoria">
          {CATEGORIAS.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={`text-xs px-2.5 py-1 rounded-full border ${cat === c ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-bold' : 'border-zinc-700 text-zinc-400 hover:text-zinc-100'}`}>{c}</button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-zinc-400">Equipamento (pode marcar mais de um)</span>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Equipamento">
            {Object.entries(EQP).map(([k, r]) => (
              <button key={k} type="button" aria-pressed={eqp.includes(k)} onClick={() => setEqp((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]))} className={`text-xs px-2.5 py-1 rounded-full border ${eqp.includes(k) ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-bold' : 'border-zinc-700 text-zinc-400 hover:text-zinc-100'}`}>{r}</button>
            ))}
          </div>
        </div>
        <AvatarMuscular sexo={sexo} cor={cor} intensidades={intensidades} className="max-w-[14rem] mx-auto" />
        <p className="text-[11px] text-zinc-500">Toque num músculo para alternar: — → leve → auxiliar → principal.</p>
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(MUSCULOS).map(([g, nomeM]) => {
            const w = m[g] || 0;
            return (
              <button key={g} type="button" onClick={() => girar(g)} className={`flex items-center justify-between gap-1 text-left text-[11px] px-2 py-1.5 rounded border ${w ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                <span className="truncate">{nomeM}</span><span className={w ? 'font-bold' : ''}>{rotuloNivel(w)}</span>
              </button>
            );
          })}
        </div>
        {erro && <p role="alert" className="text-xs text-red-400">{erro}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="text-xs px-3 py-2 text-zinc-400 hover:text-white">Cancelar</button>
          <button onClick={salvar} disabled={salvando} className="text-xs font-bold px-4 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-white disabled:opacity-50">{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>
    </div>
  );
}
