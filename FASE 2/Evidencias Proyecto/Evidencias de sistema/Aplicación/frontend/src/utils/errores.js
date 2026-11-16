export const ERRORES = {
  0: {
    titulo: 'No pudimos conectar con el servidor',
    mensaje: 'Revisa tu conexión a internet e inténtalo de nuevo. Si el problema sigue, es posible que el servicio esté detenido por unos minutos.',
    icono: 'conexion', tipo: 'conexion', reintentar: true,
  },
  400: {
    titulo: 'Solicitud incorrecta',
    mensaje: 'Los datos enviados no son válidos o están incompletos. Revisa la información e inténtalo de nuevo.',
    icono: 'alerta', tipo: 'cliente', reintentar: false,
  },
  401: {
    titulo: 'Necesitas iniciar sesión',
    mensaje: 'Tu sesión expiró o aún no has ingresado. Inicia sesión con tu correo institucional para continuar.',
    icono: 'candado', tipo: 'cliente', reintentar: false, accion: 'login',
  },
  403: {
    titulo: 'No tienes permiso para ver esto',
    mensaje: 'Tu cuenta no tiene acceso a esta sección. Si crees que es un error, habla con soporte.',
    icono: 'escudo', tipo: 'cliente', reintentar: false,
  },
  404: {
    titulo: 'No encontramos esta página',
    mensaje: 'La dirección no existe o cambió. Vuelve al inicio para seguir navegando.',
    icono: 'brujula', tipo: 'cliente', reintentar: false,
  },
  408: {
    titulo: 'La conexión tardó demasiado',
    mensaje: 'El servidor cerró la conexión porque la solicitud tardó mucho en llegar. Inténtalo otra vez.',
    icono: 'reloj', tipo: 'cliente', reintentar: true,
  },
  409: {
    titulo: 'No se pudo completar la acción',
    mensaje: 'El estado actual del sistema no lo permite. Actualiza la página.',
    icono: 'alerta', tipo: 'cliente', reintentar: true,
  },
  413: {
    titulo: 'El archivo es demasiado grande',
    mensaje: 'La imagen supera el tamaño máximo permitido de 3 MB. Elige una más liviana.',
    icono: 'alerta', tipo: 'cliente', reintentar: false,
  },
  429: {
    titulo: 'Demasiados intentos',
    mensaje: 'Hiciste muchas solicitudes en poco tiempo. Espera unos minutos antes de volver a intentarlo.',
    icono: 'reloj', tipo: 'cliente', reintentar: true,
  },
  500: {
    titulo: 'Algo salió mal en el servidor',
    mensaje: 'Ocurrió un error inesperado de nuestro lado. Ya quedó registrado; inténtalo de nuevo en unos minutos.',
    icono: 'servidor', tipo: 'servidor', reintentar: true,
  },
  502: {
    titulo: 'Problema de comunicación entre servidores',
    mensaje: 'Un servidor intermedio recibió una respuesta inválida. Suele resolverse solo, inténtalo de nuevo en un momento.',
    icono: 'servidor', tipo: 'servidor', reintentar: true,
  },
  503: {
    titulo: 'Servicio no disponible por ahora',
    mensaje: 'El sistema está en mantenimiento o recibiendo demasiadas visitas. Vuelve a intentarlo en unos minutos.',
    icono: 'herramienta', tipo: 'servidor', reintentar: true,
  },
  504: {
    titulo: 'El servidor tardó demasiado en responder',
    mensaje: 'La respuesta demoró más de lo esperado. Inténtalo de nuevo',
    icono: 'reloj', tipo: 'servidor', reintentar: true,
  },
};

const GENERICO_CLIENTE = {
  titulo: 'No pudimos procesar tu solicitud',
  mensaje: 'Ocurrió un problema con la solicitud. Vuelve al inicio e inténtalo de nuevo.',
  icono: 'alerta', tipo: 'cliente', reintentar: false,
};
const GENERICO_SERVIDOR = {
  titulo: 'Error del servidor',
  mensaje: 'El servidor tuvo un problema inesperado. Inténtalo de nuevo en unos minutos.',
  icono: 'servidor', tipo: 'servidor', reintentar: true,
};
const GENERICO = {
  titulo: 'Ocurrió un error inesperado',
  mensaje: 'Algo no salió como esperábamos. Recarga la página para continuar.',
  icono: 'alerta', tipo: 'servidor', reintentar: true,
};

export function infoError(codigo) {
  const n = Number(codigo);
  if (codigo === null || codigo === undefined || codigo === '' || Number.isNaN(n)) return { codigo: null, ...GENERICO };
  if (ERRORES[n]) return { codigo: n, ...ERRORES[n] };
  if (n >= 500 && n < 600) return { codigo: n, ...GENERICO_SERVIDOR };
  if (n >= 400 && n < 500) return { codigo: n, ...GENERICO_CLIENTE };
  return { codigo: null, ...GENERICO };
}
