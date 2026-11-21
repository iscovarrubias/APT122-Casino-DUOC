const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { arrancar, pool, ADMIN } = require('../soporte/servidor');

let s;
let admin;

test.before(async () => {
  s = await arrancar();
  admin = await s.entrar(ADMIN.email, ADMIN.password);
});
test.after(async () => {
  await s.cerrar();
  await pool.end();
});

const firmar = (payload, secreto = process.env.JWT_SECRET, opciones = {}) => jwt.sign(payload, secreto, { expiresIn: '1h', ...opciones });
const datosAdmin = async () => (await pool.query('SELECT id_usuario, email, id_sede FROM usuario WHERE email = $1', [ADMIN.email])).rows[0];

test.describe('Autenticación con tokens', () => {
  test('SEG-01 rechaza un token firmado con otra clave', async () => {
    const u = await datosAdmin();
    const token = firmar({ id_usuario: u.id_usuario, rol: 'Administrador' }, 'otra-clave-que-no-es-la-del-servidor-123456');
    assert.equal((await s.api('GET', '/usuarios', undefined, token)).s, 401);
  });

  test('SEG-02 rechaza un token vencido', async () => {
    const u = await datosAdmin();
    const token = firmar({ id_usuario: u.id_usuario, rol: 'Administrador' }, undefined, { expiresIn: -10 });
    assert.equal((await s.api('GET', '/usuarios', undefined, token)).s, 401);
  });

  test('SEG-03 rechaza un token sin firma (alg none)', async () => {
    const u = await datosAdmin();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const token = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ id_usuario: u.id_usuario, rol: 'Administrador' })}.`;
    assert.equal((await s.api('GET', '/usuarios', undefined, token)).s, 401);
  });

  test('SEG-04 el rol se lee de la base y no del token: un cajero con token que dice Administrador recibe 403', async () => {
    const cajero = await s.crearUsuario(admin, 'Cajero');
    const token = firmar({ id_usuario: cajero.id_usuario, rol: 'Administrador' });
    assert.equal((await s.api('GET', '/usuarios', undefined, token)).s, 403);
  });

  test('SEG-05 una cuenta desactivada pierde el acceso al instante aunque su token siga vigente', async () => {
    const nutri = await s.crearUsuario(admin, 'Nutricionista');
    assert.equal((await s.api('GET', '/analisis/mensual?mes=2026-11', undefined, nutri.token)).s, 200);
    assert.equal((await s.api('PATCH', `/usuarios/${nutri.id_usuario}`, { activo: false }, admin)).s, 200);
    assert.equal((await s.api('GET', '/analisis/mensual?mes=2026-11', undefined, nutri.token)).s, 401);
  });

  test('SEG-06 un cambio de rol se aplica en la siguiente solicitud, sin volver a iniciar sesión', async () => {
    const persona = await s.crearUsuario(admin, 'Nutricionista');
    assert.equal((await s.api('GET', '/analisis/mensual?mes=2026-11', undefined, persona.token)).s, 200);
    assert.equal((await s.api('PATCH', `/usuarios/${persona.id_usuario}`, { rol: 'Cajero' }, admin)).s, 200);
    assert.equal((await s.api('GET', '/analisis/mensual?mes=2026-11', undefined, persona.token)).s, 403);
  });
});

test.describe('Inicio de sesión', () => {
  test('SEG-07 responde igual a un correo inexistente y a una contraseña incorrecta (no revela qué cuentas existen)', async () => {
    const inexistente = await s.api('POST', '/auth/login', { email: `nadie.${Date.now()}@duocuc.cl`, password: 'Cualquiera1' });
    const claveMala = await s.api('POST', '/auth/login', { email: ADMIN.email, password: 'ClaveIncorrecta9' });
    assert.equal(inexistente.s, 401);
    assert.equal(claveMala.s, 401);
    assert.deepEqual(inexistente.d, claveMala.d);
  });

  test('SEG-08 el tiempo de respuesta no delata si el correo existe', async () => {
    const medir = async (email) => {
      const tiempos = [];
      for (let i = 0; i < 4; i += 1) tiempos.push((await s.api('POST', '/auth/login', { email, password: `Mala${i}xyz` })).ms);
      return tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
    };
    const conCuenta = await medir((await s.crearUsuario(admin, 'Cajero', 'tiempo')).email);
    const sinCuenta = await medir(`fantasma.${Date.now()}@duocuc.cl`);
    assert.ok(
      Math.abs(conCuenta - sinCuenta) < Math.max(conCuenta, sinCuenta) * 0.6 + 25,
      `con cuenta ${conCuenta.toFixed(1)} ms, sin cuenta ${sinCuenta.toFixed(1)} ms`
    );
  });

  test('SEG-09 bloquea una cuenta con 429 tras 8 intentos fallidos y avisa cuándo reintentar', async () => {
    const victima = await s.crearUsuario(admin, 'Cajero', 'bloqueo');
    for (let i = 0; i < 8; i += 1) {
      assert.equal((await s.api('POST', '/auth/login', { email: victima.email, password: `Fallo${i}abc` })).s, 401);
    }
    const bloqueado = await s.api('POST', '/auth/login', { email: victima.email, password: 'Test1234' });
    assert.equal(bloqueado.s, 429);
    assert.ok(Number(bloqueado.headers.get('retry-after')) > 0);
  });

  test('SEG-10 las contraseñas se guardan con bcrypt y nunca en texto plano', async () => {
    const persona = await s.crearUsuario(admin, 'Cajero', 'hash');
    const { password_hash: hash } = (await pool.query('SELECT password_hash FROM usuario WHERE email = $1', [persona.email])).rows[0];
    assert.match(hash, /^\$2[aby]\$\d{2}\$.{53}$/);
    assert.notEqual(hash, 'Test1234');
    assert.ok(Number(hash.split('$')[2]) >= 10);
  });

  test('SEG-11 ninguna respuesta expone el hash de la contraseña', async () => {
    const respuestas = [
      await s.api('POST', '/auth/login', ADMIN),
      await s.api('GET', '/auth/yo', undefined, admin),
      await s.api('GET', '/usuarios', undefined, admin),
      await s.api(
        'POST',
        '/usuarios',
        { nombre: 'Sin hash', email: `sinhash.${Date.now()}@duocuc.cl`, password: 'Test1234', rol: 'Cajero' },
        admin
      ),
    ];
    for (const r of respuestas) {
      assert.ok(r.s < 400, r.texto);
      assert.doesNotMatch(r.texto, /password_hash|\$2[aby]\$/);
    }
  });

  test('SEG-12 el inicio de sesión rechaza tipos inesperados sin romperse (objetos en vez de texto)', async () => {
    for (const cuerpo of [
      { email: { $ne: null }, password: 'x' },
      { email: ADMIN.email, password: { $gt: '' } },
      { email: [ADMIN.email], password: ['Test1234'] },
    ]) {
      assert.equal((await s.api('POST', '/auth/login', cuerpo)).s, 400);
    }
  });
});

test.describe('Autorización por rol', () => {
  const matriz = [
    ['Cajero', 'GET', '/usuarios', 403],
    ['Cajero', 'GET', '/analisis/mensual?mes=2026-11', 403],
    ['Cajero', 'POST', '/preparaciones', 403],
    ['Cajero', 'POST', '/menu/planificacion', 403],
    ['Nutricionista', 'POST', '/jornada/ventas', 403],
    ['Nutricionista', 'POST', '/jornada/iniciar', 403],
    ['Nutricionista', 'GET', '/usuarios', 403],
    ['Personal Casino', 'GET', '/usuarios', 403],
    ['Cajero', 'POST', '/jornada/componentes/1/stock', 403],
    ['Cajero', 'PATCH', '/menu/1/publicar', 403],
    ['Personal Casino', 'DELETE', '/preparaciones/1', 403],
  ];

  test('SEG-13 cada rol del personal solo entra a lo suyo (matriz de permisos)', async () => {
    const tokens = {};
    for (const [rol] of matriz) tokens[rol] = tokens[rol] || (await s.crearUsuario(admin, rol)).token;
    for (const [rol, metodo, ruta, esperado] of matriz) {
      const r = await s.api(metodo, ruta, metodo === 'GET' ? undefined : {}, tokens[rol]);
      assert.equal(r.s, esperado, `${rol} ${metodo} ${ruta} -> ${r.s}`);
    }
  });

  test('SEG-14 un estudiante no entra a ninguna ruta del personal', async () => {
    const alumno = await s.crearEstudiante();
    for (const [metodo, ruta] of [
      ['GET', '/usuarios'],
      ['GET', '/jornada/hoy'],
      ['GET', '/preparaciones/gestion'],
      ['GET', '/analisis/resumen'],
      ['GET', '/opiniones'],
      ['POST', '/jornada/ventas'],
    ]) {
      assert.equal((await s.api(metodo, ruta, metodo === 'GET' ? undefined : {}, alumno.token)).s, 403, `${metodo} ${ruta}`);
    }
  });

  test('SEG-15 el personal no puede usar las rutas del perfil estudiantil', async () => {
    assert.equal((await s.api('GET', '/estudiante/perfil', undefined, admin)).s, 403);
  });
});

test.describe('Aislamiento entre estudiantes', () => {
  test('SEG-16 cada estudiante ve solo sus alergias, favoritos y calificaciones', async () => {
    const ana = await s.crearEstudiante('ana');
    const beto = await s.crearEstudiante('beto');
    const plato = (await s.api('GET', '/preparaciones')).d[0];
    const alergeno = (await s.api('GET', '/preparaciones/alergenos')).d[0];
    const nombreAlergeno = alergeno.nombre || alergeno;

    assert.equal((await s.api('PUT', '/estudiante/alergias', { alergenos: [nombreAlergeno] }, ana.token)).s, 200);
    assert.equal((await s.api('PUT', `/estudiante/favoritos/${plato.id_preparacion}`, {}, ana.token)).s, 200);
    assert.equal(
      (await s.api('PUT', `/estudiante/calificaciones/${plato.id_preparacion}`, { estrellas: 5, comentario: 'Privado de Ana' }, ana.token))
        .s,
      200
    );

    const perfilBeto = (await s.api('GET', '/estudiante/perfil', undefined, beto.token)).d;
    assert.deepEqual(perfilBeto.alergias, []);
    assert.deepEqual(perfilBeto.favoritos, []);
    assert.deepEqual(perfilBeto.calificaciones, []);
  });

  test('SEG-17 las opiniones públicas no muestran correo, id ni apellido completo del autor', async () => {
    const alumno = await s.crearEstudiante('privacidad');
    await pool.query("UPDATE usuario SET nombre = 'Camila Retamosa Pérez' WHERE id_usuario = $1", [alumno.id_usuario]);
    const plato = (await s.api('GET', '/preparaciones')).d[1];
    await s.api('PUT', `/estudiante/calificaciones/${plato.id_preparacion}`, { estrellas: 4, comentario: 'Rico' }, alumno.token);
    const r = await s.api('GET', `/preparaciones/${plato.id_preparacion}/opiniones`);
    assert.equal(r.s, 200);
    assert.doesNotMatch(r.texto, new RegExp(alumno.email.replace(/[.]/g, '\\.')));
    assert.doesNotMatch(r.texto, /Retamosa|id_usuario/);
    assert.ok(r.d.opiniones.some((o) => o.autor === 'Camila R.'));
  });
});

test.describe('Entradas maliciosas', () => {
  test('SEG-18 ignora campos inyectados al crear un usuario (sede, estado, hash)', async () => {
    const email = `inyeccion.${Date.now()}@duocuc.cl`;
    const r = await s.api(
      'POST',
      '/usuarios',
      {
        nombre: 'Inyección',
        email,
        password: 'Test1234',
        rol: 'Cajero',
        id_sede: 999999,
        activo: false,
        password_hash: 'texto-plano',
        id_usuario: 1,
      },
      admin
    );
    assert.equal(r.s, 201, r.texto);
    const fila = (await pool.query('SELECT id_usuario, id_sede, activo, password_hash FROM usuario WHERE email = $1', [email])).rows[0];
    assert.equal(fila.id_sede, (await datosAdmin()).id_sede);
    assert.equal(fila.activo, true);
    assert.notEqual(fila.password_hash, 'texto-plano');
    assert.notEqual(fila.id_usuario, 1);
  });

  test('SEG-19 al editar un usuario no se puede cambiar su correo ni su contraseña por la puerta de atrás', async () => {
    const persona = await s.crearUsuario(admin, 'Cajero', 'edicion');
    const r = await s.api(
      'PATCH',
      `/usuarios/${persona.id_usuario}`,
      { nombre: 'Editado', email: 'robado@duocuc.cl', password_hash: 'x', id_sede: 999999 },
      admin
    );
    assert.equal(r.s, 200, r.texto);
    const fila = (await pool.query('SELECT email, id_sede FROM usuario WHERE id_usuario = $1', [persona.id_usuario])).rows[0];
    assert.equal(fila.email, persona.email);
    assert.notEqual(fila.id_sede, 999999);
    assert.ok(await s.entrar(persona.email));
  });

  test('SEG-20 la búsqueda resiste inyección SQL', async () => {
    for (const q of ["' OR '1'='1", "'; DROP TABLE usuario; --", '%', '\\']) {
      const r = await s.api('GET', `/usuarios?q=${encodeURIComponent(q)}`, undefined, admin);
      assert.equal(r.s, 200, q);
      assert.ok(Array.isArray(r.d));
      if (q !== '%') assert.ok(r.d.length <= 1, `${q} devolvió ${r.d.length} filas`);
    }
    assert.ok((await pool.query('SELECT COUNT(*)::int AS n FROM usuario')).rows[0].n > 0);
  });

  test('SEG-21 el texto con HTML se guarda tal cual y se devuelve como JSON, nunca como página', async () => {
    const alumno = await s.crearEstudiante('xss');
    const plato = (await s.api('GET', '/preparaciones')).d[2];
    const ataque = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    await s.api('PUT', `/estudiante/calificaciones/${plato.id_preparacion}`, { estrellas: 3, comentario: ataque }, alumno.token);
    const r = await s.api('GET', `/preparaciones/${plato.id_preparacion}/opiniones`);
    assert.match(r.headers.get('content-type'), /^application\/json/);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(r.d.opiniones.some((o) => o.comentario === ataque));
  });

  test('SEG-22 rechaza cuerpos de más de 100 KB con 413', async () => {
    const r = await s.api('POST', '/auth/login', { email: 'a@duocuc.cl', password: 'x'.repeat(150 * 1024) });
    assert.equal(r.s, 413);
  });

  test('SEG-23 un archivo que dice ser PNG pero no lo es se rechaza', async () => {
    const formulario = new FormData();
    formulario.append('imagen', new Blob(['<?php echo "hola"; ?> esto no es una imagen'], { type: 'image/png' }), 'falsa.png');
    const r = await s.api('POST', '/preparaciones/imagen', formulario, admin);
    assert.equal(r.s, 400);
  });

  test('SEG-24 una imagen de más de 3 MB se rechaza con 413', async () => {
    const png = Buffer.alloc(3 * 1024 * 1024 + 10);
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(png);
    const formulario = new FormData();
    formulario.append('imagen', new Blob([png], { type: 'image/png' }), 'grande.png');
    const r = await s.api('POST', '/preparaciones/imagen', formulario, admin);
    assert.equal(r.s, 413);
  });

  test('SEG-25 un ejecutable con extensión de imagen y tipo inventado se rechaza', async () => {
    const formulario = new FormData();
    formulario.append(
      'imagen',
      new Blob([Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00')], { type: 'application/x-msdownload' }),
      'foto.jpg'
    );
    const r = await s.api('POST', '/preparaciones/imagen', formulario, admin);
    assert.equal(r.s, 400);
  });
});
