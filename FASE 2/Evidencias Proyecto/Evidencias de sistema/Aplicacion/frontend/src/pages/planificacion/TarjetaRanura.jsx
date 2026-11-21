import { useState, useEffect } from 'react';
import { ordenarConVariaciones } from '../../utils/formato';
import { BarChart3, Trash2, BookOpen } from 'lucide-react';
import { aTexto, claveRanura } from './utilidades';

export default function TarjetaRanura({
  titulo,
  subtitulo,
  Icono,
  color,
  esPlato,
  tipo,
  categoria,
  componente,
  preparaciones,
  precioSugerido,
  sugerencia,
  dia,
  ocupado,
  onGuardar,
  onQuitar,
  onCambio,
  onVerReceta,
  preseleccion,
}) {
  const precioActual = aTexto(componente?.precio);
  const [idPreparacion, setIdPreparacion] = useState(componente ? String(componente.id_preparacion) : '');
  const clave = claveRanura(esPlato ? 'Plato Principal' : tipo, categoria);

  useEffect(() => {
    if (preseleccion && preseleccion.clave === clave) setIdPreparacion(String(preseleccion.id));
  }, [preseleccion, clave]);
  const [cantidad, setCantidad] = useState(componente ? String(componente.cantidad_planificada) : '');
  const [precio, setPrecio] = useState(componente ? precioActual : aTexto(precioSugerido));

  useEffect(() => {
    if (onCambio)
      onCambio({ tipo: esPlato ? 'Plato Principal' : tipo, categoria, idPreparacion, cantidad, precio: esPlato ? precio : undefined });
  }, [idPreparacion, cantidad, precio, tipo, categoria, esPlato, onCambio]);

  const activas = ordenarConVariaciones(
    preparaciones.filter((p) => p.activa && (esPlato ? !p.tipo || p.tipo === 'Plato Principal' : p.tipo === tipo))
  );
  const elegida = preparaciones.find((p) => String(p.id_preparacion) === idPreparacion) || null;
  const actual =
    componente && !activas.some((p) => p.id_preparacion === componente.id_preparacion)
      ? { id_preparacion: componente.id_preparacion, nombre: `${componente.preparacion} (desactivada)` }
      : null;

  const precioInvalido = esPlato && (precio === '' || isNaN(Number(precio)) || Number(precio) < 0);
  const incompleta = !idPreparacion || cantidad === '' || !Number.isInteger(Number(cantidad)) || Number(cantidad) < 0 || precioInvalido;
  const sinCambios =
    componente &&
    String(componente.id_preparacion) === idPreparacion &&
    String(componente.cantidad_planificada) === cantidad &&
    (!esPlato || precioActual === precio);

  return (
    <article className="plan-card" style={{ '--acento': color }}>
      <header className="plan-card-cabeza">
        <Icono size={18} />
        <div className="plan-card-cabeza-info">
          <span className="plan-card-titulo">{titulo}</span>
          {subtitulo && <span className="plan-card-subtitulo">{subtitulo}</span>}
        </div>
        {componente && <span className="plan-card-estado">Cargado</span>}
      </header>
      <div className="plan-card-cuerpo">
        <div className="campo">
          <div className="plan-campo-cabeza">
            <span>{esPlato ? 'Plato' : tipo}</span>
            {onVerReceta && (
              <button
                type="button"
                className="plan-ver-receta"
                disabled={!elegida}
                onClick={() => onVerReceta(elegida, clave)}
                aria-label={`Ver receta de ${titulo}`}
              >
                <BookOpen size={13} aria-hidden="true" /> Ver receta
              </button>
            )}
          </div>
          <select value={idPreparacion} onChange={(e) => setIdPreparacion(e.target.value)} aria-label={`Preparación para ${titulo}`}>
            <option value="">Elegir preparación</option>
            {actual && <option value={actual.id_preparacion}>{actual.nombre}</option>}
            {activas.map((p) => (
              <option key={p.id_preparacion} value={p.id_preparacion}>
                {p.esVariacion ? `↳ ${p.nombre}` : p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="plan-campos">
          <label className="campo">
            <span>{esPlato ? 'Cantidad planificada' : 'Cantidad'}</span>
            <input type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>
          {esPlato ? (
            <label className="campo">
              <span>Precio del combo (CLP)</span>
              <input type="number" min="0" step="1" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </label>
          ) : null}
        </div>
        {sugerencia && (
          <p
            className="plan-sugerencia"
            title={sugerencia.n != null ? `Rango probable: ${sugerencia.minimo}–${sugerencia.maximo}` : undefined}
          >
            <BarChart3 size={14} aria-hidden="true" />
            <span>
              <span>
                Sugerido: <strong>{sugerencia.sugerido}</strong>
              </span>
              {sugerencia.n != null && (
                <span className="texto-suave">
                  {sugerencia.base === 'mismo_dia'
                    ? `últimos ${sugerencia.n} ${/s$/.test(dia) ? dia : `${dia}s`}`
                    : `últimos ${sugerencia.n} días`}
                </span>
              )}
            </span>
            <button type="button" className="boton-texto plan-sugerencia-usar" onClick={() => setCantidad(String(sugerencia.sugerido))}>
              Usar
            </button>
          </p>
        )}
        <div className="plan-acciones">
          <button
            className="boton boton-primario"
            disabled={ocupado || incompleta || sinCambios}
            onClick={() =>
              onGuardar({
                tipo,
                categoria,
                componente,
                id_preparacion: Number(idPreparacion),
                cantidad: Number(cantidad),
                precio: esPlato ? Number(precio) : undefined,
              })
            }
          >
            {componente ? 'Guardar cambios' : 'Agregar'}
          </button>
          {componente && (
            <button
              type="button"
              className="plan-quitar"
              disabled={ocupado}
              onClick={() => onQuitar(componente)}
              aria-label={`Quitar ${titulo} del menú`}
              title="Quitar del menú"
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
