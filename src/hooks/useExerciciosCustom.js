import { doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { salvarDoc, apagarDoc } from '../services/db';

// Salvar/apagar exercícios criados pelo usuário (nuvem se há login, senão localStorage)
export default function useExerciciosCustom(user, lista, setLista) {
  const local = (nova) => { setLista(nova); try { localStorage.setItem('local_exercicios', JSON.stringify(nova)); } catch { /* sem armazenamento */ } };

  const salvar = async (ex) => {
    const id = ex.id || `c${Date.now().toString(36)}`;
    const completo = { id, nome: ex.nome, cat: ex.cat, m: ex.m, custom: true, criadoEm: ex.criadoEm || new Date().toISOString() };
    let ok = true;
    if (user) ok = await salvarDoc(doc(db, 'users', user.uid, 'exercicios', id), completo);
    else local([...lista.filter((x) => x.id !== id), completo]);
    return ok ? completo : null;
  };

  const apagar = async (ex) => {
    if (user) return apagarDoc(doc(db, 'users', user.uid, 'exercicios', ex.id));
    local(lista.filter((x) => x.id !== ex.id));
    return true;
  };

  return { salvar, apagar };
}
