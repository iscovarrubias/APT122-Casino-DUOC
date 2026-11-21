export const FORMULARIO_VACIO = {
  nombre: '',
  descripcion: '',
  imagen_url: '',
  ingredientes: [],
  porciones_receta: '',
  origen: 'manual',
  alergenos: [],
  calorias: '',
  proteinas_g: '',
  carbohidratos_g: '',
  grasas_g: '',
  tipo: '',
};

export function desdePreparacion(p) {
  const n = p.nutricion;
  return {
    nombre: p.nombre,
    descripcion: p.descripcion || '',
    imagen_url: p.imagen_url || '',
    ingredientes: (p.ingredientes_detalle || []).map((i) => ({
      id_ingrediente: String(i.id_ingrediente),
      cantidad_g: i.cantidad_g != null ? String(Number(i.cantidad_g)) : '',
    })),
    porciones_receta: p.porciones_receta != null ? String(p.porciones_receta) : '',
    origen: n?.origen || 'manual',
    alergenos: p.alergenos || [],
    calorias: n?.calorias != null ? String(n.calorias) : '',
    proteinas_g: n?.proteinas_g != null ? String(n.proteinas_g) : '',
    carbohidratos_g: n?.carbohidratos_g != null ? String(n.carbohidratos_g) : '',
    grasas_g: n?.grasas_g != null ? String(n.grasas_g) : '',
    tipo: p.tipo || '',
  };
}

export const aNumeroONulo = (texto) => (texto.trim() === '' ? null : Number(texto));

export function estadoNutricion(p) {
  if (!p.nutricion || p.nutricion.calorias == null) return { texto: 'Sin información nutricional', faltante: true };
  return { texto: p.nutricion.origen === 'calculada' ? 'Nutrición calculada' : 'Nutrición ingresada' };
}

export const TIPOS_ACOMPANAMIENTO = ['Ensalada', 'Sopa', 'Pan', 'Postre', 'Fruta', 'Bebida'];

export const FILA_VACIA = { id_ingrediente: '', cantidad_g: '' };
export const MOTIVOS = { sin_cantidad: 'falta la cantidad', sin_datos_nutricionales: 'faltan sus datos nutricionales' };
export const PROBLEMAS = {
  porciones_invalidas: 'Indica cuántas porciones rinde la receta (número entero mayor a 0).',
  sin_ingredientes: 'Agrega al menos un ingrediente.',
  sin_ingredientes_cuantificables: 'Agrega al menos un ingrediente con cantidad (los condimentos no cuentan).',
};

export function desdeVariacion(base) {
  return { ...desdePreparacion(base), nombre: `${base.nombre} (variación)` };
}

export const COLORES_TIPO = { Entrada: '#318386', Postre: '#B15FBB', Bebida: '#4C8FD1' };
export const esPlato = (p) => !p.tipo || p.tipo === 'Plato Principal';
