const NUTRIENTES = {
  calorias: 'calorias_100g',
  proteinas_g: 'proteinas_100g',
  carbohidratos_g: 'carbohidratos_100g',
  grasas_g: 'grasas_100g',
};

const aNumero = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const redondear = (n) => Math.round(n * 10) / 10;

function calcularNutricion({ porciones, ingredientes }) {
  const problemas = [];
  const sin_datos = [];
  const omitidos = [];
  const total = Object.fromEntries(Object.keys(NUTRIENTES).map((k) => [k, 0]));
  let contados = 0;

  const p = aNumero(porciones);
  if (p === null || !Number.isInteger(p) || p <= 0) problemas.push('porciones_invalidas');

  const lista = Array.isArray(ingredientes) ? ingredientes : [];
  if (lista.length === 0) problemas.push('sin_ingredientes');

  for (const ing of lista) {
    if (ing.sin_cuantificar) {
      omitidos.push(ing.nombre);
      continue;
    }
    const gramos = aNumero(ing.cantidad_g);
    if (gramos === null || !(gramos > 0)) {
      sin_datos.push({ nombre: ing.nombre, motivo: 'sin_cantidad' });
      continue;
    }
    const valores = Object.values(NUTRIENTES).map((campo) => aNumero(ing[campo]));
    if (valores.some((v) => v === null || !(v >= 0))) {
      sin_datos.push({ nombre: ing.nombre, motivo: 'sin_datos_nutricionales' });
      continue;
    }
    Object.keys(NUTRIENTES).forEach((k, i) => { total[k] += (gramos / 100) * valores[i]; });
    contados++;
  }

  if (lista.length > 0 && contados === 0 && sin_datos.length === 0) problemas.push('sin_ingredientes_cuantificables');

  const completo = problemas.length === 0 && sin_datos.length === 0;
  const por_porcion = completo
    ? Object.fromEntries(Object.keys(NUTRIENTES).map((k) => [k, redondear(total[k] / p)]))
    : null;

  return { completo, problemas, sin_datos, omitidos, por_porcion };
}

module.exports = { calcularNutricion };
