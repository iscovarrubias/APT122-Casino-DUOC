// Manejador de errores centralizado.
function errorHandler(err, req, res, next) {
  console.error(err); // queda en el log del servidor para depuración real

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido.' });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err.code === '23505') {
    return res.status(409).json({ error: 'El registro ya existe (valor duplicado).' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida a un registro relacionado.' });
  }

  if (err.code === '23502') {
    return res.status(400).json({ error: 'Falta un campo obligatorio.' });
  }

  if (err.code === '23514') {
    return res.status(400).json({ error: 'Uno de los valores enviados no cumple una regla de validación.' });
  }

  return res.status(500).json({ error: 'Error interno del servidor.' });
}

class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = { errorHandler, ApiError };
