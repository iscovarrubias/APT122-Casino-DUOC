import { useState, useEffect } from 'react';
import { useEstudiante } from '../utils/useEstudiante';
import { CATEGORIAS_MENU as CATEGORIAS } from '../utils/formato';
import { pedir } from '../api/cliente';
import Mensaje from './Mensaje';
import PaginaError from './PaginaError';

export default function PerfilEstudianteModal({ onCerrar }) {
  const { alergias, favoritos, quitarFavorito, categoriaPreferida, guardarCategoriaPreferida } = useEstudiante();
  const [seleccion, setSeleccion] = useState(alergias);
  const [catalogo, setCatalogo] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const [categoriaSel, setCategoriaSel] = useState(categoriaPreferida || '');
  const [correos, setCorreos] = useState({ menu_semanal: false, avisos_favoritos: false });

  const [errorConexion, setErrorConexion] = useState(false);

  const cargarCatalogo = () => {
    setErrorConexion(false);
    setError(null);
    pedir('/api/preparaciones/alergenos', { conToken: false })
      .then(setCatalogo)
      .catch(() => setErrorConexion(true));
    pedir('/api/estudiante/correos')
      .then((c) => setCorreos({ menu_semanal: !!c?.menu_semanal, avisos_favoritos: !!c?.avisos_favoritos }))
      .catch(() => {});
  };

  const alternarCorreo = (campo) => {
    setCorreos((c) => ({ ...c, [campo]: !c[campo] }));
    setOk(false);
  };

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const alternar = (nombre) => {
    setSeleccion((s) => (s.includes(nombre) ? s.filter((a) => a !== nombre) : [...s, nombre]));
    setOk(false);
  };

  const alternarCategoria = (c) => {
    setCategoriaSel((actual) => (actual === c ? '' : c));
    setOk(false);
  };

  async function guardarTodo() {
    setGuardando(true);
    setError(null);
    setOk(false);
    try {
      const resultados = await Promise.allSettled([
        pedir('/api/estudiante/alergias', { metodo: 'PUT', cuerpo: { alergenos: seleccion } }),
        guardarCategoriaPreferida(categoriaSel || null),
        pedir('/api/estudiante/correos', { metodo: 'PUT', cuerpo: correos }),
      ]);
      const fallo = resultados.find((r) => r.status === 'rejected');
      if (fallo) throw fallo.reason;
      setOk(true);
      window.dispatchEvent(new Event('estudiante-perfil-actualizado'));
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo v2" role="dialog" aria-modal="true" aria-label="Mi perfil">
      <div className="modal perfil-modal">
        <h2>Mi perfil</h2>

        {errorConexion ? (
          <PaginaError
            compacta
            embebido
            sinAcciones
            sinTitulo
            codigo="Error"
            mensaje="Revisa tu conexión a internet e inténtalo de nuevo. Si el problema sigue, es posible que el servicio esté detenido por unos minutos."
          />
        ) : (
          <>
            <fieldset className="grupo">
              <legend>Mis alergias</legend>
              <p className="texto-suave">Cuando el menú del día incluya alguno, verás un aviso arriba del plato.</p>
              <div className="chips-alergia">
                {catalogo.map((a) => (
                  <button
                    key={a.id_alergeno}
                    type="button"
                    className={`chip-alergia ${seleccion.includes(a.nombre) ? 'activa' : ''}`}
                    onClick={() => alternar(a.nombre)}
                    aria-pressed={seleccion.includes(a.nombre)}
                  >
                    {a.nombre}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="grupo">
              <legend>Mi categoría preferida</legend>
              <p className="texto-suave">Cuando entres al menú del día, se abrirá directamente en esta categoría</p>
              <div className="chips-alergia">
                {CATEGORIAS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`chip-alergia ${categoriaSel === c ? 'activa' : ''}`}
                    onClick={() => alternarCategoria(c)}
                    aria-pressed={categoriaSel === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="grupo">
              <legend>Mis favoritos</legend>
              {favoritos.length === 0 && <p className="texto-suave">Aún no has marcado platos como favoritos.</p>}
              {favoritos.map((f) => (
                <div key={f.id_preparacion} className="en-linea" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{f.nombre}</span>
                  <button type="button" className="boton-texto peligro" onClick={() => quitarFavorito(f.id_preparacion)}>
                    Quitar
                  </button>
                </div>
              ))}
            </fieldset>

            <fieldset className="grupo">
              <legend>Avisos por correo</legend>
              <p className="texto-suave">
                Te escribiremos a tu correo institucional. Puedes desactivarlos aquí o desde el enlace al final de cada correo.
              </p>
              <label className="interruptor-correo">
                <input type="checkbox" checked={correos.menu_semanal} onChange={() => alternarCorreo('menu_semanal')} />
                <span>
                  <strong>Menú de la semana</strong>
                  <span className="texto-suave">Cada domingo a mediodía, el menú de lunes a viernes.</span>
                </span>
              </label>
              <label className="interruptor-correo">
                <input type="checkbox" checked={correos.avisos_favoritos} onChange={() => alternarCorreo('avisos_favoritos')} />
                <span>
                  <strong>Avisos de mis favoritos</strong>
                  <span className="texto-suave">
                    Un aviso el domingo si tus favoritos están en la semana, y otro la mañana del día en que se sirven.
                  </span>
                </span>
              </label>
              {correos.menu_semanal && correos.avisos_favoritos && (
                <p className="texto-suave aviso-correo-unico">
                  Como tienes ambos activos, el domingo recibirás un solo correo: el menú semanal con tus favoritos destacados.
                </p>
              )}
              {correos.avisos_favoritos && favoritos.length === 0 && (
                <p className="texto-suave aviso-correo-unico">Marca platos con el corazón para recibir sus avisos.</p>
              )}
            </fieldset>

            {error && (
              <Mensaje tipo="error" onCerrar={() => setError(null)}>
                {error}
              </Mensaje>
            )}
            {ok && (
              <Mensaje tipo="ok" onCerrar={() => setOk(false)}>
                Cambios guardados.
              </Mensaje>
            )}
          </>
        )}

        <div className="modal-acciones">
          {!errorConexion && (
            <button type="button" className="boton boton-primario" onClick={guardarTodo} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          )}
          <button type="button" className="boton boton-secundario" onClick={onCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
