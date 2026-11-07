import { useState, useEffect, useCallback, useRef } from 'react';
import { Trash2, Ellipsis, Plus, Upload, Calculator } from 'lucide-react';
import ModalFormulario from '../components/ModalFormulario';
import ImagenOIcono from '../components/ImagenOIcono';
import {
  listarPreparaciones, listarCatalogoAlergenos, crearPreparacion,
  actualizarPreparacion, desactivarPreparacion, reactivarPreparacion, eliminarPreparacion,
  asignarAlergenos, guardarNutricion, subirImagen, listarIngredientes, calcularNutricionApi,
} from '../api/gestion';
import Mensaje from '../components/Mensaje';
import Ayuda from '../components/Ayuda';
import Cargando from '../components/Cargando';
import { useConfirmar } from '../context/confirmacion-context';

const FORMULARIO_VACIO = {
  nombre: '', descripcion: '', imagen_url: '', ingredientes: [], porciones_receta: '', origen: 'manual',
  alergenos: [], calorias: '', proteinas_g: '', carbohidratos_g: '', grasas_g: '',
  tipo: '',
};

function desdePreparacion(p) {
  const n = p.nutricion;
  return {
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    imagen_url: p.imagen_url || '',
    ingredientes: (p.ingredientes_detalle || []).map((i) => ({
      id_ingrediente: String(i.id_ingrediente),
      cantidad_g: i.cantidad_g != null ? String(Number(i.cantidad_g)) : '',
    })),
    porciones_receta: p.porciones_receta != null ? String(p.porciones_receta) : '',
    origen: n?.origen || 'manual',
    alergenos: p.alergenos || [],
    calorias: n?.calorias != null ? String(n.calorias) : '',
    proteinas_g: n?.proteinas_g != null ? String(n.proteinas_g) : '',
    carbohidratos_g: n?.carbohidratos_g != null ? String(n.carbohidratos_g) : '',
    grasas_g: n?.grasas_g != null ? String(n.grasas_g) : '',
    tipo: p.tipo || '',
  };
}

const aNumeroONulo = (texto) => (texto.trim() === '' ? null : Number(texto));

function estadoNutricion(p) {
  if (!p.nutricion || p.nutricion.calorias == null) return { texto: 'Sin información nutricional', faltante: true };
  return { texto: p.nutricion.origen === 'calculada' ? 'Nutrición calculada' : 'Nutrición ingresada' };
}

const TIPOS_ACOMPANAMIENTO = ['Entrada', 'Postre', 'Bebida'];

const FILA_VACIA = { id_ingrediente: '', cantidad_g: '' };
const MOTIVOS = { sin_cantidad: 'falta la cantidad', sin_datos_nutricionales: 'faltan sus datos nutricionales' };
const PROBLEMAS = {
  porciones_invalidas: 'Indica cuántas porciones rinde la receta (número entero mayor a 0).',
  sin_ingredientes: 'Agrega al menos un ingrediente.',
  sin_ingredientes_cuantificables: 'Agrega al menos un ingrediente con cantidad (los condimentos no cuentan).',
};

