import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { SCHEMA_VERSION } from '../services/db';
import { hojeLocalStr } from './date';

const COLECOES = ['atividades', 'tarefas', 'metas', 'cursos', 'medidas'];
const CHAVE_LOCAL = {
  atividades: 'local_atividades',
  tarefas: 'local_tarefas',
  metas: 'local_metas',
  cursos: 'local_cursos',
  medidas: 'local_medidas',
};

const lerLocal = (colecao) => {
  try {
    const lista = JSON.parse(localStorage.getItem(CHAVE_LOCAL[colecao]) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
};

export async function montarBackup(user) {
  const dados = {};
  for (const c of COLECOES) {
    if (user) {
      const snap = await getDocs(collection(db, 'users', user.uid, c));
      dados[c] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      dados[c] = lerLocal(c);
    }
  }
  return { app: 'roti-na', schemaVersion: SCHEMA_VERSION, exportadoEm: new Date().toISOString(), dados };
}

export function baixarBackup(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `roti-na-backup-${hojeLocalStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Lê e valida o texto do arquivo. Retorna { ok, erro?, backup?, resumo? }
export function lerBackup(texto) {
  let obj;
  try {
    obj = JSON.parse(texto);
  } catch {
    return { ok: false, erro: 'O arquivo não é um JSON válido.' };
  }
  if (!obj || obj.app !== 'roti-na' || typeof obj.dados !== 'object' || obj.dados === null) {
    return { ok: false, erro: 'Este arquivo não é um backup do Roti na.' };
  }
  if (typeof obj.schemaVersion === 'number' && obj.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, erro: 'Este backup é de uma versão mais nova do app. Atualize o app antes de importar.' };
  }
  const dados = {};
  const resumo = {};
  for (const c of COLECOES) {
    const lista = obj.dados[c] ?? [];
    if (!Array.isArray(lista)) return { ok: false, erro: `Dados inválidos em "${c}".` };
    const validos = lista.filter((i) => i && typeof i === 'object' && typeof i.id === 'string' && i.id && !i.id.includes('/'));
    dados[c] = c === 'atividades' ? validos.map((a) => ({ ...a, horarios: Array.isArray(a.horarios) ? a.horarios : [] })) : validos;
    resumo[c] = dados[c].length;
  }
  return { ok: true, backup: { ...obj, dados }, resumo };
}

// Importa mesclando por id (itens com o mesmo id são substituídos; nada é apagado).
export async function importarBackup(user, backup) {
  let total = 0;
  for (const c of COLECOES) {
    const lista = backup.dados[c] || [];
    total += lista.length;
    if (user) {
      for (let i = 0; i < lista.length; i += 400) {
        const lote = writeBatch(db);
        lista.slice(i, i + 400).forEach((item) => lote.set(doc(db, 'users', user.uid, c, item.id), item));
        await lote.commit();
      }
    } else {
      const atuais = lerLocal(c);
      const mapa = new Map(atuais.map((i) => [i.id, i]));
      lista.forEach((i) => mapa.set(i.id, i));
      localStorage.setItem(CHAVE_LOCAL[c], JSON.stringify([...mapa.values()]));
    }
  }
  return total;
}
