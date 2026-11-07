import { useState, useEffect, useCallback } from 'react';
import {
  listarIngredientes, listarCategoriasIngrediente, listarCatalogoAlergenos,
  crearIngrediente, actualizarIngrediente, eliminarIngrediente,
} from '../api/gestion';
import { Beef, Fish, Carrot, Wheat, Milk, Droplet, Package, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import Mensaje from '../components/Mensaje';
import ModalFormulario from '../components/ModalFormulario';
import Cargando from '../components/Cargando';
import { useConfirmar } from '../context/confirmacion-context';

const NUTRIENTES = ['calorias_100g', 'proteinas_100g', 'carbohidratos_100g', 'grasas_100g'];

const ESTILO = {
  'Carnes y aves': { Icono: Beef, color: '#B54A3A' },
  'Pescados y mariscos': { Icono: Fish, color: '#2F7FA6' },
  'Verduras y frutas': { Icono: Carrot, color: '#3C7424' },
  'Cereales y legumbres': { Icono: Wheat, color: '#C98A2E' },
  'Lácteos y huevos': { Icono: Milk, color: '#8A6FB8' },
  'Aceites, azúcar y condimentos': { Icono: Droplet, color: '#B8962E' },
};
const ESTILO_OTROS = { Icono: Package, color: '#6B7280' };

const VACIO = {
  nombre: '', id_categoria_ingrediente: '', calorias_100g: '', proteinas_100g: '', carbohidratos_100g: '',
  grasas_100g: '', sin_cuantificar: false, alergenos: [],
};

const aTexto = (v) => (v === null || v === undefined ? '' : String(Number(v)));
const aNumeroONulo = (t) => (t.trim() === '' ? null : Number(t));

function desdeIngrediente(i) {
  return {
    nombre: i.nombre,
    id_categoria_ingrediente: i.id_categoria_ingrediente ? String(i.id_categoria_ingrediente) : '',
    calorias_100g: aTexto(i.calorias_100g),
    proteinas_100g: aTexto(i.proteinas_100g),
    carbohidratos_100g: aTexto(i.carbohidratos_100g),
    grasas_100g: aTexto(i.grasas_100g),
    sin_cuantificar: !!i.sin_cuantificar,
    alergenos: i.alergenos || [],
  };
}

function Formulario({ editando, categorias, catalogoAlergenos, onCancelar, onGuardado }) {
  const [datos, setDatos] = useState(editando ? desdeIngrediente(editando) : VACIO);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const poner = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const marcar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.checked });
  const alternarAlergeno = (nombre) => setDatos({
    ...datos,
    alergenos: datos.alergenos.includes(nombre) ? datos.alergenos.filter((a) => a !== nombre) : [...datos.alergenos, nombre],
  });

  async function enviar(evento) {
    evento.preventDefault();
    setError(null);
    if (!datos.nombre.trim()) return setError('El nombre es obligatorio.');

    const numeros = NUTRIENTES.map((c) => aNumeroONulo(datos[c]));
    if (numeros.some((n) => n !== null) && numeros.some((n) => n === null)) {
      return setError('Completa los cuatro valores nutricionales o déjalos todos vacíos.');
    }

    const payload = {
      nombre: datos.nombre.trim(),
      id_categoria_ingrediente: datos.id_categoria_ingrediente === '' ? null : Number(datos.id_categoria_ingrediente),
      sin_cuantificar: datos.sin_cuantificar,
      alergenos: datos.alergenos,
    };
    NUTRIENTES.forEach((c, i) => { payload[c] = numeros[i]; });

    setGuardando(true);
    try {
      if (editando) {
        const r = await actualizarIngrediente(editando.id_ingrediente, payload);
        const partes = [];
        if (r.recalculadas > 0) partes.push(`${r.recalculadas} preparación(es) con nutrición calculada se recalcularon`);
        if (r.sin_datos > 0) partes.push(`${r.sin_datos} quedaron sin información nutricional porque ya no se puede calcular`);
        onGuardado(partes.length ? `Ingrediente actualizado. ${partes.join('; ')}.` : 'Ingrediente actualizado.');
      } else {
        await crearIngrediente(payload);
        onGuardado('Ingrediente creado.');
      }
    } catch (err) {
      setError(err.message);
      setGuardando(false);
    }
  }

  return (
    <ModalFormulario
      titulo={editando ? 'Editar ingrediente' : 'Nuevo ingrediente'}
      ancho="medio"
      onSubmit={enviar}
      onCancelar={onCancelar}
      guardando={guardando}
      textoGuardar={editando ? 'Guardar cambios' : 'Guardar ingrediente'}
      error={error}
      onCerrarError={() => setError(null)}
    >
      <div className="form-cols">
        <div className="form-col">
          <label className="campo"><span>Nombre</span>
            <input value={datos.nombre} onChange={poner('nombre')} required />
            <span className="texto-suave">Sé específico: "Pechuga de pollo", no "Pollo".</span></label>
          <label className="campo"><span>Categoría</span>
            <select value={datos.id_categoria_ingrediente} onChange={poner('id_categoria_ingrediente')}>
              <option value="">Sin categoría</option>
              {categorias.map((c) => <option key={c.id_categoria_ingrediente} value={c.id_categoria_ingrediente}>{c.nombre}</option>)}
            </select></label>

          <section className="form-card">
            <h3>Alérgenos que aporta</h3>
            <div className="checks">
              {catalogoAlergenos.map((a) => (
                <label key={a.id_alergeno} className="campo-check">
                  <input type="checkbox" checked={datos.alergenos.includes(a.nombre)} onChange={() => alternarAlergeno(a.nombre)} />
                  <span>{a.nombre}</span>
                </label>
              ))}
            </div>
            <span className="texto-suave">Se sugieren al armar una receta; siempre se confirman a mano. No cubre contaminación cruzada.</span>
          </section>
        </div>

        <div className="form-col">
          <section className="form-card">
            <h3>Composición por 100 g <span className="texto-suave">(en crudo)</span></h3>
            <div className="rejilla-4">
              <label className="campo"><span>Calorías (kcal)</span>
                <input type="number" min="0" step="0.1" value={datos.calorias_100g} onChange={poner('calorias_100g')} /></label>
              <label className="campo"><span>Proteínas (g)</span>
                <input type="number" min="0" step="0.1" value={datos.proteinas_100g} onChange={poner('proteinas_100g')} /></label>
              <label className="campo"><span>Carbohidratos (g)</span>
                <input type="number" min="0" step="0.1" value={datos.carbohidratos_100g} onChange={poner('carbohidratos_100g')} /></label>
              <label className="campo"><span>Grasas (g)</span>
                <input type="number" min="0" step="0.1" value={datos.grasas_100g} onChange={poner('grasas_100g')} /></label>
            </div>
            <label className="campo-check">
              <input type="checkbox" checked={datos.sin_cuantificar} onChange={marcar('sin_cuantificar')} />
              <span>Sin cuantificar (sal, especias, condimentos): se ignora en el cálculo y no necesita gramos.</span>
            </label>
          </section>
        </div>
      </div>
    </ModalFormulario>
  );
}

