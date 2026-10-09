import { IconTenedor, IconTicket, IconHoja, IconEnsalada } from './iconos';
import { CATEGORIAS_COLOR } from '../utils/formato';

const CATEGORIAS = [
  { nombre: 'Principal', Icono: IconTenedor },
  { nombre: 'JUNAEB', Icono: IconTicket },
  { nombre: 'Vegetariano', Icono: IconHoja },
  { nombre: 'Hipocalórico', Icono: IconEnsalada },
];

export default function CategoriaTabs({ categoriaActiva, onSeleccionar }) {
  return (
    <div className="tabs">
      {CATEGORIAS.map(({ nombre, Icono }) => {
        const activa = categoriaActiva === nombre;
        const color = (CATEGORIAS_COLOR[nombre] || CATEGORIAS_COLOR.Principal).color;
        return (
          <button
            key={nombre}
            className={`tab ${activa ? 'active' : ''}`}
            style={activa ? { background: color, color: '#fff' } : undefined}
            onClick={() => onSeleccionar(nombre)}
          >
            <Icono className="tab-icon" width={18} height={18} />
            {nombre.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}