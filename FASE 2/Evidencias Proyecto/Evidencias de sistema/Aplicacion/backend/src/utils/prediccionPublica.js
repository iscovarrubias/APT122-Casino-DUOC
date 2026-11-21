const REDONDEO_MIN = 5;

const hhmm = (minuto) => `${String(Math.floor(minuto / 60)).padStart(2, '0')}:${String(minuto % 60).padStart(2, '0')}`;

function estadoPublico(estimacion) {
  if (!estimacion) return null;
  if (estimacion.estado === 'agotado') return { estado: 'agotado' };
  if (estimacion.agotaria) {
    const minuto = Math.round(estimacion.minuto / REDONDEO_MIN) * REDONDEO_MIN;
    return { estado: 'se_agota', hora: hhmm(minuto), minutos_restantes: estimacion.minutos_restantes };
  }
  return { estado: 'alcanza' };
}

function resumenPublico(prediccion) {
  const categorias = (prediccion?.categorias || [])
    .map((c) => {
      const estado = estadoPublico(c.estimacion);
      return estado ? { categoria: c.categoria, ...estado } : null;
    })
    .filter(Boolean);
  return { fecha: prediccion?.fecha ?? null, categorias };
}

module.exports = { resumenPublico, estadoPublico, hhmm };
