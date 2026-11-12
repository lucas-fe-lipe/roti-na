import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

// Links de GIF/imagem de cada exercício. Coleção "biblioteca" do Firestore: todos leem, só o administrador escreve.
// Sem conexão ou sem regra publicada, simplesmente não há mídia (o app continua funcionando).
export default function useBiblioteca() {
  const [midias, setMidias] = useState({});
  useEffect(() => {
    try {
      return onSnapshot(
        collection(db, 'biblioteca'),
        (snap) => {
          const r = {};
          snap.forEach((d) => { if (d.data().midia) r[d.id] = d.data().midia; });
          setMidias(r);
        },
        (e) => console.warn('Biblioteca de exercícios (mídias):', e?.code || e)
      );
    } catch (e) {
      console.warn('Biblioteca de exercícios (mídias):', e);
    }
  }, []);
  return midias;
}
