const CATEGORIAS = [
  { nombre: 'Principal', icono: '🍴' },
  { nombre: 'JUNAEB', icono: '🎫' },
  { nombre: 'Vegetariano', icono: '🥕' },
  { nombre: 'Hipocalórico', icono: '🥗' },
];

export default function CategoriaTabs({ categoriaActiva, onSeleccionar }) {
  return (
    <div className="tabs">
      {CATEGORIAS.map((c) => (
        <button
          key={c.nombre}
          className={`tab ${categoriaActiva === c.nombre ? 'active' : ''}`}
          onClick={() => onSeleccionar(c.nombre)}
        >
          <span className="tab-icon">{c.icono}</span>
          {c.nombre.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