function Formulario({ editando, esAcompanamiento, catalogo, ingredientesCat, onCancelar, onGuardado }) {
  const [datos, setDatos] = useState(editando ? desdePreparacion(editando) : FORMULARIO_VACIO);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [calculo, setCalculo] = useState(null);
  const [desactualizada, setDesactualizada] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);

  const poner = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const ponerNutriente = (campo) => (e) => { setDesactualizada(false); setDatos({ ...datos, [campo]: e.target.value, origen: 'manual' }); };

  const infoIng = (id) => ingredientesCat.find((i) => String(i.id_ingrediente) === String(id));
  const grupos = Object.entries(
    ingredientesCat.reduce((acc, i) => {
      const clave = i.categoria || 'Sin categoría';
      (acc[clave] = acc[clave] || []).push(i);
      return acc;
    }, {})
  );

  function cambiarReceta(cambios) {
    if (datos.origen === 'calculada') setDesactualizada(true);
    setDatos({ ...datos, ...cambios });
    setCalculo(null);
  }
  const cambiarFila = (i, campo, valor) =>
    cambiarReceta({ ingredientes: datos.ingredientes.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)) });
  const quitarFila = (i) => cambiarReceta({ ingredientes: datos.ingredientes.filter((_, j) => j !== i) });
  const agregarFila = () => setDatos({ ...datos, ingredientes: [...datos.ingredientes, { ...FILA_VACIA }] });

  const filasValidas = () =>
    datos.ingredientes
      .filter((f) => f.id_ingrediente !== '')
      .map((f) => ({ id_ingrediente: Number(f.id_ingrediente), cantidad_g: f.cantidad_g.trim() === '' ? null : Number(f.cantidad_g) }));

  function alternarAlergeno(nombre) {
    const ya = datos.alergenos.includes(nombre);
    setDatos({ ...datos, alergenos: ya ? datos.alergenos.filter((a) => a !== nombre) : [...datos.alergenos, nombre] });
  }

  const sugeridos = [...new Set(datos.ingredientes.flatMap((f) => infoIng(f.id_ingrediente)?.alergenos || []))]
    .filter((a) => !datos.alergenos.includes(a));

  const hayNutricion = ['calorias', 'proteinas_g', 'carbohidratos_g', 'grasas_g'].some((c) => datos[c].trim() !== '');

  async function calcular() {
    setError(null);
    setCalculando(true);
    try {
      const r = await calcularNutricionApi({
        porciones_receta: datos.porciones_receta.trim() === '' ? null : Number(datos.porciones_receta),
        ingredientes: filasValidas(),
      });
      setCalculo(r);
      if (r.completo) {
        setDesactualizada(false);
        setDatos((d) => ({
          ...d,
          calorias: String(r.por_porcion.calorias),
          proteinas_g: String(r.por_porcion.proteinas_g),
          carbohidratos_g: String(r.por_porcion.carbohidratos_g),
          grasas_g: String(r.por_porcion.grasas_g),
          origen: 'calculada',
        }));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCalculando(false);
    }
  }

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);

    if (!datos.nombre.trim()) return setError('El nombre es obligatorio.');
    if (esAcompanamiento && !datos.tipo) return setError('Elige el tipo de acompañamiento (Entrada, Postre o Bebida).');
    if (datos.ingredientes.some((f) => f.cantidad_g.trim() !== '' && (isNaN(Number(f.cantidad_g)) || Number(f.cantidad_g) <= 0))) {
      return setError('Las cantidades de los ingredientes deben ser números mayores a 0 (gramos en crudo).');
    }
    if (datos.porciones_receta.trim() !== '' && (!Number.isInteger(Number(datos.porciones_receta)) || Number(datos.porciones_receta) <= 0)) {
      return setError('Las porciones de la receta deben ser un entero mayor a 0.');
    }
    if (datos.origen === 'calculada' && desactualizada) {
      return setError('Cambiaste la receta: presiona "Calcular desde los ingredientes" de nuevo antes de guardar.');
    }

    setGuardando(true);
    try {
      const base = {
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion.trim(),
        imagen_url: datos.imagen_url.trim(),
        ingredientes: filasValidas(),
        porciones_receta: datos.porciones_receta.trim() === '' ? '' : Number(datos.porciones_receta),
        tipo: (esAcompanamiento || editando) ? (datos.tipo || null) : undefined,
      };
      const guardada = editando
        ? await actualizarPreparacion(editando.id_preparacion, base)
        : await crearPreparacion(base);

      await asignarAlergenos(guardada.id_preparacion, datos.alergenos);

      let avisoNutricion = null;
      if (hayNutricion || editando?.nutricion) {
        const nut = await guardarNutricion(guardada.id_preparacion, {
          calorias: aNumeroONulo(datos.calorias),
          proteinas_g: aNumeroONulo(datos.proteinas_g),
          carbohidratos_g: aNumeroONulo(datos.carbohidratos_g),
          grasas_g: aNumeroONulo(datos.grasas_g),
          origen: datos.origen,
        });
        avisoNutricion = nut.aviso || null;
      }
      const mensaje = editando ? 'Preparación actualizada.' : 'Preparación creada.';
      onGuardado(avisoNutricion ? `${mensaje} ${avisoNutricion}` : mensaje);
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  async function subirFichero(archivo) {
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
    }
  }

  function subirArchivo(evento) {
    subirFichero(evento.target.files?.[0]);
    evento.target.value = '';
  }

  const ocupado = subiendo || guardando;
  const titulo = editando ? 'Editar preparación' : esAcompanamiento ? 'Nuevo acompañamiento' : 'Nuevo plato';
  const textoGuardar = editando ? 'Guardar cambios' : esAcompanamiento ? 'Guardar acompañamiento' : 'Guardar plato';
  const TIPOS_IMAGEN = 'image/jpeg,image/png,image/webp,image/gif';

  return (
    <ModalFormulario
      titulo={titulo}
      etiqueta={editando ? 'Editar preparación' : 'Nueva preparación'}
      onSubmit={enviar}
      onCancelar={onCancelar}
      guardando={guardando}
      textoGuardar={textoGuardar}
      error={error}
      onCerrarError={() => setError(null)}
    >
      <div className="form-cols">
        <div className="form-col">
          <div className={esAcompanamiento || editando ? 'rejilla-2' : undefined}>
            <label className="campo">
              <span>Nombre</span>
              <input value={datos.nombre} onChange={poner('nombre')} required />
            </label>
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

          <section className="form-card">
            <h3>Ingredientes de la receta</h3>
            <p className="texto-suave">
              Gramos en crudo, para la receta completa (no por porción). Sal, pimienta y especias no necesitan cantidad.
              Los ingredientes se registran en la sección Ingredientes.
            </p>
            {ingredientesCat.length === 0 && <p className="texto-suave">Aún no hay ingredientes registrados.</p>}
            {datos.ingredientes.length > 0 && (
              <div className="ing-fila ing-cabecera" aria-hidden="true">
                <span>Ingrediente</span><span>Gramos</span><span />
              </div>
            )}
            {datos.ingredientes.map((f, i) => (
              <div key={i} className="ing-fila">
                <select value={f.id_ingrediente} onChange={(e) => cambiarFila(i, 'id_ingrediente', e.target.value)} aria-label={`Ingrediente ${i + 1}`}>
                  <option value="">Elegir ingrediente</option>
                  {grupos.map(([categoria, items]) => (
                    <optgroup key={categoria} label={categoria}>
                      {items.map((ing) => <option key={ing.id_ingrediente} value={ing.id_ingrediente}>{ing.nombre}</option>)}
                    </optgroup>
                  ))}
                </select>
                <div className="campo-sufijo">
                  <input
                    type="number" min="0" step="0.1" placeholder="0"
                    value={f.cantidad_g} onChange={(e) => cambiarFila(i, 'cantidad_g', e.target.value)}
                    aria-label={`Gramos del ingrediente ${i + 1}`}
                  />
                  <span aria-hidden="true">g</span>
                </div>
                <button type="button" className="prep-icono prep-icono-peligro" onClick={() => quitarFila(i)}
                  title="Quitar" aria-label={`Quitar ingrediente ${i + 1}`}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            <div className="ing-pie">
              <button type="button" className="boton boton-secundario" onClick={agregarFila}>
                <Plus size={16} aria-hidden="true" /> Agregar ingrediente
              </button>
              <label className="campo campo-en-linea">
                <span>La receta rinde (porciones)</span>
                <input type="number" min="1" step="1" value={datos.porciones_receta}
                  onChange={(e) => cambiarReceta({ porciones_receta: e.target.value })} />
              </label>
            </div>
          </section>
        </div>

        <div className="form-col">
          <section className="form-card">
            <h3>Foto <span className="texto-suave">(opcional)</span></h3>
            {datos.imagen_url ? (
              <div className="foto-vista">
                <ImagenOIcono url={datos.imagen_url} tipo={datos.tipo || 'Plato Principal'} tamano={48} className="foto-vista-img" />
                <div className="foto-vista-acciones">
                  <label className="boton boton-secundario boton-chico">
                    {subiendo ? 'Subiendo…' : 'Cambiar foto'}
                    <input type="file" accept={TIPOS_IMAGEN} className="foto-input" onChange={subirArchivo} disabled={ocupado} />
                  </label>
                  <button type="button" className="boton boton-peligro boton-chico"
                    onClick={() => setDatos({ ...datos, imagen_url: '' })} disabled={subiendo}>
                    Quitar foto
                  </button>
                </div>
              </div>
            ) : (
              <label
                className={`foto-zona ${arrastrando ? 'arrastrando' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setArrastrando(false);
                  if (!ocupado) subirFichero(e.dataTransfer.files?.[0]);
                }}
              >
                <input type="file" accept={TIPOS_IMAGEN} className="foto-input" onChange={subirArchivo} disabled={ocupado} />
                <Upload size={26} aria-hidden="true" />
                <strong>{subiendo ? 'Subiendo…' : 'Sube una foto'}</strong>
                <span>o pega un enlace abajo. JPG, PNG, WEBP o GIF, máximo 3 MB.</span>
              </label>
            )}
            <label className="campo">
              <span>Enlace</span>
              <input
                type="url"
                value={datos.imagen_url}
                onChange={poner('imagen_url')}
                placeholder="https://"
                disabled={ocupado}
              />
            </label>
          </section>

          <section className="form-card">
            <h3>Alérgenos declarados</h3>
            {sugeridos.length > 0 && (
              <Mensaje tipo="aviso" titulo="Alérgenos sugeridos">
                Según los ingredientes, la preparación podría contener: <strong>{sugeridos.join(', ')}</strong>.
                Confírmalo antes de agregarlo; no cubre contaminación cruzada.
                <div>
                  <button type="button" className="boton boton-secundario"
                    onClick={() => setDatos({ ...datos, alergenos: [...datos.alergenos, ...sugeridos] })}>
                    Agregar los sugeridos
                  </button>
                </div>
              </Mensaje>
            )}
            <div className="checks">
              {catalogo.map((a) => (
                <label key={a.id_alergeno} className="campo-check">
                  <input type="checkbox" checked={datos.alergenos.includes(a.nombre)} onChange={() => alternarAlergeno(a.nombre)} />
                  <span>{a.nombre}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="form-card">
            <h3>Información nutricional <span className="texto-suave">(por porción)</span></h3>
            <div className="en-linea">
              <button type="button" className="boton boton-primario boton-con-icono" onClick={calcular} disabled={calculando || guardando}>
                <Calculator size={16} aria-hidden="true" /> {calculando ? 'Calculando…' : 'Calcular desde los ingredientes'}
              </button>
              {hayNutricion && (
                <span className={`insignia ${datos.origen === 'calculada' ? 'insignia-aviso' : 'insignia-neutra'}`}>
                  Origen: {datos.origen === 'calculada' ? 'calculada' : 'manual'}
                </span>
              )}
            </div>

            {calculo && !calculo.completo && (
              <Mensaje tipo="aviso" titulo="Todavía no se puede calcular">
                <ul>
                  {calculo.problemas.map((p) => <li key={p}>{PROBLEMAS[p] || p}</li>)}
                  {calculo.sin_datos.map((s) => <li key={s.nombre}>{s.nombre}: {MOTIVOS[s.motivo] || s.motivo}.</li>)}
                </ul>
              </Mensaje>
            )}
            {calculo?.completo && (
              <Mensaje tipo="ok" titulo="Calculado">
                Calculado y cargado abajo. Es una estimación (en crudo, sin pérdidas por cocción; error esperable ±10–15 %): revísalo antes de guardar.
                {calculo.omitidos.length > 0 && <> No se contó: {calculo.omitidos.join(', ')}.</>}
              </Mensaje>
            )}

            <div className="rejilla-4">
              <label className="campo"><span>Calorías (kcal)</span>
                <input type="number" min="0" step="0.1" value={datos.calorias} onChange={ponerNutriente('calorias')} /></label>
              <label className="campo"><span>Proteínas (g)</span>
                <input type="number" min="0" step="0.1" value={datos.proteinas_g} onChange={ponerNutriente('proteinas_g')} /></label>
              <label className="campo"><span>Carbohidratos (g)</span>
                <input type="number" min="0" step="0.1" value={datos.carbohidratos_g} onChange={ponerNutriente('carbohidratos_g')} /></label>
              <label className="campo"><span>Grasas (g)</span>
                <input type="number" min="0" step="0.1" value={datos.grasas_g} onChange={ponerNutriente('grasas_g')} /></label>
            </div>
            {desactualizada && (
              <Mensaje tipo="aviso">Cambiaste la receta: vuelve a presionar "Calcular desde los ingredientes" antes de guardar.</Mensaje>
            )}
            <span className="texto-suave">Al guardar, esta información se publica a los estudiantes. Sin calorías se muestra "No disponible".</span>
          </section>
        </div>
      </div>
    </ModalFormulario>
  );
}

const COLORES_TIPO = { Entrada: '#318386', Postre: '#B15FBB', Bebida: '#4C8FD1' };
const esPlato = (p) => !p.tipo || p.tipo === 'Plato Principal';

function TarjetaPreparacion({ p, onEditar, onEstado, onBorrar, onSinBorrar }) {
  const nut = estadoNutricion(p);
  const [expandida, setExpandida] = useState(false);
  const [menu, setMenu] = useState(false);
  const refMenu = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const fuera = (e) => { if (refMenu.current && !refMenu.current.contains(e.target)) setMenu(false); };
    const tecla = (e) => { if (e.key === 'Escape') setMenu(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', tecla);
    };
  }, [menu]);

  return (
    <article className={`prep-card ${p.activa ? '' : 'prep-inactiva'} ${expandida ? 'prep-expandida' : ''}`} style={{ '--acento': COLORES_TIPO[p.tipo] || '#1F3864' }}>
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
              {!esPlato(p) && <span>{p.tipo}</span>}
              {!p.activa && <span>Desactivada</span>}
              {nut.faltante
                ? <span className="prep-alerta">Sin información nutricional</span>
                : <span title={nut.texto}>{Math.round(p.nutricion.calorias)} kcal</span>}
            </div>
          </div>
        </button>

        <div className="prep-acciones">
          <button type="button" className="boton-texto" onClick={() => onEditar(p)} aria-label={`Editar ${p.nombre}`}>Editar</button>
          <div className="prep-menu" ref={refMenu}>
            <button type="button" className="prep-icono" onClick={() => setMenu(!menu)}
              aria-haspopup="menu" aria-expanded={menu} title="Más acciones" aria-label={`Más acciones de ${p.nombre}`}>
              <Ellipsis size={18} />
            </button>
            {menu && (
              <div className="prep-menu-lista" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenu(false); setExpandida(!expandida); }}>
                  {expandida ? 'Ocultar detalle' : 'Ver detalle'}
                </button>
                <button type="button" role="menuitem" onClick={() => { setMenu(false); onEstado(p); }}>
                  {p.activa ? 'Desactivar' : 'Reactivar'}
                </button>
                <button type="button" role="menuitem" className="prep-menu-peligro"
                  onClick={() => { setMenu(false); if (p.activa) onSinBorrar(p); else onBorrar(p); }}>
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
            <div className="texto-suave" style={{ margin: 0 }}>{p.ingredientes.join(', ')}</div>
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

function Columna({ titulo, ayuda, textoBoton, lista, soloActivas, onNuevo, onEditar, onEstado, onBorrar, onSinBorrar }) {
  const [busqueda, setBusqueda] = useState('');
  const visibles = lista.filter((p) => (!soloActivas || p.activa) && p.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()));
  return (
    <section className="prep-columna">
      <div className="prep-columna-cabeza">
        <div>
          <h2>{titulo}<Ayuda titulo={titulo}>{ayuda}</Ayuda></h2>
        </div>
        <button className="boton boton-primario boton-con-icono" onClick={onNuevo}><Plus size={16} aria-hidden="true" />{textoBoton}</button>
      </div>
      <input type="search" className="prep-buscar" placeholder={`Buscar en ${titulo.toLowerCase()}`}
        value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label={`Buscar en ${titulo.toLowerCase()}`} />
      <div className="prep-lista">
        {visibles.length === 0 && (
          <div className="v2-vacio-fila">
            {lista.length === 0 ? 'Aún no hay registros.' : 'Ninguno coincide con la búsqueda.'}
          </div>
        )}
        {visibles.map((p) => <TarjetaPreparacion key={p.id_preparacion} p={p} onEditar={onEditar} onEstado={onEstado} onBorrar={onBorrar} onSinBorrar={onSinBorrar} />)}
      </div>
    </section>
  );
}

export default function PreparacionesPage({ soloActivas: soloActivasProp, setSoloActivas: setSoloActivasProp }) {
  const confirmar = useConfirmar();
  const [lista, setLista] = useState(null);
  const [catalogo, setCatalogo] = useState([]);
  const [ingredientesCat, setIngredientesCat] = useState([]);
  const [soloActivasInterno, setSoloActivasInterno] = useState(false);
  const soloActivas = soloActivasProp ?? soloActivasInterno;
  const setSoloActivas = setSoloActivasProp ?? setSoloActivasInterno;
  const [formulario, setFormulario] = useState(null); 
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [guia, setGuia] = useState(null);

  const cargar = useCallback(async () => {
    try {
      const [prep, alerg, ings] = await Promise.all([listarPreparaciones(), listarCatalogoAlergenos(), listarIngredientes()]);
      setLista(prep);
      setCatalogo(alerg);
      setIngredientesCat(ings);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function sinBorrar(p) {
    setGuia(`"${p.nombre}" está activa. Para borrarla, primero desactívala desde el menú ⋯ de su fila. Solo se pueden borrar preparaciones desactivadas que nunca se usaron en un menú.`);
  }

  async function cambiarEstado(p) {
    setGuia(null);
    const desactivar = p.activa;
    if (desactivar && !(await confirmar({
      titulo: 'Desactivar preparación',
      mensaje: `¿Desactivar "${p.nombre}"? Dejará de poder planificarse, pero se conserva su historial. Puedes reactivarla cuando quieras.`,
      textoConfirmar: 'Desactivar',
    }))) return;
    try {
      await (desactivar ? desactivarPreparacion(p.id_preparacion) : reactivarPreparacion(p.id_preparacion));
      setAviso(desactivar ? 'Desactivada.' : 'Reactivada.');
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrar(p) {
    if (!(await confirmar({
      titulo: 'Borrar preparación',
      mensaje: `¿Borrar "${p.nombre}" definitivamente? Esta acción no se puede deshacer. Si ya apareció en algún menú, el sistema no permitirá el borrado y habrá que dejarla desactivada.`,
      textoConfirmar: 'Borrar',
      peligro: true,
    }))) return;
    try {
      await eliminarPreparacion(p.id_preparacion);
      setAviso('Borrada.');
      setError(null);
      cargar();
    } catch (err) {
      setError(err.message);
      setAviso(null);
    }
  }

  const abrir = (valor) => { setAviso(null); setGuia(null); setFormulario(valor); };
  const platos = (lista || []).filter(esPlato);
  const acompanamientos = (lista || []).filter((p) => !esPlato(p));

  return (
    <div className="v2">
      <div className="v2-barra">
        <label className="campo-check">
          <input type="checkbox" checked={soloActivas} onChange={(e) => setSoloActivas(e.target.checked)} />
          <span>Ocultar desactivadas</span>
        </label>
      </div>

      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}
      {aviso && <Mensaje tipo="ok" onCerrar={() => setAviso(null)}>{aviso}</Mensaje>}
      {guia && <Mensaje tipo="aviso" titulo="Primero desactívala" onCerrar={() => setGuia(null)}>{guia}</Mensaje>}
      {!lista && !error && <Cargando>Cargando preparaciones…</Cargando>}

      {lista && (
        <div className="prep-columnas">
          <Columna titulo="Platos" ayuda="Los que se planifican como plato principal. El precio se define en la planificación del menú."
            textoBoton="Nuevo plato" lista={platos} soloActivas={soloActivas}
            onNuevo={() => abrir('nueva')} onEditar={abrir} onEstado={cambiarEstado} onBorrar={borrar} onSinBorrar={sinBorrar} />
          <Columna titulo="Acompañamientos" ayuda="Entradas, postres y bebidas que se sirven con todos los combos."
            textoBoton="Nuevo acompañamiento" lista={acompanamientos} soloActivas={soloActivas}
            onNuevo={() => abrir('acompanamiento')} onEditar={abrir} onEstado={cambiarEstado} onBorrar={borrar} onSinBorrar={sinBorrar} />
        </div>
      )}

      {formulario && (
        <Formulario
          editando={formulario === 'nueva' || formulario === 'acompanamiento' ? null : formulario}
          esAcompanamiento={formulario === 'acompanamiento'}
          catalogo={catalogo}
          ingredientesCat={ingredientesCat}
          onCancelar={() => setFormulario(null)}
          onGuardado={(mensaje) => { setFormulario(null); setAviso(mensaje); cargar(); }}
        />
      )}
    </div>
  );
}
