import { setDoc, deleteDoc, getDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { notificar } from '../utils/toast';

// Versão atual da estrutura dos dados. Aumente quando mudar o formato e crie uma migração.
export const SCHEMA_VERSION = 1;

function mensagemDeErro(e) {
  const code = e?.code || '';
  if (code.includes('permission-denied')) return 'Sem permissão para salvar. Verifique as regras do Firestore e se você está logado.';
  if (code.includes('unavailable') || code.includes('network')) return 'Sem conexão com o servidor. A alteração pode não ter sido salva.';
  if (code.includes('unauthenticated')) return 'Sessão expirada. Entre novamente.';
  return 'Não foi possível salvar a alteração. Tente novamente.';
}

// Substitutos de setDoc/deleteDoc: nunca "estouram" erro, avisam o usuário. Retornam true/false.
export async function salvarDoc(ref, data, options) {
  try {
    if (options) await setDoc(ref, data, options);
    else await setDoc(ref, data);
    return true;
  } catch (e) {
    console.error('Erro ao salvar:', e);
    notificar(mensagemDeErro(e), 'erro');
    return false;
  }
}

export async function apagarDoc(ref) {
  try {
    await deleteDoc(ref);
    return true;
  } catch (e) {
    console.error('Erro ao excluir:', e);
    notificar(mensagemDeErro(e).replace('salvar', 'excluir'), 'erro');
    return false;
  }
}

export function avisarErroLeitura(e) {
  console.error('Erro ao ler dados:', e);
  notificar('Não foi possível carregar seus dados da nuvem. Verifique a conexão e as regras do Firestore.', 'erro');
}

// Registra a versão do esquema no perfil (sem avisar em caso de falha).
export async function registrarSchema(user) {
  try {
    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().schemaVersion !== SCHEMA_VERSION) {
      await setDoc(ref, { schemaVersion: SCHEMA_VERSION }, { merge: true });
    }
  } catch (e) {
    console.error('schemaVersion:', e);
  }
}
