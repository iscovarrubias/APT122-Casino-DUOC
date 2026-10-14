import { UtensilsCrossed, Ticket, Leaf, Salad } from 'lucide-react';
import { CATEGORIAS_COLOR } from '../utils/formato';

const CATEGORIAS = [
  { nombre: 'Principal', Icono: UtensilsCrossed },
  { nombre: 'JUNAEB', Icono: Ticket },
  { nombre: 'Vegetariano', Icono: Leaf },
  { nombre: 'Hipocalórico', Icono: Salad },
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
          <Icono className="tab-icon" size={18} />
            {nombre.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}