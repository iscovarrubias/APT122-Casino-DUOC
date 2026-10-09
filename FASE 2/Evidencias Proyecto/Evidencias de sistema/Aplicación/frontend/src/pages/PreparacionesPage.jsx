import { useState, useEffect, useCallback } from 'react';
import {
  listarPreparaciones, listarCatalogoAlergenos, listarTiposComponente, crearPreparacion,
  actualizarPreparacion, desactivarPreparacion, reactivarPreparacion, eliminarPreparacion,
  asignarAlergenos, guardarNutricion, subirImagen,
} from '../api/gestion';
import { formatearPrecio } from '../utils/formato';

const FORMULARIO_VACIO = {
  nombre: '', descripcion: '', precio: '', imagen_url: '', ingredientes: '',
  alergenos: [], calorias: '', proteinas_g: '', carbohidratos_g: '', grasas_g: '',
  fuente: '', validado: false, tipo: '',
};

function desdePreparacion(p) {
  const n = p.nutricion;
  return {
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    precio: String(Number(p.precio)),
    imagen_url: p.imagen_url || '',
    ingredientes: (p.ingredientes || []).join(', '),
    alergenos: p.alergenos || [],
    calorias: n?.calorias != null ? String(n.calorias) : '',
    proteinas_g: n?.proteinas_g != null ? String(n.proteinas_g) : '',
    carbohidratos_g: n?.carbohidratos_g != null ? String(n.carbohidratos_g) : '',
    grasas_g: n?.grasas_g != null ? String(n.grasas_g) : '',
    fuente: n?.fuente || '',
    validado: !!n?.validado,
    tipo: p.tipo || '',
  };
}

const aNumeroONulo = (texto) => (texto.trim() === '' ? null : Number(texto));

function estadoNutricion(p) {
  if (!p.nutricion) return { texto: 'Sin datos', clase: 'insignia-neutra' };
  return p.nutricion.validado
    ? { texto: 'Validada', clase: 'insignia-ok' }
    : { texto: 'Pendiente de validar', clase: 'insignia-aviso' };
}

const TIPOS_ACOMPANAMIENTO = ['Entrada', 'Postre', 'Bebida'];

