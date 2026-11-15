import { useSyncExternalStore } from 'react';

// Filtros da lista de exercícios compartilhados entre a biblioteca e o "Adicionar exercício" do treino:
// mexer em um muda o outro. Ficam só na memória (somem ao recarregar o app).
let estado = { busca: '', cats: [], eqps: [] };
const ouvintes = new Set();
const assinar = (f) => { ouvintes.add(f); return () => ouvintes.delete(f); };
const ler = () => estado;
const mudar = (parcial) => { estado = { ...estado, ...parcial }; ouvintes.forEach((f) => f()); };

export default function useFiltrosExercicios() {
  const f = useSyncExternalStore(assinar, ler, ler);
  const alternar = (campo, v) => mudar({ [campo]: f[campo].includes(v) ? f[campo].filter((x) => x !== v) : [...f[campo], v] });
  return { ...f, setBusca: (busca) => mudar({ busca }), alternarCat: (c) => alternar('cats', c), alternarEqp: (e) => alternar('eqps', e), limpar: () => mudar({ busca: '', cats: [], eqps: [] }) };
}
