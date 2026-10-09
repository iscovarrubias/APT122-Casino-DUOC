import { useState, useEffect, useCallback } from 'react';
import { listarUsuarios, crearUsuario, actualizarUsuario, cambiarClave } from '../api/gestion';
import { useAuth } from '../context/auth-context';

const ROLES = ['Personal Casino', 'Administrador', 'Estudiante'];
const VACIO = { nombre: '', email: '', password: '', rol: 'Personal Casino' };

export default function UsuariosPage() {
  const { usuario: yo } = useAuth();
  const [lista, setLista] = useState(null);
  const [nuevo, setNuevo] = useState(VACIO);
  const [claveDe, setClaveDe] = useState(null); 
  const [error, setError] = useState(null);
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

  async function ejecutar(accion, mensajeOk) {
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      await accion();
      setAviso(mensajeOk);
      await cargar();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function crear(evento) {
    evento.preventDefault();
    const ok = await ejecutar(() => crearUsuario({ ...nuevo, nombre: nuevo.nombre.trim(), email: nuevo.email.trim() }), 'Usuario creado.');
    if (ok) setNuevo(VACIO);
  }

  async function guardarClave(evento) {
    evento.preventDefault();
    const ok = await ejecutar(() => cambiarClave(claveDe.id, claveDe.valor), 'Contraseña actualizada.');
    if (ok) setClaveDe(null);
  }

  return (
    <>
      <form className="formulario tarjeta" onSubmit={crear}>
        <h2>Nuevo usuario</h2>
        <p className="texto-suave">
          Las cuentas las crea el administrador; no hay registro público. Los estudiantes, docentes y otros trabajadores consultan el menú sin cuenta.
        </p>
        <div className="rejilla-4">
          <label className="campo"><span>Nombre</span>
            <input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required /></label>
          <label className="campo"><span>Correo</span>
            <input type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} required /></label>
          <label className="campo"><span>Contraseña (mínimo 8 caracteres)</span>
            <input type="password" minLength="8" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} autoComplete="new-password" required /></label>
          <label className="campo"><span>Rol</span>
            <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select></label>
        </div>
        <div><button type="submit" className="boton boton-primario" disabled={ocupado}>Crear usuario</button></div>
      </form>

      {error && <div className="mensaje mensaje-error" role="alert">{error}</div>}
      {aviso && <div className="mensaje mensaje-ok" role="status">{aviso}</div>}
      {!lista && !error && <div className="estado-info">Cargando usuarios…</div>}

      {lista && (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {lista.map((u) => {
                const esYo = u.id_usuario === yo.id_usuario;
                return (
                  <tr key={u.id_usuario} className={u.activo ? '' : 'fila-inactiva'}>
                    <td><strong>{u.nombre}</strong>{esYo && <span className="texto-suave"> (tú)</span>}</td>
                    <td>{u.email}</td>
                    <td>
                      <select value={u.rol} disabled={ocupado || esYo} aria-label={`Rol de ${u.nombre}`}
                        onChange={(e) => ejecutar(() => actualizarUsuario(u.id_usuario, { rol: e.target.value }), 'Rol actualizado.')}>
                        {ROLES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td><span className={`insignia ${u.activo ? 'insignia-ok' : 'insignia-neutra'}`}>{u.activo ? 'Activo' : 'Desactivado'}</span></td>
                    <td className="celda-acciones">
                      {claveDe?.id === u.id_usuario ? (
                        <form className="en-linea" onSubmit={guardarClave}>
                          <input type="password" minLength="8" placeholder="Nueva contraseña" value={claveDe.valor}
                            onChange={(e) => setClaveDe({ ...claveDe, valor: e.target.value })} autoComplete="new-password" required />
                          <button type="submit" className="boton boton-primario" disabled={ocupado}>Guardar</button>
                          <button type="button" className="boton boton-secundario" onClick={() => setClaveDe(null)}>Cancelar</button>
                        </form>
                      ) : (
                        <>
                          <button className="boton boton-secundario" onClick={() => setClaveDe({ id: u.id_usuario, valor: '' })}>Cambiar contraseña</button>
                          {!esYo && (
                            <button className={`boton ${u.activo ? 'boton-peligro' : 'boton-secundario'}`} disabled={ocupado}
                              onClick={() => ejecutar(() => actualizarUsuario(u.id_usuario, { activo: !u.activo }), u.activo ? 'Usuario desactivado.' : 'Usuario reactivado.')}>
                              {u.activo ? 'Desactivar' : 'Reactivar'}
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