function Formulario({ editando, esAcompanamiento, catalogo, onCancelar, onGuardado }) {
  const [datos, setDatos] = useState(editando ? desdePreparacion(editando) : FORMULARIO_VACIO);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);

  const poner = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });

  function alternarAlergeno(nombre) {
    const ya = datos.alergenos.includes(nombre);
    setDatos({ ...datos, alergenos: ya ? datos.alergenos.filter((a) => a !== nombre) : [...datos.alergenos, nombre] });
  }

  const hayNutricion = ['calorias', 'proteinas_g', 'carbohidratos_g', 'grasas_g', 'fuente'].some((c) => datos[c].trim() !== '');

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);

    if (!datos.nombre.trim()) return setError('El nombre es obligatorio.');
    if (!esAcompanamiento) {
      if (datos.precio.trim() === '' || isNaN(Number(datos.precio)) || Number(datos.precio) < 0) {
        return setError('El precio es obligatorio y debe ser un número mayor o igual a 0.');
      }
    } else {
      if (!datos.tipo) return setError('Elige el tipo de acompañamiento (Entrada, Postre o Bebida).');
    }
    if (datos.validado && datos.calorias.trim() === '') {
      return setError('Para marcar la información nutricional como validada, ingresa al menos las calorías.');
    }

    setGuardando(true);
    try {
      const base = {
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim(),
        precio: esAcompanamiento ? 0 : Number(datos.precio),
        imagen_url: datos.imagen_url.trim(),
        ingredientes: datos.ingredientes.split(',').map((i) => i.trim()).filter(Boolean),
        tipo: (esAcompanamiento || editando) ? (datos.tipo || null) : undefined,
      };
      const guardada = editando
        ? await actualizarPreparacion(editando.id_preparacion, base)
        : await crearPreparacion(base);

      await asignarAlergenos(guardada.id_preparacion, datos.alergenos);

      if (hayNutricion || editando?.nutricion) {
        await guardarNutricion(guardada.id_preparacion, {
          calorias: aNumeroONulo(datos.calorias),
          proteinas_g: aNumeroONulo(datos.proteinas_g),
          carbohidratos_g: aNumeroONulo(datos.carbohidratos_g),
          grasas_g: aNumeroONulo(datos.grasas_g),
          fuente: datos.fuente.trim(),
          validado: datos.validado && datos.calorias.trim() !== '',
        });
      }
      onGuardado(editando ? 'Preparación actualizada.' : 'Preparación creada.');
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

    async function subirArchivo(evento) {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    setError(null);
    setSubiendo(true);
    try {
      const { imagen_url } = await subirImagen(archivo);
      setDatos((d) => ({ ...d, imagen_url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
      evento.target.value = ''; 
    }
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label={editando ? 'Editar preparación' : 'Nueva preparación'}>
      <form className="modal formulario" onSubmit={enviar}>
        <h2>
          {editando
            ? 'Editar preparación'
            : esAcompanamiento
              ? 'Nuevo acompañamiento'
              : 'Nueva preparación'}
        </h2>

        <div className="rejilla-2">
          <label className="campo">
            <span>Nombre</span>
            <input value={datos.nombre} onChange={poner('nombre')} required />
          </label>
          {!esAcompanamiento && (
            <label className="campo">
              <span>Precio (CLP)</span>
              <input type="number" min="0" step="1" value={datos.precio} onChange={poner('precio')} required />
            </label>
          )}
          {(esAcompanamiento || editando) && (
            <label className="campo">
              <span>Tipo de componente</span>
              <select value={datos.tipo} onChange={poner('tipo')} required={esAcompanamiento}>
                <option value="">
                  {esAcompanamiento ? 'Elegir tipo' : 'Sin tipo (plato principal)'}
                </option>
                {TIPOS_ACOMPANAMIENTO.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {!esAcompanamiento && (
                <span className="texto-suave">
                  Deja sin tipo si es un plato principal: aparecerá en las cuatro categorías.
                </span>
              )}
            </label>
          )}
        </div>

        <label className="campo">
          <span>Descripción</span>
          <textarea rows="2" value={datos.descripcion} onChange={poner('descripcion')} />
        </label>

        <label className="campo">
          <span>Ingredientes (separados por coma)</span>
          <input value={datos.ingredientes} onChange={poner('ingredientes')} placeholder="Zapallo, papa, choclo" />
        </label>

        <fieldset className="grupo">
          <legend>Foto (opcional)</legend>

          {datos.imagen_url ? (
            <div className="foto-actual">
              <img src={datos.imagen_url} alt="" className="preview-foto" />
              <button
                type="button"
                className="boton boton-peligro"
                onClick={() => setDatos({ ...datos, imagen_url: '' })}
                disabled={subiendo}
              >
                Quitar foto
              </button>
            </div>
          ) : (
            <p className="texto-suave">Sin foto. Sube un archivo o pega un enlace.</p>
          )}

          <label className="campo">
            <span>Subir desde el dispositivo</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={subirArchivo}
              disabled={subiendo || guardando}
            />
            <span className="texto-suave">JPG, PNG, WEBP o GIF. Máximo 3 MB.</span>
          </label>

          {subiendo && <span className="texto-suave">Subiendo…</span>}

          <label className="campo">
            <span>O pega un enlace</span>
            <input
              type="url"
              value={datos.imagen_url}
              onChange={poner('imagen_url')}
              placeholder="https://"
              disabled={subiendo || guardando}
            />
          </label>
        </fieldset>

        <fieldset className="grupo">
          <legend>Alérgenos declarados</legend>
          <div className="checks">
            {catalogo.map((a) => (
              <label key={a.id_alergeno} className="campo-check">
                <input type="checkbox" checked={datos.alergenos.includes(a.nombre)} onChange={() => alternarAlergeno(a.nombre)} />
                <span>{a.nombre}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="grupo">
          <legend>Información nutricional (por porción)</legend>
          <div className="rejilla-4">
            <label className="campo"><span>Calorías (kcal)</span>
              <input type="number" min="0" step="0.1" value={datos.calorias} onChange={poner('calorias')} /></label>
            <label className="campo"><span>Proteínas (g)</span>
              <input type="number" min="0" step="0.1" value={datos.proteinas_g} onChange={poner('proteinas_g')} /></label>
            <label className="campo"><span>Carbohidratos (g)</span>
              <input type="number" min="0" step="0.1" value={datos.carbohidratos_g} onChange={poner('carbohidratos_g')} /></label>
            <label className="campo"><span>Grasas (g)</span>
              <input type="number" min="0" step="0.1" value={datos.grasas_g} onChange={poner('grasas_g')} /></label>
          </div>
          <label className="campo">
            <span>Fuente del dato</span>
            <input value={datos.fuente} onChange={poner('fuente')} placeholder="Ej.: Nutricionista del casino" />
          </label>
          <label className="campo-check">
            <input
              type="checkbox" checked={datos.validado}
              onChange={(e) => setDatos({ ...datos, validado: e.target.checked })}
              disabled={datos.calorias.trim() === ''}
            />
            <span>Validada por la nutricionista. Solo así se muestra a los estudiantes; si no, ven "No disponible".</span>
          </label>
        </fieldset>

        {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}

        <div className="modal-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCancelar} disabled={guardando}>Cancelar</button>
          <button type="submit" className="boton boton-primario" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar preparación'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PreparacionesPage() {
  const [lista, setLista] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [soloActivas, setSoloActivas] = useState(false);
  const [formulario, setFormulario] = useState(null); 
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [prep, alerg] = await Promise.all([listarPreparaciones(), listarCatalogoAlergenos()]);
      setLista(prep);
      setCatalogo(alerg);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function cambiarEstado(p) {
    const desactivar = p.activa;
    if (desactivar && !window.confirm(`¿Desactivar "${p.nombre}"? Dejará de poder planificarse, pero se conserva su historial. Puedes reactivarla cuando quieras.`)) return;
    try {
      await (desactivar ? desactivarPreparacion(p.id_preparacion) : reactivarPreparacion(p.id_preparacion));
      setAviso(desactivar ? 'Preparación desactivada.' : 'Preparación reactivada.');
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

    async function borrar(p) {
    if (!window.confirm(
      `¿Borrar "${p.nombre}" definitivamente? Esta acción no se puede deshacer. ` +
      'Si ya apareció en algún menú, el sistema no permitirá el borrado y habrá que dejarla desactivada.'
    )) return;
    try {
      await eliminarPreparacion(p.id_preparacion);
      setAviso('Preparación borrada.');
      setError(null);
      cargar();
    } catch (err) {
      setError(err.message);
      setAviso(null);
    }
  }

  const visibles = (lista || []).filter(
    (p) => (!soloActivas || p.activa) && p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase())
  );

  return (
    <>
      <div className="barra-herramientas">
        <div className="barra-estado">
          <label className="campo campo-en-linea">
            <span>Buscar</span>
            <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </label>
          <label className="campo-check">
            <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} />
            <span>Ocultar desactivadas</span>
          </label>
        </div>
        <div className="barra-estado">
          <button
            className="boton boton-secundario"
            onClick={() => { setAviso(null); setFormulario('acompanamiento'); }}
          >
            Nuevo acompañamiento
          </button>
          <button
            className="boton boton-primario"
            onClick={() => { setAviso(null); setFormulario('nueva'); }}
          >
            Nueva preparación
          </button>
        </div>
      </div>

      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      {aviso && <div className="mensaje mensaje-ok" role="status">{aviso}</div>}
      {!lista && !error && <div className="estado-info">Cargando preparaciones…</div>}

      {lista && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr><th>Preparación</th><th>Precio</th><th>Alérgenos</th><th>Información nutricional</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr><td colSpan="6" className="celda-vacia">
                  {lista.length === 0 ? 'Aún no hay preparaciones. Crea la primera con "Nueva preparación".' : 'Ninguna preparación coincide con la búsqueda.'}
                </td></tr>
              )}
              {visibles.map((p) => {
                const nut = estadoNutricion(p);
                return (
                  <tr key={p.id_preparacion} className={p.activa ? '' : 'fila-inactiva'}>
                    <td>
                      <strong>{p.nombre}</strong>
                      {p.tipo && <span className="insignia insignia-neutra" style={{ marginLeft: 8 }}>{p.tipo}</span>}
                      {p.ingredientes.length > 0 && <div className="texto-suave">{p.ingredientes.join(', ')}</div>}
                    </td>
                    <td>
                      {Number(p.precio) === 0
                        ? <span className="texto-suave">Incluido en el combo</span>
                        : formatearPrecio(p.precio)}
                    </td>
                    <td>{p.alergenos.length ? p.alergenos.join(', ') : <span className="texto-suave">Ninguno declarado</span>}</td>
                    <td><span className={`insignia ${nut.clase}`}>{nut.texto}</span></td>
                    <td><span className={`insignia ${p.activa ? 'insignia-ok' : 'insignia-neutra'}`}>{p.activa ? 'Activa' : 'Desactivada'}</span></td>
                    <td className="celda-acciones">
                      <button className="boton boton-secundario" onClick={() => { setAviso(null); setFormulario(p); }}>Editar</button>
                      <button className={`boton ${p.activa ? 'boton-peligro' : 'boton-secundario'}`} onClick={() => cambiarEstado(p)}>
                        {p.activa ? 'Desactivar' : 'Reactivar'}
                      </button>
                      {!p.activa && (
                        <button className="boton boton-peligro" onClick={() => borrar(p)}>
                          Borrar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formulario && (
        <Formulario
          editando={formulario === 'nueva' || formulario === 'acompanamiento' ? null : formulario}
          esAcompanamiento={formulario === 'acompanamiento'}
          catalogo={catalogo}
          onCancelar={() => setFormulario(null)}
          onGuardado={(mensaje) => { setFormulario(null); setAviso(mensaje); cargar(); }}
        />
      )}
    </>
  );
}
