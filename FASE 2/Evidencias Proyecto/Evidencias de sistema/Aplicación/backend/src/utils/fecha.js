const ZONA = 'America/Santiago';

function aISOChile(fecha) {
  return fecha.toLocaleDateString('en-CA', { timeZone: ZONA }); // YYYY-MM-DD
}

function hoyChile() {
  return aISOChile(new Date());
}

function haceDiasChile(dias) {
  return aISOChile(new Date(Date.now() - dias * 24 * 60 * 60 * 1000));
}

function esFechaISO(valor) {
  return typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) && !isNaN(Date.parse(valor));
}

module.exports = { hoyChile, haceDiasChile, esFechaISO };
