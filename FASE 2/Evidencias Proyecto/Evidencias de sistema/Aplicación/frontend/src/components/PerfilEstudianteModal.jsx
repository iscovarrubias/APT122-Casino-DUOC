import { useState, useEffect } from 'react';
import { useEstudiante } from '../utils/estudiante';
import { pedir } from '../api/cliente';
import { useAuth } from '../context/auth-context';

export default function PerfilEstudianteModal({ onCerrar }) {
  const { usuario } = useAuth();
  const { alergias, favoritos, quitarFavorito, categoriaPreferida, guardarCategoriaPreferida } = useEstudiante();
  const [seleccion, setSeleccion] = useState(alergias);
  const [catalogo, setCatalogo] = useState([]);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const CATEGORIAS = ['Principal', 'JUNAEB', 'Vegetariano', 'Hipocalórico'];
  const [categoriaSel, setCategoriaSel] = useState(categoriaPreferida || '');
  const [guardandoCat, setGuardandoCat] = useState(false);
  const [okCat, setOkCat] = useState(false);

  async function guardarCategoria() {
    setGuardandoCat(true);
    setOkCat(false);
    try {
      await guardarCategoriaPreferida(categoriaSel || null);
      setOkCat(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardandoCat(false);
    }
  }

  useEffect(() => {
    pedir('/api/preparaciones/alergenos', { conToken: false })
      .then(setCatalogo)
      .catch((err) => setError(err.message));
  }, []);

  const alternar = (nombre) => {
    setSeleccion((s) => s.includes(nombre) ? s.filter((a) => a !== nombre) : [...s, nombre]);
    setOk(false);
  };

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await pedir('/api/estudiante/alergias', { metodo: 'PUT', cuerpo: { alergenos: seleccion } });
      setOk(true);
      window.dispatchEvent(new Event('estudiante-perfil-actualizado'));
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="modal-fondo" role="dialog" aria-modal="true" aria-label="Mi perfil">
      <div className="modal">
        <h2>Mi perfil</h2>
        <p className="texto-suave">
         Aquí puedes marcar tus alergias y revisar tus platos favoritos.
        </p>

        <fieldset className="grupo">
          <legend>Mis alergias</legend>
          <p className="texto-suave">
            Marca los alérgenos que te afectan. Cuando el menú del día incluya alguno, verás un aviso arriba del plato.
          </p>
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
          {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
          {ok && <div className="mensaje mensaje-ok" role="status">Alergias guardadas.</div>}
          <div className="en-linea">
            <button className="boton boton-primario" onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar alergias'}
            </button>
            <span className="texto-suave" style={{ margin: 0 }}>
              {seleccion.length === 0 ? 'Sin alergias marcadas.' : `${seleccion.length} marcada(s).`}
            </span>
          </div>
        </fieldset>

        <fieldset className="grupo">
          <legend>Mi categoría preferida</legend>
          <p className="texto-suave">
            Cuando entres al menú del día, se abrirá directamente en esta categoría. Puedes cambiarla en cualquier momento desde el menú.
          </p>
          <div className="chips-alergia">
            {CATEGORIAS.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip-alergia ${categoriaSel === c ? 'activa' : ''}`}
                onClick={() => { setCategoriaSel(c); setOkCat(false); }}
                aria-pressed={categoriaSel === c}
              >
                {c}
              </button>
            ))}
          </div>
          {okCat && <div className="mensaje mensaje-ok" role="status">Categoría preferida guardada.</div>}
          <div className="en-linea">
            <button className="boton boton-primario" onClick={guardarCategoria} disabled={guardandoCat}>
              {guardandoCat ? 'Guardando…' : 'Guardar categoría'}
            </button>
            {categoriaSel && (
              <button type="button" className="boton boton-secundario" onClick={() => { setCategoriaSel(''); setOkCat(false); }}>
                Quitar preferencia
              </button>
            )}
            <span className="texto-suave" style={{ margin: 0 }}>
              {categoriaSel ? `Se abrirá en ${categoriaSel}.` : 'Sin preferencia: se abre en Principal.'}
            </span>
          </div>
        </fieldset>

        <fieldset className="grupo">
          <legend>Mis favoritos</legend>
          {favoritos.length === 0 && <p className="texto-suave">Aún no has marcado platos como favoritos. Hazlo desde el menú del día.</p>}
          {favoritos.map((f) => (
            <div key={f.id_preparacion} className="en-linea" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span>{f.nombre}</span>
              <button
                type="button"
                className="boton boton-peligro boton-chico"
                onClick={() => quitarFavorito(f.id_preparacion)}
              >
                Quitar
              </button>
            </div>
          ))}
        </fieldset>

        <div className="modal-acciones">
          <button type="button" className="boton boton-secundario" onClick={onCerrar}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}