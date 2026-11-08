import { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import BodyFigure from '../components/BodyFigure';
import ValorModal from '../components/ValorModal';
import {
  MEDIDAS, CHAVES_MEDIDAS, FAIXAS_IMC, resolverMedidas, calcIMC, faixaIMC, ultimo,
  parseAltura, parsePeso, parseMedida, formatarNumero,
} from '../utils/bodyModel';

const VAZIO = { sexo: 'M', altura: [], peso: [], meta: null, medidas: {} };
const ALTURA_PADRAO_M = 1.7; // usada no desenho enquanto nenhuma altura foi registrada
const LS_KEY = 'local_treino_corpo';

const CORES_IMC = { green: 'bg-green-500', yellow: 'bg-yellow-400', red: 'bg-red-500' };

const CAMPOS = {
  altura: { titulo: 'Altura', unidade: 'm', parse: parseAltura, fmt: (n) => formatarNumero(n, 2), erro: 'Informe uma altura válida, ex.: 1,70' },
  peso: { titulo: 'Peso', unidade: 'kg', parse: parsePeso, fmt: (n) => formatarNumero(n, 1), erro: 'Informe um peso válido, ex.: 70,5' },
  meta: { titulo: 'Meta de peso', unidade: 'kg', parse: parsePeso, fmt: (n) => formatarNumero(n, 1), erro: 'Informe um peso válido, ex.: 65', comData: false },
};
const campoMedida = (m) => ({
  titulo: `${m.grupo}${m.lado ? ' ' + m.lado : ''}`,
  unidade: 'cm',
  parse: parseMedida,
  fmt: (n) => formatarNumero(n, 1),
  erro: 'Informe uma medida válida em cm, ex.: 82',
  dica: m.dica,
});

const Linha = ({ rotulo, valor, onAdd, extra }) => (
  <div className="flex items-center justify-between gap-2 py-1.5">
    <div className="min-w-0">
      <div className="text-sm text-zinc-200 truncate">
        {rotulo}: <span className="font-semibold text-white">{valor}</span>
      </div>
      {extra && <div className="text-[11px] text-zinc-400">{extra}</div>}
    </div>
    <button
      type="button"
      onClick={onAdd}
      className="bg-zinc-800 border border-zinc-700 text-zinc-100 w-7 h-7 shrink-0 flex items-center justify-center rounded hover:bg-zinc-700 transition-colors"
      title={`Adicionar ${rotulo.toLowerCase()}`}
    >
      +
    </button>
  </div>
);

export default function Treinos({ user }) {
  const [dados, setDados] = useState(VAZIO);
  const [view, setView] = useState(0);
  const [modal, setModal] = useState(null); // chave do campo aberto
  const [infoImc, setInfoImc] = useState(false);
  const [maisAberto, setMaisAberto] = useState(false);

  // ---------- carregar ----------
  useEffect(() => {
    if (user) {
      const ref = doc(db, 'users', user.uid, 'treinos', 'corpo');
      return onSnapshot(ref, (snap) => setDados({ ...VAZIO, ...(snap.exists() ? snap.data() : {}) }));
    }
    try {
      const salvo = localStorage.getItem(LS_KEY);
      setDados({ ...VAZIO, ...(salvo ? JSON.parse(salvo) : {}) });
    } catch {
      setDados(VAZIO);
    }
  }, [user]);

  // ---------- salvar ----------
  const salvar = async (novo) => {
    setDados(novo);
    if (user) {
      await setDoc(doc(db, 'users', user.uid, 'treinos', 'corpo'), novo);
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(novo));
    }
  };

  const lista = (chave) => (chave === 'altura' || chave === 'peso' ? dados[chave] : dados.medidas?.[chave]) || [];

  const comLista = (chave, nova) =>
    chave === 'altura' || chave === 'peso'
      ? { ...dados, [chave]: nova }
      : { ...dados, medidas: { ...dados.medidas, [chave]: nova } };

  const adicionar = (chave, valor, data) => {
    if (chave === 'meta') {
      salvar({ ...dados, meta: valor });
    } else {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      salvar(comLista(chave, [...lista(chave), { id, valor, data }]));
    }
    setModal(null);
  };

  const apagarRegistro = (chave, id) => salvar(comLista(chave, lista(chave).filter(r => r.id !== id)));

  // ---------- valores atuais ----------
  const alturaAtual = ultimo(dados.altura)?.valor ?? null;
  const pesoAtual = ultimo(dados.peso)?.valor ?? null;
  const imc = calcIMC(pesoAtual, alturaAtual);
  const faixa = imc ? faixaIMC(imc) : null;

  const informadas = useMemo(() => {
    const o = {};
    CHAVES_MEDIDAS.forEach(k => {
      const v = ultimo(dados.medidas?.[k])?.valor;
      if (v != null) o[k] = v;
    });
    return o;
  }, [dados.medidas]);

  const alturaDesenho = alturaAtual ?? ALTURA_PADRAO_M;
  const medidasDesenho = useMemo(
    () => resolverMedidas(dados.sexo, alturaDesenho * 100, imc, informadas),
    [dados.sexo, alturaDesenho, imc, informadas]
  );

  // ---------- meta ----------
  let textoMeta = null;
  if (dados.meta != null && pesoAtual != null) {
    const dif = dados.meta - pesoAtual;
    if (Math.abs(dif) < 0.05) textoMeta = 'Meta atingida!';
    else textoMeta = dif < 0 ? `Faltam perder ${formatarNumero(-dif)} kg` : `Faltam ganhar ${formatarNumero(dif)} kg`;
  }

  // ---------- campo aberto no modal ----------
  let campoModal = null;
  if (modal) {
    campoModal = CAMPOS[modal] || campoMedida(MEDIDAS.find(m => m.chave === modal));
  }

  const ultimaData = (l) => {
    const u = ultimo(l);
    if (!u) return null;
    const [a, m, d] = u.data.split('-');
    return `em ${d}/${m}/${a}`;
  };

  return (
    <div className="w-full max-w-5xl flex flex-row items-start gap-3 px-2 sm:px-0 mt-2 pb-10">
      {/* ---------- DESENHO ---------- */}
      <div className="w-[46%] max-w-[340px] shrink-0">
        <BodyFigure
          sexo={dados.sexo}
          alturaM={alturaDesenho}
          medidas={medidasDesenho}
          imc={imc}
          view={view}
          onChangeView={setView}
        />
        {alturaAtual == null && (
          <p className="text-[11px] text-zinc-500 mt-1 text-center">Registre sua altura para ajustar o desenho.</p>
        )}
      </div>

      {/* ---------- DADOS ---------- */}
      <div className="flex-1 min-w-0">
        <div className="flex bg-zinc-900 border border-zinc-800 rounded p-0.5 mb-2">
          {[['M', 'Masculino'], ['F', 'Feminino']].map(([k, nome]) => (
            <button
              key={k}
              type="button"
              onClick={() => salvar({ ...dados, sexo: k })}
              className={`flex-1 py-1 text-xs rounded transition-colors ${dados.sexo === k ? 'bg-zinc-100 text-zinc-950 font-semibold' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              {nome}
            </button>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1 divide-y divide-zinc-800">
          <Linha
            rotulo="Altura"
            valor={alturaAtual != null ? `${CAMPOS.altura.fmt(alturaAtual)} m` : '—'}
            extra={ultimaData(dados.altura)}
            onAdd={() => setModal('altura')}
          />
          <Linha
            rotulo="Peso"
            valor={pesoAtual != null ? `${CAMPOS.peso.fmt(pesoAtual)} kg` : '—'}
            extra={ultimaData(dados.peso)}
            onAdd={() => setModal('peso')}
          />
          <Linha
            rotulo="Meta"
            valor={dados.meta != null ? `${CAMPOS.meta.fmt(dados.meta)} kg` : '—'}
            extra={textoMeta}
            onAdd={() => setModal('meta')}
          />

          {/* IMC */}
          <div className="flex items-center justify-between gap-2 py-1.5">
            <div className="min-w-0">
              <div className="text-sm text-zinc-200 flex items-center gap-2">
                <span>IMC: <span className="font-semibold text-white">{imc ? formatarNumero(imc) : '—'}</span></span>
                {faixa && <span className={`inline-block w-3 h-3 rounded-full ${CORES_IMC[faixa.cor]}`} title={faixa.nome} />}
              </div>
              <div className="text-[11px] text-zinc-400">{faixa ? faixa.nome : 'Informe altura e peso'}</div>
            </div>
            <button
              type="button"
              onClick={() => setInfoImc(true)}
              className="w-7 h-7 shrink-0 rounded-full border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-xs font-serif italic flex items-center justify-center"
              title="Como o IMC é calculado"
              aria-label="Informações sobre o IMC"
            >
              i
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMaisAberto(v => !v)}
          className="w-full mt-2 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg text-sm font-medium text-zinc-200 transition-colors flex items-center justify-center gap-2"
        >
          Mais medidas <span className="text-xs">{maisAberto ? '▲︎' : '▼︎'}</span>
        </button>

        {maisAberto && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1 mt-2 divide-y divide-zinc-800">
            {MEDIDAS.map(m => {
              const v = ultimo(dados.medidas?.[m.chave])?.valor;
              return (
                <Linha
                  key={m.chave}
                  rotulo={`${m.grupo}${m.lado ? ' ' + m.lado : ''}`}
                  valor={v != null ? `${formatarNumero(v)} cm` : '—'}
                  extra={ultimaData(dados.medidas?.[m.chave] || [])}
                  onAdd={() => setModal(m.chave)}
                />
              );
            })}
            <p className="text-[11px] text-zinc-500 py-2">
              Medidas em centímetros, com fita métrica (contorno). D = direito, E = esquerdo. O que não for preenchido é estimado pela altura e pelo IMC.
            </p>
          </div>
        )}
      </div>

      {/* ---------- MODAIS ---------- */}
      <ValorModal
        isOpen={!!modal}
        campo={campoModal}
        historico={modal && modal !== 'meta' ? lista(modal) : []}
        valorAtual={modal === 'meta' ? dados.meta : modal ? ultimo(lista(modal))?.valor : null}
        onSave={(valor, data) => adicionar(modal, valor, data)}
        onDelete={(id) => apagarRegistro(modal, id)}
        onRemoverMeta={modal === 'meta' ? () => { salvar({ ...dados, meta: null }); setModal(null); } : undefined}
        onClose={() => setModal(null)}
      />

      {infoImc && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setInfoImc(false)}>
          <div className="bg-zinc-900 text-zinc-100 rounded-lg w-full max-w-sm p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold">Índice de Massa Corporal (IMC)</h2>
            <p className="text-sm text-zinc-300">
              O IMC relaciona seu peso com sua altura:
            </p>
            <div className="bg-zinc-950 border border-zinc-800 rounded p-3 text-center font-mono text-sm">
              IMC = peso (kg) ÷ altura² (m²)
            </div>
            <p className="text-xs text-zinc-400">
              Exemplo: 70 kg e 1,75 m → 70 ÷ (1,75 × 1,75) = 22,9.
            </p>

            <table className="w-full text-sm">
              <tbody>
                {FAIXAS_IMC.map(f => (
                  <tr key={f.nome} className="border-t border-zinc-800">
                    <td className="py-1.5 pr-2"><span className={`inline-block w-3 h-3 rounded-full align-middle ${CORES_IMC[f.cor]}`} /></td>
                    <td className="py-1.5 text-zinc-300">{f.faixa}</td>
                    <td className="py-1.5 text-right font-medium">{f.nome}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-xs text-zinc-400">
              Verde: faixa adequada. Amarelo: atenção, um pouco fora do ideal. Vermelho: muito fora do ideal.
              O IMC é só uma referência para adultos: ele não diferencia músculo de gordura e não substitui avaliação de um profissional de saúde.
            </p>

            <div className="flex justify-end pt-1">
              <button type="button" onClick={() => setInfoImc(false)} className="px-5 py-2 bg-zinc-100 text-zinc-950 rounded hover:bg-zinc-300 font-medium text-sm">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
