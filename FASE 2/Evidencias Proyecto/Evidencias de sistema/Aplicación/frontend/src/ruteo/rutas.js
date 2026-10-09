export const ROLES_PANEL = ['Personal Casino', 'Administrador'];

export const PERMISOS = {
  '/panel/kiosco': ['Personal Casino', 'Administrador'],
  '/panel/menu': ['Personal Casino', 'Administrador'],
  '/panel/preparaciones': ['Administrador'],
  '/panel/usuarios': ['Administrador'],
  '/panel/analisis': ['Administrador'],
};

export const NAVEGACION = [
  { ruta: '/panel/kiosco', etiqueta: 'Disponibilidad' },
  { ruta: '/panel/menu', etiqueta: 'Planificación del menú' },
  { ruta: '/panel/preparaciones', etiqueta: 'Preparaciones' },
  { ruta: '/panel/usuarios', etiqueta: 'Usuarios' },
  { ruta: '/panel/analisis', etiqueta: 'Análisis' },
];

export function rutaInicial(rol, kiosco) {
  if (kiosco) return '/panel/kiosco';
  return rol === 'Administrador' ? '/panel/preparaciones' : '/panel/menu';
}