const idSeccion = (nombre) => `seccion-${String(nombre).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-')}`;

export default function IngredientesPage() {
  const confirmar = useConfirmar();
  const [lista, setLista] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [catalogoAlergenos, setCatalogoAlergenos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [formulario, setFormulario] = useState(null); 
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [colapsadas, setColapsadas] = useState(() => new Set());
  const [soloIncompletos, setSoloIncompletos] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const [ing, cat, alerg] = await Promise.all([listarIngredientes(), listarCategoriasIngrediente(), listarCatalogoAlergenos()]);
      setLista(ing);
      setCategorias(cat);
      setCatalogoAlergenos(alerg);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const alternarCategoria = (nombre) => {
    setColapsadas((prev) => {
      const copia = new Set(prev);
      if (copia.has(nombre)) copia.delete(nombre);
      else copia.add(nombre);
      return copia;
    });
  };
  const estaColapsada = (nombre) => !busqueda.trim() && colapsadas.has(nombre);
  const estaIncompleto = (i) => {
    if (i.sin_cuantificar) return false;
    return NUTRIENTES.some((c) => i[c] === null || i[c] === undefined);
  };

  async function borrar(i) {
    if (!(await confirmar({ titulo: 'Borrar ingrediente', mensaje: `¿Borrar "${i.nombre}" definitivamente?`, textoConfirmar: 'Borrar', peligro: true }))) return;
    try {
      await eliminarIngrediente(i.id_ingrediente);
      setAviso('Ingrediente borrado.');
      setError(null);
      cargar();
    } catch (err) {
      setError(err.message);
      setAviso(null);
    }
  }

  const visibles = (lista || []).filter((i) => {
    if (soloIncompletos && !estaIncompleto(i)) return false;
    return i.nombre.toLowerCase().includes(busqueda.trim().toLowerCase());
  });
  const grupos = [
    ...categorias.map((c) => ({ id: c.id_categoria_ingrediente, nombre: c.nombre, items: [] })),
    { id: null, nombre: 'Sin categoría', items: [] },
  ];
  visibles.forEach((i) => (grupos.find((g) => g.id === (i.id_categoria_ingrediente ?? null)) || grupos[grupos.length - 1]).items.push(i));
  const num = (v) => (v === null ? '—' : Number(v));

  const sinInfo = (lista || []).filter(estaIncompleto).length;

  return (
    <div className="v2">
      <div className="v2-barra">
        <div className="v2-filtros">
          <input type="search" className="v2-buscar" placeholder="Buscar ingrediente" aria-label="Buscar ingrediente"
            value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <label className="campo-check">
            <input type="checkbox" checked={soloIncompletos} onChange={(e) => setSoloIncompletos(e.target.checked)} />
            <span>Solo sin información nutricional{lista && sinInfo > 0 ? ` (${sinInfo})` : ''}</span>
          </label>
        </div>
        <button className="boton boton-primario boton-con-icono" onClick={() => { setAviso(null); setFormulario('nuevo'); }}>
          <Plus size={16} aria-hidden="true" />Nuevo ingrediente
        </button>
      </div>

      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}
      {aviso && <Mensaje tipo="ok" onCerrar={() => setAviso(null)}>{aviso}</Mensaje>}
      {!lista && !error && <Cargando>Cargando ingredientes…</Cargando>}
      {lista && visibles.length === 0 && (
        <div className="estado-info">
          {soloIncompletos && !busqueda.trim()
            ? 'Todos los ingredientes tienen su información nutricional completa.'
            : soloIncompletos
              ? 'Ningún ingrediente sin información nutricional coincide con la búsqueda.'
              : 'Ningún ingrediente coincide con la búsqueda.'}
        </div>
      )}

      {lista && grupos.filter((g) => g.items.length > 0).map((g) => {
        const { Icono, color } = ESTILO[g.nombre] || ESTILO_OTROS;
        return (
          <section key={g.nombre} className="ing-seccion" style={{ '--acento': color }}>
            <button
              type="button"
              className="ing-cabeza ing-cabeza-boton"
              onClick={() => alternarCategoria(g.nombre)}
              aria-expanded={!estaColapsada(g.nombre)}
              aria-controls={idSeccion(g.nombre)}
            >
              <span className="ing-icono"><Icono size={18} strokeWidth={1.8} /></span>
              <div className="ing-cabeza-info">
                <h2>{g.nombre} <span>{g.items.length}</span></h2>
              </div>
              <span className="ing-chevron" aria-hidden="true">
                {estaColapsada(g.nombre) ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
              </span>
            </button>

            {!estaColapsada(g.nombre) && (
              <div className="tabla-contenedor ing-tabla" id={idSeccion(g.nombre)}>
                <table className="tabla tabla-ingredientes">
                <thead>
                  <tr><th>Ingrediente</th><th className="col-num">kcal</th><th className="col-num">Prot. (g)</th><th className="col-num">Carb. (g)</th><th className="col-num">Grasas (g)</th><th>Alérgenos</th><th className="col-fin"><span className="v2-solo-lector">Acciones</span></th></tr>
                </thead>
                <tbody>
                  {g.items.map((i) => (
                    <tr key={i.id_ingrediente}>
                      <td className="col-nombre">
                        <div className="v2-persona">
                          <strong>{i.nombre}{i.sin_cuantificar && <em className="ing-nota"> · sin cuantificar</em>}</strong>
                          <span>{i.usos === 0 ? 'Sin uso en preparaciones' : `Usado en ${i.usos} ${i.usos === 1 ? 'preparación' : 'preparaciones'}`}</span>
                        </div>
                      </td>
                      <td className="col-num" data-etiqueta="kcal">{num(i.calorias_100g)}</td>
                      <td className="col-num" data-etiqueta="Prot.">{num(i.proteinas_100g)}</td>
                      <td className="col-num" data-etiqueta="Carb.">{num(i.carbohidratos_100g)}</td>
                      <td className="col-num" data-etiqueta="Grasas">{num(i.grasas_100g)}</td>
                      <td className="col-alerg">{i.alergenos.length ? i.alergenos.join(', ') : <span className="texto-suave">—</span>}</td>
                      <td className="col-fin">
                        <div className="v2-acciones">
                          <button type="button" className="boton-texto" onClick={() => { setAviso(null); setFormulario(i); }}>Editar</button>
                          {i.usos === 0 && <button type="button" className="boton-texto peligro" onClick={() => borrar(i)}>Borrar</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )}
          </section>
        );
      })}

      {formulario && (
        <Formulario
          editando={formulario === 'nuevo' ? null : formulario}
          categorias={categorias}
          catalogoAlergenos={catalogoAlergenos}
          onCancelar={() => setFormulario(null)}
          onGuardado={(mensaje) => { setFormulario(null); setAviso(mensaje); cargar(); }}
        />
      )}
    </div>
  );
}
