import { pedir, pedirArchivo } from './cliente';

// --- Sesión ---------------------------------------------------------------
export const iniciarSesionApi = (email, password, kiosco) =>
  pedir('/api/auth/login', { metodo: 'POST', cuerpo: { email, password, kiosco }, conToken: false });
export const consultarSesion = () => pedir('/api/auth/yo');

// --- Ingredientes (administrador) -----------------------------------------
export const listarIngredientes = () => pedir('/api/ingredientes');
export const listarCategoriasIngrediente = () => pedir('/api/ingredientes/categorias', { conToken: false });
export const crearIngrediente = (datos) => pedir('/api/ingredientes', { metodo: 'POST', cuerpo: datos });
export const actualizarIngrediente = (id, datos) => pedir(`/api/ingredientes/${id}`, { metodo: 'PUT', cuerpo: datos });
export const eliminarIngrediente = (id) => pedir(`/api/ingredientes/${id}`, { metodo: 'DELETE' });

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
export const calcularNutricionApi = (datos) =>
  pedir('/api/preparaciones/calcular-nutricion', { metodo: 'POST', cuerpo: datos });

// --- Planificación y disponibilidad (personal y administrador) -------------
export const consultarPlanificacion = (fecha) => pedir(`/api/menu/planificacion?fecha=${fecha}`);
export const agregarComponente = (datos) => pedir('/api/menu/planificacion', { metodo: 'POST', cuerpo: datos });
export const actualizarComponente = (id, datos) => pedir(`/api/menu/componentes/${id}`, { metodo: 'PATCH', cuerpo: datos });
export const quitarComponente = (id) => pedir(`/api/menu/componentes/${id}`, { metodo: 'DELETE' });
export const publicarMenu = (idMenu) => pedir(`/api/menu/${idMenu}/publicar`, { metodo: 'PATCH' });
export const despublicarMenu = (idMenu) => pedir(`/api/menu/${idMenu}/despublicar`, { metodo: 'PATCH' });
export const cambiarDisponibilidad = (idComponente, estado) =>
  pedir(`/api/menu/componentes/${idComponente}/disponibilidad`, { metodo: 'PATCH', cuerpo: { estado } });

// --- Jornada del día (cajero / cocina) ------------------------------------
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

// --- Usuarios (administrador) ---------------------------------------------
export const listarUsuarios = () => pedir('/api/usuarios');
export const crearUsuario = (datos) => pedir('/api/usuarios', { metodo: 'POST', cuerpo: datos });
export const actualizarUsuario = (id, datos) => pedir(`/api/usuarios/${id}`, { metodo: 'PATCH', cuerpo: datos });
export const cambiarClave = (id, password) => pedir(`/api/usuarios/${id}/password`, { metodo: 'PUT', cuerpo: { password } });

// --- Análisis (administrador) ---------------------------------------------
export const consultarAnalisis = (desde, hasta) => pedir(`/api/analisis/resumen?desde=${desde}&hasta=${hasta}`);
export const consultarMensual = (mes) => pedir(`/api/analisis/mensual?mes=${mes}`);

// --- Sprint 8: opiniones, planificación mensual, copiar menús y predicción ---------------
export const consultarOpiniones = () => pedir('/api/opiniones');
export const consultarMes = (mes) => pedir(`/api/menu/mes?mes=${mes}`);
export const copiarMenus = (copias, sobrescribir) => pedir('/api/menu/copiar', { metodo: 'POST', cuerpo: { copias, sobrescribir } });
export const consultarSugerencias = (fecha) => pedir(`/api/prediccion/sugerencias?fecha=${fecha}`);
export const consultarPrediccionHoy = () => pedir('/api/prediccion/hoy');
export const consultarConfiabilidad = () => pedir('/api/prediccion/confiabilidad');
// --- Sprint 8: SSO simulado del estudiante --------------------------------
export const consultarConfigAuth = () => pedir('/api/auth/config', { conToken: false });
export const iniciarSesionDuoc = (email) =>
  pedir('/api/auth/duoc', { metodo: 'POST', cuerpo: { email }, conToken: false });

export const actualizarCategoriaPreferida = (categoria) =>
  pedir('/api/estudiante/categoria-preferida', { metodo: 'PUT', cuerpo: { categoria } });

export const consultarOpinionesDePlato = (id) =>
  pedir(`/api/preparaciones/${id}/opiniones`, { conToken: false });
