export function resolverOpcionVenta(composicionDeCategoria, componentes) {
  if (!composicionDeCategoria || !componentes) return null;

  const grupos = {};
  for (const r of composicionDeCategoria) {
    if (r.grupo_opcion !== null && r.grupo_opcion !== undefined) {
      (grupos[r.grupo_opcion] = grupos[r.grupo_opcion] || []).push(r.tipo);
    }
  }
  if (Object.keys(grupos).length === 0) return null;

  const mapComp = new Map(componentes.map((c) => [c.componente, c]));

  for (const tipos of Object.values(grupos)) {
    const disponibles = tipos.filter((t) => {
      const c = mapComp.get(t);
      if (!c) return false;
      if (c.disponibilidad === 'agotado') return false;
      if (c.restante !== null && c.restante !== undefined && c.restante <= 0) return false;
      return true;
    });

    if (disponibles.length > 1) {
      return { opciones: disponibles };
    }
    if (disponibles.length === 1) {
      return { opcion: disponibles[0], auto: true };
    }
    const primero = tipos.find((t) => mapComp.has(t));
    if (primero) return { opcion: primero, auto: true };
    return null;
  }

  return null;
}
