import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { avisarErroLeitura } from '../services/db';

const lerLista = (txt) => {
  try {
    const l = JSON.parse(txt);
    return Array.isArray(l) ? l : [];
  } catch {
    return [];
  }
};

// Carrega atividades, metas e tarefas: da nuvem (tempo real) se há login, senão do localStorage.
export default function useDados(user, activePage) {
  const [atividades, setAtividades] = useState([]);
  const [metas, setMetas] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [medidas, setMedidas] = useState([]);
  const [treinos, setTreinos] = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [exerciciosCustom, setExerciciosCustom] = useState([]);

  useEffect(() => {
    if (!user) {
      const tSalvas = localStorage.getItem('local_tarefas');
      const aSalvas = localStorage.getItem('local_atividades');
      const mSalvas = localStorage.getItem('local_metas');
      setCursos(lerLista(localStorage.getItem('local_cursos') || '[]'));
      setMedidas(lerLista(localStorage.getItem('local_medidas') || '[]'));
      setTreinos(lerLista(localStorage.getItem('local_treinos') || '[]'));
      setSessoes(lerLista(localStorage.getItem('local_sessoes') || '[]'));
      setExerciciosCustom(lerLista(localStorage.getItem('local_exercicios') || '[]'));
      if (tSalvas) setTarefas(lerLista(tSalvas));
      if (aSalvas) setAtividades(lerLista(aSalvas));
      if (mSalvas) setMetas(lerLista(mSalvas));
      return;
    }

    const ouvir = (nome, setter) =>
      onSnapshot(
        collection(db, 'users', user.uid, nome),
        (snap) => setter(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        avisarErroLeitura
      );
    const cancelar = [ouvir('atividades', setAtividades), ouvir('metas', setMetas), ouvir('tarefas', setTarefas), ouvir('cursos', setCursos), ouvir('medidas', setMedidas), ouvir('treinos', setTreinos), ouvir('sessoes', setSessoes), ouvir('exercicios', setExerciciosCustom)];
    return () => cancelar.forEach((f) => f());
  }, [user]);

  // Sem login, a página Notas grava tarefas (avaliações) direto no localStorage;
  // ao voltar para a Rotina, relemos para a lista "Hoje" refletir essas mudanças.
  useEffect(() => {
    if (user || activePage !== 'Grade') return;
    setTarefas(lerLista(localStorage.getItem('local_tarefas') || '[]'));
    setCursos(lerLista(localStorage.getItem('local_cursos') || '[]'));
  }, [activePage, user]);

  return { atividades, setAtividades, metas, setMetas, tarefas, setTarefas, cursos, medidas, setMedidas, treinos, setTreinos, sessoes, setSessoes, exerciciosCustom, setExerciciosCustom };
}
