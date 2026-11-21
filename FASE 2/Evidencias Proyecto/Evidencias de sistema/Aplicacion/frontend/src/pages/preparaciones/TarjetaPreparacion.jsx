import { useState, useEffect, useRef } from 'react';
import { Ellipsis } from 'lucide-react';
import ImagenOIcono from '../../components/ImagenOIcono';
import { estadoNutricion } from './formulario';
import { COLORES_TIPO, esPlato } from './formulario';

export default function TarjetaPreparacion({ p, onEditar, onEstado, onBorrar, onSinBorrar }) {
  const nut = estadoNutricion(p);
  const [expandida, setExpandida] = useState(false);
  const [menu, setMenu] = useState(false);
  const refMenu = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const fuera = (e) => {
      if (refMenu.current && !refMenu.current.contains(e.target)) setMenu(false);
    };
    const tecla = (e) => {
      if (e.key === 'Escape') setMenu(false);
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [menu]);

  return (
    <article
      className={`prep-card ${p.activa ? '' : 'prep-inactiva'} ${expandida ? 'prep-expandida' : ''}`}
      style={{ '--acento': COLORES_TIPO[p.tipo] || '#1F3864' }}
    >
      <div className="prep-cabeza">
        <button
          type="button"
          className="prep-cabeza-boton"
          onClick={() => setExpandida(!expandida)}
          aria-expanded={expandida}
          title={expandida ? 'Ocultar detalle' : 'Ver detalle'}
        >
          <div className="prep-miniatura" aria-hidden="true">
            <ImagenOIcono url={p.imagen_url} tipo={p.tipo || 'Plato Principal'} tamano={24} className="prep-miniatura-img" />
          </div>
          <div className="prep-cabeza-info">
            <strong>{p.nombre}</strong>
            <div className="prep-cabeza-tags">
              {p.base_nombre && <span title={`Variación de ${p.base_nombre}`}>Variación de {p.base_nombre}</span>}
              {!esPlato(p) && <span>{p.tipo}</span>}
              {!p.activa && <span>Desactivada</span>}
              {nut.faltante ? (
                <span className="prep-alerta">Sin información nutricional</span>
              ) : (
                <span title={nut.texto}>{Math.round(p.nutricion.calorias)} kcal</span>
              )}
            </div>
          </div>
        </button>

        <div className="prep-acciones">
          <button type="button" className="boton-texto" onClick={() => onEditar(p)} aria-label={`Editar ${p.nombre}`}>
            Editar
          </button>
          <div className="prep-menu" ref={refMenu}>
            <button
              type="button"
              className="prep-icono"
              onClick={() => setMenu(!menu)}
              aria-haspopup="menu"
              aria-expanded={menu}
              title="Más acciones"
              aria-label={`Más acciones de ${p.nombre}`}
            >
              <Ellipsis size={18} />
            </button>
            {menu && (
              <div className="prep-menu-lista" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    setExpandida(!expandida);
                  }}
                >
                  {expandida ? 'Ocultar detalle' : 'Ver detalle'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    onEstado(p);
                  }}
                >
                  {p.activa ? 'Desactivar' : 'Reactivar'}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="prep-menu-peligro"
                  onClick={() => {
                    setMenu(false);
                    if (p.activa) onSinBorrar(p);
                    else onBorrar(p);
                  }}
                >
                  Borrar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {expandida && (
        <div className="prep-detalle">
          {p.ingredientes.length > 0 && (
            <div className="texto-suave" style={{ margin: 0 }}>
              {p.ingredientes.join(', ')}
            </div>
          )}
          <div className="prep-meta">
            <span className="texto-suave" style={{ margin: 0 }}>
              {p.alergenos.length ? `Alérgenos: ${p.alergenos.join(', ')}` : 'Sin alérgenos declarados'}
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
