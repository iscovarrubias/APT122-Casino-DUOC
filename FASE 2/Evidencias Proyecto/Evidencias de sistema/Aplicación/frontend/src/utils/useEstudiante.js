import { useContext } from 'react';
import { EstudianteContext } from './estudiante-context';

export function useEstudiante() {
  const ctx = useContext(EstudianteContext);
  return ctx || {
    usuario: null,
    alergias: [],
    favoritos: [],
    calificaciones: [],
    categoriaPreferida: null,
    calificacionDe: () => null,
    guardarCalificacion: () => {},
    quitarCalificacion: () => {},
    marcarFavorito: () => {},
    quitarFavorito: () => {},
    guardarCategoriaPreferida: () => {},
  };
}
