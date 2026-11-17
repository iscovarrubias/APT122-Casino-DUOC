import { createContext, useContext } from 'react';

export const ConfirmacionContext = createContext(null);

export function useConfirmar() {
  const confirmar = useContext(ConfirmacionContext);
  if (!confirmar) throw new Error('useConfirmar debe usarse dentro de ConfirmacionProvider.');
  return confirmar;
}
