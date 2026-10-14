import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { pedir } from '../api/cliente';
import { useAuth } from '../context/auth-context';

const EstudianteContext = createContext(null);

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

export function EstudianteProvider({ children }) {
  const { usuario } = useAuth();
  const [perfil, setPerfil] = useState({ alergias: [], favoritos: [], calificaciones: [], categoria_preferida: null });

  const esEstudiante = usuario?.rol === 'Estudiante';

  const cargar = useCallback(async () => {
    if (!esEstudiante) {
      setPerfil({ alergias: [], favoritos: [], calificaciones: [] });
      return;
    }
    try {
      const datos = await pedir('/api/estudiante/perfil');
      setPerfil(datos);
    } catch {
      setPerfil({ alergias: [], favoritos: [], calificaciones: [] });
    }
  }, [esEstudiante]);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    const handler = () => cargar();
    window.addEventListener('estudiante-perfil-actualizado', handler);
    return () => window.removeEventListener('estudiante-perfil-actualizado', handler);
  }, [cargar]);

  const calificacionDe = useCallback(
    (id) => perfil.calificaciones.find((c) => c.id_preparacion === id) || null,
    [perfil]
  );

  const guardarCalificacion = useCallback(async (id, estrellas, comentario) => {
    await pedir(`/api/estudiante/calificaciones/${id}`, { metodo: 'PUT', cuerpo: { estrellas, comentario } });
    await cargar();
  }, [cargar]);

  const quitarCalificacion = useCallback(async (id) => {
    await pedir(`/api/estudiante/calificaciones/${id}`, { metodo: 'DELETE' });
    await cargar();
  }, [cargar]);

  const marcarFavorito = useCallback(async (id) => {
    await pedir(`/api/estudiante/favoritos/${id}`, { metodo: 'PUT' });
    await cargar();
  }, [cargar]);

  const quitarFavorito = useCallback(async (id) => {
    await pedir(`/api/estudiante/favoritos/${id}`, { metodo: 'DELETE' });
    await cargar();
  }, [cargar]);

    const guardarCategoriaPreferida = useCallback(async (categoria) => {
    await pedir('/api/estudiante/categoria-preferida', { metodo: 'PUT', cuerpo: { categoria } });
    await cargar();
  }, [cargar]);

  const valor = {
    usuario,
    alergias: perfil.alergias,
    favoritos: perfil.favoritos,
    calificaciones: perfil.calificaciones,
    categoriaPreferida: perfil.categoria_preferida,
    calificacionDe,
    guardarCalificacion,
    quitarCalificacion,
    marcarFavorito,
    quitarFavorito,
    guardarCategoriaPreferida,
  };

  return <EstudianteContext.Provider value={valor}>{children}</EstudianteContext.Provider>;
}