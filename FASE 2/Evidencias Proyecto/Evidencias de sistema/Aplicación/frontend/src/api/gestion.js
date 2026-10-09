import { pedir, pedirArchivo } from './cliente';

// --- Sesión ---------------------------------------------------------------
export const iniciarSesionApi = (email, password, kiosco) =>
  pedir('/api/auth/login', { metodo: 'POST', cuerpo: { email, password, kiosco }, conToken: false });
export const consultarSesion = () => pedir('/api/auth/yo');

// --- Preparaciones (administrador) -----------------------------------------
export const listarPreparaciones = () => pedir('/api/preparaciones/gestion');
export const listarCatalogoAlergenos = () => pedir('/api/preparaciones/alergenos', { conToken: false });
export const listarTiposComponente = () => pedir('/api/preparaciones/tipos', { conToken: false });
export const crearPreparacion = (datos) => pedir('/api/preparaciones', { metodo: 'POST', cuerpo: datos });
export const actualizarPreparacion = (id, datos) => pedir(`/api/preparaciones/${id}`, { metodo: 'PUT', cuerpo: datos });
export const desactivarPreparacion = (id) => pedir(`/api/preparaciones/${id}/desactivar`, { metodo: 'PATCH' });
export const reactivarPreparacion = (id) => pedir(`/api/preparaciones/${id}/reactivar`, { metodo: 'PATCH' });
export const eliminarPreparacion = (id) => pedir(`/api/preparaciones/${id}`, { metodo: 'DELETE' });
export const asignarAlergenos = (id, alergenos) => pedir(`/api/preparaciones/${id}/alergenos`, { metodo: 'PUT', cuerpo: { alergenos } });
export const guardarNutricion = (id, datos) => pedir(`/api/preparaciones/${id}/nutricion`, { metodo: 'PUT', cuerpo: datos });
export const subirImagen = (archivo) => pedirArchivo('/api/preparaciones/imagen', archivo);

// --- Planificación y disponibilidad (personal y administrador) --------------
export const consultarPlanificacion = (fecha) => pedir(`/api/menu/planificacion?fecha=${fecha}`);
export const agregarComponente = (datos) => pedir('/api/menu/planificacion', { metodo: 'POST', cuerpo: datos });
export const actualizarComponente = (id, datos) => pedir(`/api/menu/componentes/${id}`, { metodo: 'PATCH', cuerpo: datos });
export const quitarComponente = (id) => pedir(`/api/menu/componentes/${id}`, { metodo: 'DELETE' });
export const publicarMenu = (idMenu) => pedir(`/api/menu/${idMenu}/publicar`, { metodo: 'PATCH' });
export const despublicarMenu = (idMenu) => pedir(`/api/menu/${idMenu}/despublicar`, { metodo: 'PATCH' });
export const cambiarDisponibilidad = (idComponente, estado) =>
  pedir(`/api/menu/componentes/${idComponente}/disponibilidad`, { metodo: 'PATCH', cuerpo: { estado } });

// --- Usuarios (administrador) ---------------------------------------------
export const listarUsuarios = () => pedir('/api/usuarios');
export const crearUsuario = (datos) => pedir('/api/usuarios', { metodo: 'POST', cuerpo: datos });
export const actualizarUsuario = (id, datos) => pedir(`/api/usuarios/${id}`, { metodo: 'PATCH', cuerpo: datos });
export const cambiarClave = (id, password) => pedir(`/api/usuarios/${id}/password`, { metodo: 'PUT', cuerpo: { password } });

// --- Análisis (administrador) ---------------------------------------------
export const consultarAnalisis = (desde, hasta) => pedir(`/api/analisis/resumen?desde=${desde}&hasta=${hasta}`);
