const pool = require('../config/db');

async function listarActivas() {
  const { rows } = await pool.query(
    `SELECT p.id_preparacion, p.nombre, p.descripcion, p.precio,
            COALESCE(
              json_agg(DISTINCT i.nombre) FILTER (WHERE i.nombre IS NOT NULL), '[]'
            ) AS ingredientes,
            COALESCE(
              json_agg(DISTINCT a.nombre) FILTER (WHERE a.nombre IS NOT NULL), '[]'
            ) AS alergenos,
            CASE WHEN n.validado THEN
              json_build_object(
                'calorias', n.calorias,
                'proteinas_g', n.proteinas_g,
                'carbohidratos_g', n.carbohidratos_g,
                'grasas_g', n.grasas_g,
                'fuente', n.fuente
              )
            ELSE NULL END AS informacion_nutricional
     FROM preparacion p
     LEFT JOIN preparacion_ingrediente pi ON pi.id_preparacion = p.id_preparacion
     LEFT JOIN ingrediente i ON i.id_ingrediente = pi.id_ingrediente
     LEFT JOIN preparacion_alergeno pa ON pa.id_preparacion = p.id_preparacion
     LEFT JOIN alergeno a ON a.id_alergeno = pa.id_alergeno
     LEFT JOIN informacion_nutricional n ON n.id_preparacion = p.id_preparacion
     WHERE p.activa = TRUE
     GROUP BY p.id_preparacion, n.validado, n.calorias, n.proteinas_g, n.carbohidratos_g, n.grasas_g, n.fuente
     ORDER BY p.nombre`
  );
  return rows;
}

async function crear({ nombre, descripcion, precio, ingredientes = [] }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO preparacion (nombre, descripcion, precio, activa)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id_preparacion, nombre, descripcion, precio, activa`,
      [nombre, descripcion || null, precio]
    );
    const preparacion = rows[0];

    for (const nombreIngrediente of ingredientes) {
      const ing = await client.query(
        `INSERT INTO ingrediente (nombre) VALUES ($1)
         ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre
         RETURNING id_ingrediente`,
        [nombreIngrediente]
      );
      await client.query(
        `INSERT INTO preparacion_ingrediente (id_preparacion, id_ingrediente)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [preparacion.id_preparacion, ing.rows[0].id_ingrediente]
      );
    }

    await client.query('COMMIT');
    return preparacion;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function actualizar(id, { nombre, descripcion, precio }) {
  const { rows } = await pool.query(
    `UPDATE preparacion
     SET nombre = COALESCE($2, nombre),
         descripcion = COALESCE($3, descripcion),
         precio = COALESCE($4, precio)
     WHERE id_preparacion = $1
     RETURNING id_preparacion, nombre, descripcion, precio, activa`,
    [id, nombre, descripcion, precio]
  );
  return rows[0] || null;
}

async function desactivar(id) {
  const { rows } = await pool.query(
    `UPDATE preparacion SET activa = FALSE
     WHERE id_preparacion = $1
     RETURNING id_preparacion, nombre, activa`,
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  listarActivas, crear, actualizar, desactivar,
  listarCatalogoAlergenos, asignarAlergenos,
  actualizarNutricion,
};


async function listarCatalogoAlergenos() {
  const { rows } = await pool.query('SELECT id_alergeno, nombre FROM alergeno ORDER BY nombre');
  return rows;
}

async function asignarAlergenos(id_preparacion, nombresAlergenos = []) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const prep = await client.query('SELECT id_preparacion FROM preparacion WHERE id_preparacion = $1', [id_preparacion]);
    if (!prep.rows[0]) {
      const err = new Error('Preparación no encontrada.');
      err.status = 404;
      throw err;
    }

    await client.query('DELETE FROM preparacion_alergeno WHERE id_preparacion = $1', [id_preparacion]);

    for (const nombre of nombresAlergenos) {
      const alergenoRes = await client.query('SELECT id_alergeno FROM alergeno WHERE nombre = $1', [nombre]);
      if (!alergenoRes.rows[0]) {
        const err = new Error(`"${nombre}" no está en el catálogo de alérgenos.`);
        err.status = 400;
        throw err;
      }
      await client.query(
        'INSERT INTO preparacion_alergeno (id_preparacion, id_alergeno) VALUES ($1, $2)',
        [id_preparacion, alergenoRes.rows[0].id_alergeno]
      );
    }

    await client.query('COMMIT');
    return listarCatalogoAlergenos().then(() => nombresAlergenos); // devuelve lo que quedó asignado
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function actualizarNutricion(id_preparacion, { calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado }) {
  const { rows } = await pool.query(
    `INSERT INTO informacion_nutricional (id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en)
     VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
     ON CONFLICT (id_preparacion) DO UPDATE SET
       calorias = EXCLUDED.calorias,
       proteinas_g = EXCLUDED.proteinas_g,
       carbohidratos_g = EXCLUDED.carbohidratos_g,
       grasas_g = EXCLUDED.grasas_g,
       fuente = EXCLUDED.fuente,
       validado = EXCLUDED.validado,
       actualizado_en = CURRENT_TIMESTAMP
     RETURNING id_preparacion, calorias, proteinas_g, carbohidratos_g, grasas_g, fuente, validado, actualizado_en`,
    [id_preparacion, calorias ?? null, proteinas_g ?? null, carbohidratos_g ?? null, grasas_g ?? null, fuente || null, !!validado]
  );
  return rows[0];
}
