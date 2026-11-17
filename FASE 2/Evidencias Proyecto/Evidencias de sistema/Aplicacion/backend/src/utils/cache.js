const entradas = new Map();

function con(clave, ttlMs, cargar) {
  const ahora = Date.now();
  const existente = entradas.get(clave);
  if (existente && existente.expira > ahora) return existente.promesa;
  const promesa = cargar().catch((err) => {
    entradas.delete(clave);
    throw err;
  });
  entradas.set(clave, { promesa, expira: ahora + ttlMs });
  return promesa;
}

function invalidar() {
  entradas.clear();
}

module.exports = { con, invalidar };