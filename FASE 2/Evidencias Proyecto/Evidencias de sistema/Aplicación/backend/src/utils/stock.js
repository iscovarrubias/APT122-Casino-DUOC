const UMBRAL_BAJA = 0.3;

function estadoPorStock({ restante, total }) {
  const r = Number(restante);
  const t = Number(total);

  if (!Number.isFinite(r) || !Number.isFinite(t)) return null;
  if (t <= 0 && r <= 0) return null;

  if (r <= 0) return 'agotado';
  if (t > 0 && r / t <= UMBRAL_BAJA) return 'baja_disponibilidad';
  return 'disponible';
}

module.exports = { estadoPorStock };