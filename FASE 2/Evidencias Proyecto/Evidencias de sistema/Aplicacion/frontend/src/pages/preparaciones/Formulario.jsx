import { useState } from 'react';
import { Trash2, Plus, Upload, Calculator } from 'lucide-react';
import ModalFormulario from '../../components/ModalFormulario';
import ImagenOIcono from '../../components/ImagenOIcono';
import RecortarImagen from '../../components/RecortarImagen';
import {
  crearPreparacion,
  actualizarPreparacion,
  asignarAlergenos,
  guardarNutricion,
  subirImagen,
  calcularNutricionApi,
} from '../../api/gestion';
import Mensaje from '../../components/Mensaje';
import { resolverUrl } from '../../api/cliente';
import {
  FORMULARIO_VACIO,
  FILA_VACIA,
  desdePreparacion,
  aNumeroONulo,
  TIPOS_ACOMPANAMIENTO,
  MOTIVOS,
  PROBLEMAS,
  desdeVariacion,
} from './formulario';

export default function Formulario({ editando, variacionDe, esAcompanamiento, catalogo, ingredientesCat, onCancelar, onGuardado }) {
  const [datos, setDatos] = useState(editando ? desdePreparacion(editando) : variacionDe ? desdeVariacion(variacionDe) : FORMULARIO_VACIO);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [calculando, setCalculando] = useState(false);
  const [calculo, setCalculo] = useState(null);
  const [desactualizada, setDesactualizada] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [cargandoAjuste, setCargandoAjuste] = useState(false);
  const [recorte, setRecorte] = useState(null);
  const [enlaceTexto, setEnlaceTexto] = useState(() => (/^https?:\/\//i.test(editando?.imagen_url || '') ? editando.imagen_url : ''));

  const poner = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const ponerNutriente = (campo) => (e) => {
    setDesactualizada(false);
    setDatos({ ...datos, [campo]: e.target.value, origen: 'manual' });
  };

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

  const sugeridos = [...new Set(datos.ingredientes.flatMap((f) => infoIng(f.id_ingrediente)?.alergenos || []))].filter(
    (a) => !datos.alergenos.includes(a)
  );

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
    if (
      datos.porciones_receta.trim() !== '' &&
      (!Number.isInteger(Number(datos.porciones_receta)) || Number(datos.porciones_receta) <= 0)
    ) {
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
        tipo: esAcompanamiento || editando || variacionDe ? datos.tipo || null : undefined,
        ...(variacionDe && !editando ? { id_preparacion_base: variacionDe.id_preparacion } : {}),
      };
      const guardada = editando ? await actualizarPreparacion(editando.id_preparacion, base) : await crearPreparacion(base);

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
      const mensaje = editando ? 'Preparación actualizada.' : variacionDe ? 'Variación creada.' : 'Preparación creada.';
      onGuardado(avisoNutricion ? `${mensaje} ${avisoNutricion}` : mensaje, guardada);
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
      setEnlaceTexto('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubiendo(false);
    }
  }

  function quitarImagen() {
    setDatos({ ...datos, imagen_url: '' });
    setEnlaceTexto('');
  }

  function cambiarEnlace(valor) {
    setEnlaceTexto(valor);
    const limpio = valor.trim();
    if (limpio === '') {
      setDatos((d) => ({ ...d, imagen_url: /^https?:\/\//i.test(d.imagen_url) ? '' : d.imagen_url }));
    } else {
      setDatos((d) => ({ ...d, imagen_url: limpio }));
    }
  }

  async function ajustarFoto() {
    if (!datos.imagen_url) return;
    setError(null);
    setCargandoAjuste(true);
    try {
      const url = resolverUrl(datos.imagen_url);
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('fetch');
      const blob = await resp.blob();
      if (!blob.type.startsWith('image/')) throw new Error('no-es-imagen');
      const ext = blob.type.split('/')[1].replace('jpeg', 'jpg').replace('+xml', '');
      const file = new File([blob], `foto.${ext}`, { type: blob.type });
      setRecorte(file);
    } catch {
      setError('No se pudo cargar la imagen para ajustarla. ' + 'En ese caso, prueba con otra URL o sube una foto desde tu dispositivo.');
    } finally {
      setCargandoAjuste(false);
    }
  }

  function subirArchivo(evento) {
    const archivo = evento.target.files?.[0];
    evento.target.value = '';
    if (archivo) setRecorte(archivo);
  }

  const ocupado = subiendo || guardando;
  const titulo = editando
    ? 'Editar preparación'
    : variacionDe
      ? `Nueva variación de "${variacionDe.nombre}"`
      : esAcompanamiento
        ? 'Nuevo acompañamiento'
        : 'Nuevo plato';
  const textoGuardar = editando
    ? 'Guardar cambios'
    : variacionDe
      ? 'Guardar variación'
      : esAcompanamiento
        ? 'Guardar acompañamiento'
        : 'Guardar plato';
  const TIPOS_IMAGEN = 'image/jpeg,image/png,image/webp,image/gif';

  return (
    <>
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
        {variacionDe && (
          <p className="texto-suave form-aviso-variacion">
            Se crea una preparación nueva a partir de la receta original. Cambia los ingredientes que correspondan y revisa los alérgenos
            antes de guardar. La receta original no se modifica.
          </p>
        )}
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
                    <option value="">{esAcompanamiento ? 'Elegir tipo' : 'Plato Principal'}</option>
                    {TIPOS_ACOMPANAMIENTO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
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
                Gramos en crudo, para la receta completa (no por porción). Sal, pimienta y especias no necesitan cantidad. Los ingredientes
                se registran en la sección Ingredientes.
              </p>
              {ingredientesCat.length === 0 && <p className="texto-suave">Aún no hay ingredientes registrados.</p>}
              {datos.ingredientes.length > 0 && (
                <div className="ing-fila ing-cabecera" aria-hidden="true">
                  <span>Ingrediente</span>
                  <span>Gramos</span>
                  <span />
                </div>
              )}
              {datos.ingredientes.map((f, i) => (
                <div key={i} className="ing-fila">
                  <select
                    value={f.id_ingrediente}
                    onChange={(e) => cambiarFila(i, 'id_ingrediente', e.target.value)}
                    aria-label={`Ingrediente ${i + 1}`}
                  >
                    <option value="">Elegir ingrediente</option>
                    {grupos.map(([categoria, items]) => (
                      <optgroup key={categoria} label={categoria}>
                        {items.map((ing) => (
                          <option key={ing.id_ingrediente} value={ing.id_ingrediente}>
                            {ing.nombre}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="campo-sufijo">
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="0"
                      value={f.cantidad_g}
                      onChange={(e) => cambiarFila(i, 'cantidad_g', e.target.value)}
                      aria-label={`Gramos del ingrediente ${i + 1}`}
                    />
                    <span aria-hidden="true">g</span>
                  </div>
                  <button
                    type="button"
                    className="prep-icono prep-icono-peligro"
                    onClick={() => quitarFila(i)}
                    title="Quitar"
                    aria-label={`Quitar ingrediente ${i + 1}`}
                  >
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
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={datos.porciones_receta}
                    onChange={(e) => cambiarReceta({ porciones_receta: e.target.value })}
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="form-col">
            <section className="form-card">
              <h3>
                Foto <span className="texto-suave">(opcional)</span>
              </h3>

              {datos.imagen_url ? (
                <div className="foto-vista">
                  <ImagenOIcono url={datos.imagen_url} tipo={datos.tipo || 'Plato Principal'} tamano={48} className="foto-vista-img" />
                  <div className="foto-vista-acciones">
                    <button
                      type="button"
                      className="boton boton-secundario boton-chico"
                      onClick={ajustarFoto}
                      disabled={ocupado || cargandoAjuste}
                    >
                      {cargandoAjuste ? 'Cargando…' : 'Ajustar foto'}
                    </button>
                    <label className="boton boton-secundario boton-chico">
                      {subiendo ? 'Subiendo…' : 'Cambiar foto'}
                      <input type="file" accept={TIPOS_IMAGEN} className="foto-input" onChange={subirArchivo} disabled={ocupado} />
                    </label>
                    <button type="button" className="boton boton-peligro boton-chico" onClick={quitarImagen} disabled={subiendo}>
                      Quitar foto
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  className={`foto-zona ${arrastrando ? 'arrastrando' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setArrastrando(true);
                  }}
                  onDragLeave={() => setArrastrando(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setArrastrando(false);
                    const archivo = e.dataTransfer.files?.[0];
                    if (!ocupado && archivo) setRecorte(archivo);
                  }}
                >
                  <input type="file" accept={TIPOS_IMAGEN} className="foto-input" onChange={subirArchivo} disabled={ocupado} />
                  <Upload size={26} aria-hidden="true" />
                  <strong>{subiendo ? 'Subiendo…' : 'Sube una foto'}</strong>
                  <span>Desde tu PC o celular. JPG, PNG, WEBP o GIF, máximo 3 MB.</span>
                </label>
              )}

              <label className="campo">
                <span>Enlace de la imagen</span>
                <input
                  type="text"
                  value={enlaceTexto}
                  onChange={(e) => cambiarEnlace(e.target.value)}
                  placeholder={/^\/api\/imagenes\//.test(datos.imagen_url) ? '' : 'https://'}
                  disabled={ocupado}
                />
              </label>
            </section>

            <section className="form-card">
              <h3>Alérgenos declarados</h3>
              {sugeridos.length > 0 && (
                <Mensaje tipo="aviso" titulo="Alérgenos sugeridos">
                  Según los ingredientes, la preparación podría contener: <strong>{sugeridos.join(', ')}</strong>. Confírmalo antes de
                  agregarlo; no cubre contaminación cruzada.
                  <div>
                    <button
                      type="button"
                      className="boton boton-secundario"
                      onClick={() => setDatos({ ...datos, alergenos: [...datos.alergenos, ...sugeridos] })}
                    >
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
              <h3>
                Información nutricional <span className="texto-suave">(por porción)</span>
              </h3>
              <div className="en-linea">
                <button
                  type="button"
                  className="boton boton-primario boton-con-icono"
                  onClick={calcular}
                  disabled={calculando || guardando}
                >
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
                    {calculo.problemas.map((p) => (
                      <li key={p}>{PROBLEMAS[p] || p}</li>
                    ))}
                    {calculo.sin_datos.map((s) => (
                      <li key={s.nombre}>
                        {s.nombre}: {MOTIVOS[s.motivo] || s.motivo}.
                      </li>
                    ))}
                  </ul>
                </Mensaje>
              )}
              {calculo?.completo && (
                <Mensaje tipo="ok" titulo="Calculado">
                  Calculado y cargado abajo. Es una estimación (en crudo, sin pérdidas por cocción; error esperable ±10–15 %): revísalo
                  antes de guardar.
                  {calculo.omitidos.length > 0 && <> No se contó: {calculo.omitidos.join(', ')}.</>}
                </Mensaje>
              )}

              <div className="rejilla-4">
                <label className="campo">
                  <span>Calorías (kcal)</span>
                  <input type="number" min="0" step="0.1" value={datos.calorias} onChange={ponerNutriente('calorias')} />
                </label>
                <label className="campo">
                  <span>Proteínas (g)</span>
                  <input type="number" min="0" step="0.1" value={datos.proteinas_g} onChange={ponerNutriente('proteinas_g')} />
                </label>
                <label className="campo">
                  <span>Carbohidratos (g)</span>
                  <input type="number" min="0" step="0.1" value={datos.carbohidratos_g} onChange={ponerNutriente('carbohidratos_g')} />
                </label>
                <label className="campo">
                  <span>Grasas (g)</span>
                  <input type="number" min="0" step="0.1" value={datos.grasas_g} onChange={ponerNutriente('grasas_g')} />
                </label>
              </div>
              {desactualizada && (
                <Mensaje tipo="aviso">Cambiaste la receta: vuelve a presionar "Calcular desde los ingredientes" antes de guardar.</Mensaje>
              )}
              <span className="texto-suave">
                Al guardar, esta información se publica a los estudiantes. Sin calorías se muestra "No disponible".
              </span>
            </section>
          </div>
        </div>
      </ModalFormulario>

      {recorte && (
        <RecortarImagen
          archivo={recorte}
          onConfirmar={(archivoRecortado) => {
            setRecorte(null);
            subirFichero(archivoRecortado);
          }}
          onCancelar={() => setRecorte(null)}
        />
      )}
    </>
  );
}
