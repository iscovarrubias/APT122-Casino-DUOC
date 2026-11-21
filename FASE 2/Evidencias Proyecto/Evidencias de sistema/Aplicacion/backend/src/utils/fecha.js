const ZONA = 'America/Santiago';

function aISOChile(fecha) {
  return fecha.toLocaleDateString('en-CA', { timeZone: ZONA });
}

function hoyChile() {
  return aISOChile(new Date());
}

function haceDiasChile(dias) {
  return aISOChile(new Date(Date.now() - dias * 24 * 60 * 60 * 1000));
}

function horaChile() {
  return new Date().toLocaleTimeString('en-GB', { timeZone: ZONA, hour12: false, hour: '2-digit', minute: '2-digit' });
}

function esFechaISO(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !isNaN(fecha) && fecha.toISOString().slice(0, 10) === valor;
}

module.exports = { hoyChile, haceDiasChile, horaChile, esFechaISO };
