const { URL_API, CLAVE } = require('./entorno');

const fechaChile = (fecha = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(fecha);
const hoyChile = () => fechaChile();

function diaHabilFuturo(dias) {
  const base = new Date(`${hoyChile()}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  while ([0, 6].includes(base.getUTCDay())) base.setUTCDate(base.getUTCDate() + 1);
  return base.toISOString().slice(0, 10);
}

const aFormatoVisible = (iso) => iso.split('-').reverse().join('/');

function diasHabilesDelMismoMes(desde, cantidad) {
  let inicio = diaHabilFuturo(desde);
  for (;;) {
    const dias = [inicio];
    const cursor = new Date(`${inicio}T12:00:00Z`);
    while (dias.length < cantidad) {
      cursor.setUTCDate(cursor.getUTCDate() + 1);
      if (![0, 6].includes(cursor.getUTCDay())) dias.push(cursor.toISOString().slice(0, 10));
    }
    if (dias.every((d) => d.slice(0, 7) === inicio.slice(0, 7))) return dias;
    const siguiente = new Date(`${inicio.slice(0, 7)}-01T12:00:00Z`);
    siguiente.setUTCMonth(siguiente.getUTCMonth() + 1);
    inicio = siguiente.toISOString().slice(0, 10);
    const d = new Date(`${inicio}T12:00:00Z`);
    while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1);
    inicio = d.toISOString().slice(0, 10);
  }
}

const PLAN_HOY = [
  ['Pollo arvejado con arroz', 'Plato Principal', 'General'],
  ['Arroz con pollo', 'Plato Principal', 'JUNAEB'],
  ['Budín de zapallito italiano', 'Plato Principal', 'Vegetariano'],
  ['Pollo a la plancha con ensalada', 'Plato Principal', 'Hipocalórico'],
  ['Ensalada chilena', 'Ensalada'],
  ['Sopa de verduras', 'Sopa'],
  ['Pan amasado', 'Pan'],
  ['Flan de caramelo', 'Postre'],
  ['Manzana', 'Fruta'],
  ['Jugo de naranja', 'Bebida'],
];

class Api {
  constructor() {
    this.tokens = new Map();
  }

  async pedir(metodo, ruta, cuerpo, token) {
    const r = await fetch(URL_API + ruta, {
      method: metodo,
      headers: {
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
    const texto = await r.text();
    let datos = null;
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = texto;
    }
    if (!r.ok) {
      const error = new Error(`${metodo} ${ruta} respondió ${r.status}: ${texto}`);
      error.estado = r.status;
      error.datos = datos;
      throw error;
    }
    return datos;
  }

  async sesion(email, { kiosco = false } = {}) {
    const clave = `${email}|${kiosco}`;
    if (!this.tokens.has(clave)) {
      const d =
        email.endsWith('@duocuc.cl') && email.startsWith('alumno')
          ? await this.pedir('POST', '/auth/duoc', { email })
          : await this.pedir('POST', '/auth/login', { email, password: CLAVE, ...(kiosco ? { kiosco: true } : {}) });
      this.tokens.set(clave, { token: d.token, usuario: d.usuario, kiosco: !!d.kiosco });
    }
    return this.tokens.get(clave);
  }

  async admin(metodo, ruta, cuerpo) {
    const { token } = await this.sesion('admin@duocuc.cl');
    return this.pedir(metodo, ruta, cuerpo, token);
  }

  async preparaciones() {
    if (!this.cachePreparaciones) this.cachePreparaciones = await this.admin('GET', '/preparaciones/gestion');
    return this.cachePreparaciones;
  }

  async idPreparacion(nombre) {
    const p = (await this.preparaciones()).find((x) => x.nombre === nombre);
    if (!p) throw new Error(`No existe la preparación "${nombre}"`);
    return p.id_preparacion;
  }

  async limpiarDia(fecha = hoyChile()) {
    await require('./bd').limpiarDia(fecha);
    await new Promise((r) => setTimeout(r, 2100));
  }

  async prepararDia({ fecha = hoyChile(), porciones = 30, publicar = true, iniciar = false, plan = PLAN_HOY } = {}) {
    await require('./bd').limpiarDia(fecha);
    let idMenu;
    for (const [nombre, tipo, categoria] of plan) {
      const r = await this.admin('POST', '/menu/planificacion', {
        fecha,
        id_preparacion: await this.idPreparacion(nombre),
        tipo_componente: tipo,
        categoria,
        cantidad_planificada: porciones,
      });
      idMenu = r.menu.id_menu;
    }
    if (publicar) await this.admin('PATCH', `/menu/${idMenu}/publicar`);
    if (iniciar) await this.admin('POST', '/jornada/iniciar', {});
    return idMenu;
  }

  async estadoHoy() {
    return this.admin('GET', '/jornada/hoy');
  }

  async restante(preparacion) {
    const estado = await this.estadoHoy();
    const c = estado.componentes.find((x) => x.preparacion === preparacion);
    if (!c) throw new Error(`"${preparacion}" no está en la jornada de hoy`);
    return c.restante;
  }
}

module.exports = { Api, hoyChile, diaHabilFuturo, diasHabilesDelMismoMes, aFormatoVisible, fechaChile, PLAN_HOY };
