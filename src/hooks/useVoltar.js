import { useEffect, useRef } from 'react';
import { voltarGlobal } from '../utils/voltar';

// useVoltar(aberto, fechar): enquanto "aberto" for verdadeiro, o botão voltar do celular chama "fechar".
export default function useVoltar(aberto, fechar) {
  const ref = useRef(fechar);
  ref.current = fechar;
  useEffect(() => {
    if (!aberto) return undefined;
    const v = voltarGlobal();
    if (!v) return undefined;
    return v.registrar(() => ref.current && ref.current());
  }, [aberto]);
}
