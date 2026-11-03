import { UtensilsCrossed, Ticket, Leaf, Salad } from 'lucide-react';
import { CATEGORIAS_COLOR, colorTextoSobre } from '../utils/formato';

const CATEGORIAS = [
  { nombre: 'Principal', Icono: UtensilsCrossed },
  { nombre: 'JUNAEB', Icono: Ticket },
  { nombre: 'Vegetariano', Icono: Leaf },
  { nombre: 'Hipocalórico', Icono: Salad },
];

const ETIQUETA_ESTADO = { agotado: 'agotado', cerrada: 'cerrado' };

export default function CategoriaTabs({ categoriaActiva, onSeleccionar, estados = {} }) {
  return (
    <div className="tabs">
      {CATEGORIAS.map(({ nombre, Icono }) => {
        const activa = categoriaActiva === nombre;
        const color = (CATEGORIAS_COLOR[nombre] || CATEGORIAS_COLOR.Principal).color;
        const estado = estados[nombre];
        const agotada = Boolean(estado);
        return (
          <button
            key={nombre}
            className={`tab ${activa ? 'active' : ''} ${agotada ? 'tab-agotada' : ''}`}
            style={activa && !agotada ? { background: color, color: colorTextoSobre(color) } : undefined}
            aria-label={agotada ? `${nombre} (${ETIQUETA_ESTADO[estado]})` : undefined}
            onClick={() => onSeleccionar(nombre)}
          >
            <Icono className="tab-icon" size={18} />
            {nombre}
          </button>
        );
      })}
    </div>
  );
}