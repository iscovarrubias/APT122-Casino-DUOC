const MAXIMO_REGISTROS = 10000;

function crearLimitadorDeFallos({ ventanaMs, maximo, clave, mensaje }) {
  const registros = new Map();

  const limpieza = setInterval(() => {
    const ahora = Date.now();
    for (const [k, r] of registros) {
      if (r.expira <= ahora) registros.delete(k);
    }
  }, Math.min(ventanaMs, 60000));
  limpieza.unref();

  return (req, res, next) => {
    const k = clave(req);
    const ahora = Date.now();
    const actual = registros.get(k);

    if (actual && actual.expira > ahora && actual.fallos >= maximo) {
      res.set('Retry-After', String(Math.ceil((actual.expira - ahora) / 1000)));
      return res.status(429).json({ error: mensaje });
    }

    res.on('finish', () => {
      if (res.statusCode === 401) {
        const vigente = registros.get(k);
        if (vigente && vigente.expira > Date.now()) {
          vigente.fallos += 1;
        } else {
          if (registros.size >= MAXIMO_REGISTROS) registros.delete(registros.keys().next().value);
          registros.set(k, { fallos: 1, expira: Date.now() + ventanaMs });
        }
      } else if (res.statusCode < 400) {
        registros.delete(k);
      }
    });

    next();
  };
}

module.exports = { crearLimitadorDeFallos };
