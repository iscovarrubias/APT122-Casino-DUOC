import { useState, useEffect } from 'react';
import ModalFormulario from './ModalFormulario';
import { obtenerMenuHoy } from '../api/menu';

const TIPOS = ['Ensalada', 'Sopa', 'Pan', 'Postre', 'Fruta', 'Bebida'];
const CATEGORIAS = ['General', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];

export default function ModalAcompanamientoEspecial({ fecha, preparaciones, onCerrar, onCreado }) {
  const [categoria, setCategoria] = useState('');
  const [tipo, setTipo] = useState('');
  const [idPreparacion, setIdPreparacion] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [composicion, setComposicion] = useState(null);

  useEffect(() => {
    obtenerMenuHoy(null, fecha)
      .then((d) => setComposicion(d.composicion || {}))
      .catch(() => setComposicion({}));
  }, [fecha]);

  const tiposDisponibles = categoria && composicion?.[categoria]
    ? composicion[categoria].map((r) => r.tipo)
    : [];

  const activas = tipo
    ? preparaciones.filter((p) => p.activa && p.tipo === tipo)
    : [];

  async function enviar(e) {
    e.preventDefault();
    setError(null);
    if (!categoria) return setError('Elige la categoría del menú.');
    if (!tipo) return setError('Elige el tipo de acompañamiento.');
    if (!idPreparacion) return setError('Elige la preparación.');
    if (!cantidad || !Number.isInteger(Number(cantidad)) || Number(cantidad) < 0) {
      return setError('La cantidad debe ser un entero mayor o igual a 0.');
    }
    setGuardando(true);
    try {
      await onCreado({
        tipo_componente: tipo,
        categoria,
        id_preparacion: Number(idPreparacion),
        cantidad_planificada: Number(cantidad),
      });
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <ModalFormulario
      titulo="Acompañamiento especial"
      ancho="medio"
      onSubmit={enviar}
      onCancelar={onCerrar}
      guardando={guardando}
      textoGuardar="Crear especial"
      error={error}
      onCerrarError={() => setError(null)}
    >
      <div className="v2 v2-formulario">
        <p className="texto-suave" style={{ margin: 0 }}>
          Crea un acompañamiento distinto para una categoría. Reemplaza al compartido solo en esa categoría, por ejemplo agua mineral como bebida sin azúcar de JUNAEB.
        </p>

        <label className="campo"><span>Categoría</span>
          <select value={categoria} onChange={(e) => { setCategoria(e.target.value); setTipo(''); setIdPreparacion(''); }}>
            <option value="">Elegir categoría</option>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        {categoria && (
          <label className="campo"><span>Tipo de acompañamiento</span>
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setIdPreparacion(''); }}>
              <option value="">Elegir tipo</option>
              {TIPOS.filter((t) => tiposDisponibles.includes(t)).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            {tiposDisponibles.length === 0 && (
              <span className="texto-suave">Esta categoría no acepta acompañamientos compartidos.</span>
            )}
          </label>
        )}

        {tipo && (
          <label className="campo"><span>Preparación</span>
            <select value={idPreparacion} onChange={(e) => setIdPreparacion(e.target.value)}>
              <option value="">Elegir preparación</option>
              {activas.map((p) => <option key={p.id_preparacion} value={p.id_preparacion}>{p.nombre}</option>)}
            </select>
          </label>
        )}

        {idPreparacion && (
          <label className="campo"><span>Cantidad</span>
            <input type="number" min="0" step="1" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          </label>
        )}
      </div>
    </ModalFormulario>
  );
}