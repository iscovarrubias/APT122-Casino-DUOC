import { useEstudiante } from '../utils/estudiante';
import { Heart } from 'lucide-react';

export default function BotonFavorito({ idPreparacion, nombre }) {
  const { usuario, favoritos, marcarFavorito, quitarFavorito } = useEstudiante();
  if (!usuario || usuario.rol !== 'Estudiante') return null;

  const esFavorito = favoritos.some((f) => f.id_preparacion === idPreparacion);

  const alternar = async () => {
    try {
      if (esFavorito) await quitarFavorito(idPreparacion);
      else await marcarFavorito(idPreparacion);
    } catch {
    }
  };

  return (
    <button
      type="button"
      className={`boton-icono ${esFavorito ? 'activo' : ''}`}
      onClick={alternar}
      aria-pressed={esFavorito}
      aria-label={esFavorito ? `Quitar ${nombre} de favoritos` : `Marcar ${nombre} como favorito`}
      title={esFavorito ? 'Quitar de favoritos' : 'Marcar como favorito'}
    >
      <Heart size={20} fill={esFavorito ? 'currentColor' : 'none'} />
    </button>
  );
}