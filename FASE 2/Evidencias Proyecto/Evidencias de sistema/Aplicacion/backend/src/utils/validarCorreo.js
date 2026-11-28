const LARGO_MAXIMO = 254;
const FORMATO = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

function esCorreoValido(valor) {
  return typeof valor === 'string' && valor.length <= LARGO_MAXIMO && FORMATO.test(valor);
}

module.exports = { esCorreoValido, LARGO_MAXIMO };
