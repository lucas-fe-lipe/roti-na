import { useState, useEffect, useCallback, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { salvarDoc } from '../services/db';
import { normalizarLayout, LAYOUT_PADRAO } from '../utils/layout';

// Valores padrão: tudo ligado, como o app era antes das configurações existirem.
export const CONFIG_PADRAO = {
  paginas: { grade: true, notas: true, treinos: true },
  blocos: { grade: true, metas: true, cursos: true, medidas: true, exercicios: true, treinos: true, linhaAgora: true, agendaGoogle: false },
  layout: LAYOUT_PADRAO, // ordem das páginas e dos blocos dentro delas
  integracoes: { googleAutoSync: false },
  grade: { pxPorHora: 22 }, // altura da grade horária
  treino: { sexo: 'm', cor: '#f97316', modo: 'absoluto' }, // avatar dos músculos
  metas: { linhas: 1 }, // metas diárias em 1 ou 2 linhas
  admin: { ativo: false }, // modo administrador (só vale para a conta autorizada)
  agendaGoogle: { email: '', incluirRotiNa: true, extras: '', minimizada: false }, // fontes do bloco "Google Agenda na tela"
};

const mesclar = (salva) => ({
  ...CONFIG_PADRAO,
  ...(salva || {}),
  paginas: { ...CONFIG_PADRAO.paginas, ...(salva?.paginas || {}) },
  blocos: { ...CONFIG_PADRAO.blocos, ...(salva?.blocos || {}) },
  integracoes: { ...CONFIG_PADRAO.integracoes, ...(salva?.integracoes || {}) },
  layout: normalizarLayout(salva?.layout),
  grade: { ...CONFIG_PADRAO.grade, ...(salva?.grade || {}) },
  treino: { ...CONFIG_PADRAO.treino, ...(salva?.treino || {}) },
  metas: { ...CONFIG_PADRAO.metas, ...(salva?.metas || {}) },
  admin: { ...CONFIG_PADRAO.admin, ...(salva?.admin || {}) },
  agendaGoogle: { ...CONFIG_PADRAO.agendaGoogle, ...(salva?.agendaGoogle || {}) },
});

const chaveLocal = (user) => `config_${user ? user.uid : 'local'}`;

export default function useConfig(user) {
  const [config, setConfig] = useState(CONFIG_PADRAO);
  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    // primeiro mostra o que está guardado neste aparelho (evita "piscar" os padrões)
    try {
      const salva = JSON.parse(localStorage.getItem(chaveLocal(user)) || 'null');
      setConfig(mesclar(salva));
    } catch {
      setConfig(CONFIG_PADRAO);
    }
    if (!user) return;
    // com login, a nuvem manda
    return onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        const nuvem = snap.exists() ? snap.data().config : null;
        if (nuvem) {
          const nova = mesclar(nuvem);
          setConfig(nova);
          try { localStorage.setItem(chaveLocal(user), JSON.stringify(nova)); } catch { /* sem armazenamento */ }
        }
      },
      (e) => console.error('Erro ao ler configurações:', e)
    );
  }, [user]);

  // atualizar({ blocos: { metas: false } }) altera só o que foi informado
  const atualizar = useCallback((parcial) => {
    const atual = configRef.current;
    const nova = mesclar({
      ...atual,
      ...parcial,
      paginas: { ...atual.paginas, ...(parcial.paginas || {}) },
      blocos: { ...atual.blocos, ...(parcial.blocos || {}) },
      integracoes: { ...atual.integracoes, ...(parcial.integracoes || {}) },
      layout: parcial.layout || atual.layout,
      grade: { ...atual.grade, ...(parcial.grade || {}) },
      treino: { ...atual.treino, ...(parcial.treino || {}) },
      metas: { ...atual.metas, ...(parcial.metas || {}) },
      admin: { ...atual.admin, ...(parcial.admin || {}) },
      agendaGoogle: { ...atual.agendaGoogle, ...(parcial.agendaGoogle || {}) },
    });
    setConfig(nova);
    try { localStorage.setItem(chaveLocal(user), JSON.stringify(nova)); } catch { /* sem armazenamento */ }
    if (user) salvarDoc(doc(db, 'users', user.uid), { config: nova }, { merge: true });
  }, [user]);

  return { config, atualizarConfig: atualizar };
}
