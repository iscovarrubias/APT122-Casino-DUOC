import TarjetaPreparacion from './TarjetaPreparacion';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import Ayuda from '../../components/Ayuda';

export default function Columna({ titulo, ayuda, textoBoton, lista, soloActivas, onNuevo, onEditar, onEstado, onBorrar, onSinBorrar }) {
  const [busqueda, setBusqueda] = useState('');
  const visibles = lista.filter((p) => (!soloActivas || p.activa) && p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
  return (
    <section className="prep-columna">
      <div className="prep-columna-cabeza">
        <div>
          <h2>
            {titulo}
            <Ayuda titulo={titulo}>{ayuda}</Ayuda>
          </h2>
        </div>
        <button className="boton boton-primario boton-con-icono" onClick={onNuevo}>
          <Plus size={16} aria-hidden="true" />
          {textoBoton}
        </button>
      </div>
      <input
        type="search"
        className="prep-buscar"
        placeholder={`Buscar en ${titulo.toLowerCase()}`}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        aria-label={`Buscar en ${titulo.toLowerCase()}`}
      />
      <div className="prep-lista">
        {visibles.length === 0 && (
          <div className="v2-vacio-fila">{lista.length === 0 ? 'Aún no hay registros.' : 'Ninguno coincide con la búsqueda.'}</div>
        )}
        {visibles.map((p) => (
          <TarjetaPreparacion
            key={p.id_preparacion}
            p={p}
            onEditar={onEditar}
            onEstado={onEstado}
            onBorrar={onBorrar}
            onSinBorrar={onSinBorrar}
          />
        ))}
      </div>
    </section>
  );
}
