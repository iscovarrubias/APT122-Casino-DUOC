import { navegar } from '../ruteo/useRuta';
import { Compass } from 'lucide-react';

export default function NoEncontrada({ rutaInicio = '/' }) {
  return (
    <main className="no-encontrada">
      <Compass size={44} aria-hidden="true" />
      <h1>No encontramos esta página</h1>
      <p>La dirección no existe o cambió. Vuelve al menú del día para seguir.</p>
      <button type="button" className="boton boton-primario" onClick={() => navegar(rutaInicio)}>Ir al menú del día</button>
    </main>
  );
}
