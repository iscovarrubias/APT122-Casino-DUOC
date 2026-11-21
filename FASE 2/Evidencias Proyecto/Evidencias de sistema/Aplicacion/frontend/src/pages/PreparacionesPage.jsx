import { useState, useEffect, useCallback } from 'react';
import {
  listarPreparaciones,
  listarCatalogoAlergenos,
  desactivarPreparacion,
  reactivarPreparacion,
  eliminarPreparacion,
  listarIngredientes,
} from '../api/gestion';
import Mensaje from '../components/Mensaje';
import PantallaCarga from '../components/PantallaCarga';
import PaginaError from '../components/PaginaError';
import { useConfirmar } from '../context/confirmacion-context';
import Formulario from './preparaciones/Formulario';
import Columna from './preparaciones/Columna';
import { esPlato } from './preparaciones/formulario';

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
  const [intento, setIntento] = useState(0);

  const cargar = useCallback(async () => {
    try {
      const [prep, alerg, ings] = await Promise.all([listarPreparaciones(), listarCatalogoAlergenos(), listarIngredientes()]);
      setLista(prep);
      setCatalogo(alerg);
      setIngredientesCat(ings);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar, intento]);

  if (error && typeof error === 'object' && !lista) {
    return (
      <div className="v2">
        <PaginaError compacta codigo={error.estado ?? 0} detalle={error.message} onReintentar={() => setIntento((i) => i + 1)} />
      </div>
    );
  }

  function sinBorrar(p) {
    setGuia(
      `"${p.nombre}" está activa. Para borrarla, primero desactívala desde el menú ⋯ de su fila. Solo se pueden borrar preparaciones desactivadas que nunca se usaron en un menú.`
    );
  }

  async function cambiarEstado(p) {
    setGuia(null);
    const desactivar = p.activa;
    if (
      desactivar &&
      !(await confirmar({
        titulo: 'Desactivar preparación',
        mensaje: `¿Desactivar "${p.nombre}"? Dejará de poder planificarse, pero se conserva su historial. Puedes reactivarla cuando quieras.`,
        textoConfirmar: 'Desactivar',
      }))
    )
      return;
    try {
      await (desactivar ? desactivarPreparacion(p.id_preparacion) : reactivarPreparacion(p.id_preparacion));
      setAviso(desactivar ? 'Desactivada.' : 'Reactivada.');
      cargar();
    } catch (err) {
      setError(err.message);
    }
  }

  async function borrar(p) {
    if (
      !(await confirmar({
        titulo: 'Borrar preparación',
        mensaje: `¿Borrar "${p.nombre}" definitivamente? Esta acción no se puede deshacer. Si ya apareció en algún menú, el sistema no permitirá el borrado y habrá que dejarla desactivada.`,
        textoConfirmar: 'Borrar',
        peligro: true,
      }))
    )
      return;
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

  const abrir = (valor) => {
    setAviso(null);
    setGuia(null);
    setFormulario(valor);
  };
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

      {error && typeof error === 'string' && (
        <Mensaje tipo="error" onCerrar={() => setError(null)}>
          {error}
        </Mensaje>
      )}
      {aviso && (
        <Mensaje tipo="ok" onCerrar={() => setAviso(null)}>
          {aviso}
        </Mensaje>
      )}
      {guia && (
        <Mensaje tipo="aviso" titulo="Primero desactívala" onCerrar={() => setGuia(null)}>
          {guia}
        </Mensaje>
      )}

      {!lista && !error && <PantallaCarga compacta mensaje="Cargando preparaciones…" />}

      {lista && (
        <div className="prep-columnas">
          <Columna
            titulo="Platos"
            ayuda="Los que se planifican como Plato Principal. El precio se define en la planificación del menú."
            textoBoton="Nuevo plato"
            lista={platos}
            soloActivas={soloActivas}
            onNuevo={() => abrir('nueva')}
            onEditar={abrir}
            onEstado={cambiarEstado}
            onBorrar={borrar}
            onSinBorrar={sinBorrar}
          />
          <Columna
            titulo="Acompañamientos"
            ayuda="Entradas, postres y bebidas que se sirven con todos los combos."
            textoBoton="Nuevo acompañamiento"
            lista={acompanamientos}
            soloActivas={soloActivas}
            onNuevo={() => abrir('acompanamiento')}
            onEditar={abrir}
            onEstado={cambiarEstado}
            onBorrar={borrar}
            onSinBorrar={sinBorrar}
          />
        </div>
      )}

      {formulario && (
        <Formulario
          editando={formulario === 'nueva' || formulario === 'acompanamiento' ? null : formulario}
          esAcompanamiento={formulario === 'acompanamiento'}
          catalogo={catalogo}
          ingredientesCat={ingredientesCat}
          onCancelar={() => setFormulario(null)}
          onGuardado={(mensaje) => {
            setFormulario(null);
            setAviso(mensaje);
            cargar();
          }}
        />
      )}
    </div>
  );
}
