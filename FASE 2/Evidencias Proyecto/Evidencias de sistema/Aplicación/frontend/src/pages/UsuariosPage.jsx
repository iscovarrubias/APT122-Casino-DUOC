import { useState, useEffect, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { listarUsuarios, crearUsuario, actualizarUsuario, cambiarClave } from '../api/gestion';
import { useAuth } from '../context/auth-context';
import Mensaje from '../components/Mensaje';
import ModalFormulario from '../components/ModalFormulario';
import Cargando from '../components/Cargando';

const ROLES = ['Personal Casino', 'Cajero', 'Nutricionista', 'Administrador', 'Estudiante'];
const VACIO = { nombre: '', email: '', password: '', rol: 'Personal Casino' };

export default function UsuariosPage() {
  const { usuario: yo } = useAuth();
  const [lista, setLista] = useState(null);
  const [nuevo, setNuevo] = useState(VACIO);
  const [creando, setCreando] = useState(false);
  const [claveDe, setClaveDe] = useState(null);
  const [error, setError] = useState(null);
  const [errorForm, setErrorForm] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    try {
      setLista(await listarUsuarios());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function ejecutar(accion, mensajeOk, alFallar = setError) {
    setOcupado(true);
    setError(null);
    setErrorForm(null);
    setAviso(null);
    try {
      await accion();
      setAviso(mensajeOk);
      await cargar();
      return true;
    } catch (err) {
      alFallar(err.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function crear(evento) {
    evento.preventDefault();
    const ok = await ejecutar(
      () => crearUsuario({ ...nuevo, nombre: nuevo.nombre.trim(), email: nuevo.email.trim() }),
      'Usuario creado.',
      setErrorForm,
    );
    if (ok) { setNuevo(VACIO); setCreando(false); }
  }

  async function guardarClave(evento) {
    evento.preventDefault();
    const ok = await ejecutar(() => cambiarClave(claveDe.id, claveDe.valor), 'Contraseña actualizada.');
    if (ok) setClaveDe(null);
  }


  return (
    <div className="v2">
      <div className="v2-barra">
        <button type="button" className="boton boton-primario boton-con-icono" onClick={() => { setErrorForm(null); setCreando(true); }}>
          <Plus size={16} aria-hidden="true" /> Nuevo usuario
        </button>
      </div>

      {error && <Mensaje tipo="error" onCerrar={() => setError(null)}>{error}</Mensaje>}
      {aviso && <Mensaje tipo="ok" onCerrar={() => setAviso(null)}>{aviso}</Mensaje>}
      {!lista && !error && <Cargando>Cargando usuarios…</Cargando>}

      {lista && lista.length === 0 && (
        <div className="v2-vacio"><strong>Aún no hay usuarios</strong>Crea la primera cuenta con “Nuevo usuario”.</div>
      )}

      {lista && lista.length > 0 && (
        <div className="tabla-contenedor">
          <table className="tabla tabla-usuarios">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Estado</th><th className="col-fin">Acciones</th></tr></thead>
            <tbody>
              {lista.map((u) => {
                const esYo = u.id_usuario === yo.id_usuario;
                return (
                  <tr key={u.id_usuario} className={u.activo ? '' : 'fila-inactiva'}>
                    <td>
                      <div className="v2-persona">
                        <strong>{u.nombre}{esYo && <span> (tú)</span>}</strong>
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <select value={u.rol} disabled={ocupado || esYo} aria-label={`Rol de ${u.nombre}`}
                        onChange={(e) => ejecutar(() => actualizarUsuario(u.id_usuario, { rol: e.target.value }), 'Rol actualizado.')}>
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td><span className={`v2-estado ${u.activo ? '' : 'inactivo'}`}>{u.activo ? 'Activo' : 'Desactivado'}</span></td>
                    <td className="col-fin">
                      {claveDe?.id === u.id_usuario ? (
                        <form className="v2-clave" onSubmit={guardarClave}>
                          <input type="password" minLength="8" placeholder="Nueva contraseña (mín. 8)" aria-label={`Nueva contraseña de ${u.nombre}`} value={claveDe.valor}
                            onChange={(e) => setClaveDe({ ...claveDe, valor: e.target.value })} autoComplete="new-password" required autoFocus />
                          <button type="submit" className="boton boton-primario" disabled={ocupado}>Guardar</button>
                          <button type="button" className="boton boton-secundario" onClick={() => setClaveDe(null)}>Cancelar</button>
                        </form>
                      ) : (
                        <div className="v2-acciones">
                          <button type="button" className="boton-texto" onClick={() => setClaveDe({ id: u.id_usuario, valor: '' })}>Cambiar contraseña</button>
                          {!esYo && (
                            <button type="button" className={`boton-texto ${u.activo ? 'peligro' : ''}`} disabled={ocupado}
                              onClick={() => ejecutar(() => actualizarUsuario(u.id_usuario, { activo: !u.activo }), u.activo ? 'Usuario desactivado.' : 'Usuario reactivado.')}>
                              {u.activo ? 'Desactivar' : 'Reactivar'}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creando && (
        <ModalFormulario
          titulo="Nuevo usuario"
          ancho="medio"
          onSubmit={crear}
          onCancelar={() => { setCreando(false); setNuevo(VACIO); }}
          guardando={ocupado}
          textoGuardar="Crear usuario"
          error={errorForm}
          onCerrarError={() => setErrorForm(null)}
        >
          <div className="v2 v2-formulario">
            <label className="campo"><span>Nombre</span>
              <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required autoFocus /></label>
            <label className="campo"><span>Correo</span>
              <input type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} required /></label>
            <label className="campo"><span>Contraseña</span>
              <input type="password" minLength="8" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} autoComplete="new-password" required />
              <p className="campo-ayuda">Mínimo 8 caracteres.</p></label>
            <label className="campo"><span>Rol</span>
              <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
                {ROLES.map((r) => <option key={r}>{r}</option>)}
              </select></label>
          </div>
        </ModalFormulario>
      )}
    </div>
  );
}
