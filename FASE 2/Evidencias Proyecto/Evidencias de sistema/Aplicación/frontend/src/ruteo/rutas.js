export const ROLES_PANEL = ['Personal Casino', 'Administrador', 'Cajero', 'Nutricionista'];

export const PERMISOS = {
  '/panel/caja': ['Cajero', 'Personal Casino', 'Administrador'],
  '/panel/kiosco': ['Personal Casino', 'Administrador'],
  '/panel/menu': ['Personal Casino', 'Administrador', 'Nutricionista'],
  '/panel/ingredientes': ['Administrador', 'Nutricionista'],
  '/panel/preparaciones': ['Administrador', 'Nutricionista'],
  '/panel/usuarios': ['Administrador'],
  '/panel/analisis': ['Administrador', 'Nutricionista'],
};

export const NAVEGACION = [
  { ruta: '/panel/kiosco', etiqueta: 'Disponibilidad', corta: 'Disponibilidad' },
  { ruta: '/panel/menu', etiqueta: 'Planificación del menú', corta: 'Menú' },
  { ruta: '/panel/ingredientes', etiqueta: 'Ingredientes', corta: 'Ingredientes' },
  { ruta: '/panel/preparaciones', etiqueta: 'Preparaciones', corta: 'Preparaciones' },
  { ruta: '/panel/analisis', etiqueta: 'Análisis', corta: 'Análisis' },
  { ruta: '/panel/usuarios', etiqueta: 'Usuarios', corta: 'Usuarios' },
];

export function rutaInicial(rol, kiosco) {
  if (rol === 'Estudiante') return '/';
  if (rol === 'Cajero') return '/panel/caja';
  if (kiosco) return '/panel/kiosco';
  return '/panel/menu';
}
