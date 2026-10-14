export const ROLES_PANEL = ['Personal Casino', 'Administrador', 'Cajero', 'Nutricionista'];

export const PERMISOS = {
  '/panel/caja': ['Cajero', 'Personal Casino', 'Administrador'],
  '/panel/kiosco': ['Personal Casino', 'Administrador'],
  '/panel/menu': ['Personal Casino', 'Administrador', 'Nutricionista'],
  '/panel/ingredientes': ['Administrador', 'Nutricionista'],
  '/panel/preparaciones': ['Administrador', 'Nutricionista'],
  '/panel/usuarios': ['Administrador'],
  '/panel/analisis': ['Administrador'],
};

export const NAVEGACION = [
  { ruta: '/panel/kiosco', etiqueta: 'Disponibilidad' },
  { ruta: '/panel/menu', etiqueta: 'Planificación del menú' },
  { ruta: '/panel/ingredientes', etiqueta: 'Ingredientes' },
  { ruta: '/panel/preparaciones', etiqueta: 'Preparaciones' },
  { ruta: '/panel/usuarios', etiqueta: 'Usuarios' },
  { ruta: '/panel/analisis', etiqueta: 'Análisis' },
];

export function rutaInicial(rol, kiosco) {
  if (rol === 'Estudiante') return '/';
  if (rol === 'Cajero') return '/panel/caja';
  if (kiosco) return '/panel/kiosco';
  return rol === 'Administrador' ? '/panel/preparaciones' : '/panel/menu';
}
