import { pedir, pedirArchivo } from './cliente';

export const iniciarSesionApi = (email, password, kiosco) =>
  pedir('/api/auth/login', { metodo: 'POST', cuerpo: { email, password, kiosco }, conToken: false });
export const consultarSesion = () => pedir('/api/auth/yo');

export const listarIngredientes = () => pedir('/api/ingredientes');
export const listarCategoriasIngrediente = () => pedir('/api/ingredientes/categorias', { conToken: false });
export const crearIngrediente = (datos) => pedir('/api/ingredientes', { metodo: 'POST', cuerpo: datos });
export const actualizarIngrediente = (id, datos) => pedir(`/api/ingredientes/${id}`, { metodo: 'PUT', cuerpo: datos });
export const eliminarIngrediente = (id) => pedir(`/api/ingredientes/${id}`, { metodo: 'DELETE' });

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
export const calcularNutricionApi = (datos) =>
  pedir('/api/preparaciones/calcular-nutricion', { metodo: 'POST', cuerpo: datos });

export const consultarPlanificacion = (fecha) => pedir(`/api/menu/planificacion?fecha=${fecha}`);
export const agregarComponente = (datos) => pedir('/api/menu/planificacion', { metodo: 'POST', cuerpo: datos });
export const actualizarComponente = (id, datos) => pedir(`/api/menu/componentes/${id}`, { metodo: 'PATCH', cuerpo: datos });
export const quitarComponente = (id) => pedir(`/api/menu/componentes/${id}`, { metodo: 'DELETE' });
export const publicarMenu = (idMenu) => pedir(`/api/menu/${idMenu}/publicar`, { metodo: 'PATCH' });
export const despublicarMenu = (idMenu) => pedir(`/api/menu/${idMenu}/despublicar`, { metodo: 'PATCH' });
export const cambiarDisponibilidad = (idComponente, estado) =>
  pedir(`/api/menu/componentes/${idComponente}/disponibilidad`, { metodo: 'PATCH', cuerpo: { estado } });

export const consultarJornadaHoy = () => pedir('/api/jornada/hoy');

export const iniciarJornada = (cantidades = {}) =>
  pedir('/api/jornada/iniciar', { metodo: 'POST', cuerpo: { cantidades } });

export const cerrarJornada = (sobrantes = {}) =>
  pedir('/api/jornada/cerrar', { metodo: 'POST', cuerpo: { sobrantes } });

export const ajustarStock = (idComponente, { accion, cantidad, observacion }) =>
  pedir(`/api/jornada/componentes/${idComponente}/stock`, {
    metodo: 'POST',
    cuerpo: { accion, cantidad, observacion },
  });

export const registrarVenta = (categoria) =>
  pedir('/api/jornada/ventas', { metodo: 'POST', cuerpo: { categoria } });

export const anularVenta = (idVentaCombo) =>
  pedir(`/api/jornada/ventas/${idVentaCombo}/anular`, { metodo: 'POST' });

export const listarUsuarios = () => pedir('/api/usuarios');
export const crearUsuario = (datos) => pedir('/api/usuarios', { metodo: 'POST', cuerpo: datos });
export const actualizarUsuario = (id, datos) => pedir(`/api/usuarios/${id}`, { metodo: 'PATCH', cuerpo: datos });
export const cambiarClave = (id, password) => pedir(`/api/usuarios/${id}/password`, { metodo: 'PUT', cuerpo: { password } });

export const consultarAnalisis = (desde, hasta) => pedir(`/api/analisis/resumen?desde=${desde}&hasta=${hasta}`);
export const consultarAnalisisDetalle = (desde, hasta, { id_preparacion, categoria } = {}) => {
  const q = new URLSearchParams({ desde, hasta });
  if (id_preparacion) q.set('id_preparacion', id_preparacion);
  if (categoria) q.set('categoria', categoria);
  return pedir(`/api/analisis/detalle?${q}`);
};
export const consultarOpinionesDetalle = (filtros = {}) => {
  const q = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '' && v !== false) q.set(k, v === true ? '1' : v); });
  return pedir(`/api/opiniones/detalle?${q}`);
};
export const consultarMensual = (arg) => (typeof arg === 'string' ? pedir(`/api/analisis/mensual?mes=${arg}`) : pedir(`/api/analisis/mensual?desde=${arg.desde}&hasta=${arg.hasta}`));

export const consultarFavoritosDetalle = (filtros = {}) => {
  const q = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => { if (v) q.set(k, v); });
  return pedir(`/api/opiniones/favoritos?${q}`);
};
export const consultarOpiniones = () => pedir('/api/opiniones');
export const consultarMes = (mes) => pedir(`/api/menu/mes?mes=${mes}`);
export const copiarMenus = (copias, sobrescribir) => pedir('/api/menu/copiar', { metodo: 'POST', cuerpo: { copias, sobrescribir } });
export const consultarSugerencias = (fecha) => pedir(`/api/prediccion/sugerencias?fecha=${fecha}`);
export const consultarPrediccionHoy = () => pedir('/api/prediccion/hoy');
export const consultarConfiabilidad = () => pedir('/api/prediccion/confiabilidad');
export const consultarConfigAuth = () => pedir('/api/auth/config', { conToken: false });
export const identificarCorreo = (email) =>
  pedir('/api/auth/identificar', { metodo: 'POST', cuerpo: { email }, conToken: false });
export const canjearTicketMicrosoft = (ticket) =>
  pedir('/api/auth/microsoft/canje', { metodo: 'POST', cuerpo: { ticket }, conToken: false });
export const urlInicioMicrosoft = (email) =>
  `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/microsoft/inicio?login_hint=${encodeURIComponent(email)}`;
export const iniciarSesionDuoc = (email) =>
  pedir('/api/auth/duoc', { metodo: 'POST', cuerpo: { email }, conToken: false });

export const actualizarCategoriaPreferida = (categoria) =>
  pedir('/api/estudiante/categoria-preferida', { metodo: 'PUT', cuerpo: { categoria } });

export const consultarOpinionesDePlato = (id) =>
  pedir(`/api/preparaciones/${id}/opiniones`, { conToken: false });
