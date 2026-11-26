const AZUL = '#1e3a5f';
const AZUL_OSCURO = '#0f2136';
const AMARILLO = '#f5a623';

const Z = Number(process.env.DEMO_ZOOM || 2.5);
const ESCRITORIO = { viewport: { width: 1536, height: 864 }, deviceScaleFactor: 1 };

const LENTO = Number(process.env.DEMO_LENTO || 1);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms * LENTO));

function capas() {
  if (location.pathname.startsWith('/__demo')) return;
  const enMarco = window.top !== window;
  const estilo = `
    #demo-cursor{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);transition:opacity .2s}
    #demo-cursor.flecha{width:22px;height:30px}
    #demo-cursor.dedo{width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;background:rgba(30,58,95,.28);border:2px solid rgba(255,255,255,.9);box-shadow:0 2px 10px rgba(0,0,0,.25)}
    .demo-onda{position:fixed;z-index:2147483646;pointer-events:none;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:3px solid #f5a623;animation:demo-onda .55s ease-out forwards}
    @keyframes demo-onda{to{transform:scale(3.6);opacity:0}}
    #demo-rotulo{position:fixed;left:50%;bottom:28px;z-index:2147483645;transform:translate(-50%,20px);opacity:0;pointer-events:none;
      max-width:min(1100px,86vw);padding:14px 26px 16px;border-radius:16px;background:rgba(15,33,54,.93);color:#fff;
      font-family:Poppins,'Segoe UI',system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.28);transition:opacity .45s ease,transform .45s ease}
    #demo-rotulo.visible{opacity:1;transform:translate(-50%,0)}
    #demo-rotulo b{display:block;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#f5a623;font-weight:600;margin-bottom:3px}
    #demo-rotulo span{display:block;font-size:21px;line-height:1.35;font-weight:500}
    html{scrollbar-width:none}::-webkit-scrollbar{display:none}`;
  const montar = () => {
    if (document.getElementById('demo-cursor')) return;
    const s = document.createElement('style');
    s.textContent = estilo;
    document.head.appendChild(s);
    const cursor = document.createElement('div');
    cursor.id = 'demo-cursor';
    if (enMarco) {
      cursor.className = 'dedo';
    } else {
      cursor.className = 'flecha';
      cursor.innerHTML =
        '<svg viewBox="0 0 22 30" width="22" height="30"><path d="M2 2 L2 24 L8 18.5 L12 28 L16 26.3 L12.2 17 L20 17 Z" fill="#111" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>';
    }
    document.body.appendChild(cursor);
    if (!enMarco) {
      const r = document.createElement('div');
      r.id = 'demo-rotulo';
      r.innerHTML = '<b></b><span></span>';
      document.body.appendChild(r);
    }
    if (window.__demoPos) cursor.style.transform = `translate(${window.__demoPos[0]}px,${window.__demoPos[1]}px)`;
  };
  addEventListener(
    'mousemove',
    (e) => {
      const z0 = window.top === window ? parseFloat(getComputedStyle(document.documentElement).zoom) || 1 : 1;
      window.__demoPos = [e.clientX / z0, e.clientY / z0];
      const c = document.getElementById('demo-cursor');
      const zz = window.top === window ? parseFloat(getComputedStyle(document.documentElement).zoom) || 1 : 1;
      if (c) c.style.transform = `translate(${e.clientX / zz}px,${e.clientY / zz}px)`;
    },
    true
  );
  document.addEventListener('mouseleave', () => {
    const c = document.getElementById('demo-cursor');
    if (c) c.style.opacity = '0';
  });
  document.addEventListener('mouseenter', () => {
    const c = document.getElementById('demo-cursor');
    if (c) c.style.opacity = '1';
  });
  addEventListener(
    'mousedown',
    (e) => {
      const o = document.createElement('div');
      o.className = 'demo-onda';
      const zo = window.top === window ? parseFloat(getComputedStyle(document.documentElement).zoom) || 1 : 1;
      o.style.left = `${e.clientX / zo}px`;
      o.style.top = `${e.clientY / zo}px`;
      document.body.appendChild(o);
      setTimeout(() => o.remove(), 700);
    },
    true
  );
  if (document.body) montar();
  else addEventListener('DOMContentLoaded', montar);
  new MutationObserver(() => document.body && !document.getElementById('demo-cursor') && montar()).observe(document, {
    childList: true,
    subtree: true,
  });
}

function htmlBase(cuerpo, estilo = '') {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{width:100%;height:100%;overflow:hidden}
  body{font-family:Poppins,'Segoe UI',system-ui,sans-serif;color:#fff;background:radial-gradient(1200px 700px at 20% 10%,#28507e 0%,${AZUL} 45%,${AZUL_OSCURO} 100%)}
  .entra{opacity:0;transform:translateY(18px);animation:entra .8s cubic-bezier(.2,.7,.2,1) forwards}
  @keyframes entra{to{opacity:1;transform:none}}
  ${estilo}</style></head><body>${cuerpo}</body></html>`;
}

function htmlTelefono({ compacto = false } = {}) {
  const k = compacto ? 0.36 : 0.3834;
  const cuerpoIzq = compacto ? 224 - 530 * k : 150;
  const arriba = compacto ? 62 : (864 - 2193 * k) / 2;
  const marcoIzq = cuerpoIzq - 866 * k;
  const pantIzq = marcoIzq + 907 * k;
  const pantArriba = arriba + 32 * k;
  const pantAncho = 978 * k;
  const pantAlto = 2128 * k;
  const barra = (57 * pantAncho) / 440;
  const u = pantAncho / 440;
  const estilo = `
    .marca{position:absolute;left:56px;top:44px;height:54px}
    .pantalla{position:absolute;left:${pantIzq}px;top:${pantArriba}px;width:${pantAncho}px;height:${pantAlto}px;border-radius:${62 * u}px;overflow:hidden;background:#fff}
    .barra{position:absolute;left:0;right:0;top:0;height:${barra}px;font-weight:700;font-size:${17.3 * u}px;color:#000}
    .barra b{position:absolute;left:${78 * u}px;top:${30 * u}px;transform:translate(-50%,-50%)}
    .barra svg{position:absolute;right:${22 * u}px;top:${20 * u}px;width:${84 * u}px;height:${14 * u}px}
    iframe{position:absolute;left:0;top:${barra}px;width:${pantAncho}px;height:${pantAlto - barra}px;border:0;background:#fff;display:block}
    .marco,.brillo{position:absolute;left:${marcoIzq}px;top:${arriba}px;width:${1927 * k}px;height:${2194 * k}px;pointer-events:none}
    .brillo{mix-blend-mode:screen}
    .panel{position:absolute;left:640px;right:90px;top:50%;transform:translateY(-50%)}
    .eti{font-size:16px;letter-spacing:.14em;text-transform:uppercase;color:${AMARILLO};font-weight:600;margin-bottom:14px}
    .tit{font-size:46px;line-height:1.15;font-weight:700;margin-bottom:20px}
    .txt{font-size:25px;line-height:1.5;color:#d7e1ee;font-weight:400}
    .panel>*{transition:opacity .45s ease,transform .45s ease}
    .panel.cambia>*{opacity:0;transform:translateY(12px)}
    .pie{position:absolute;left:0;right:0;top:22px;text-align:center;font-size:15px;letter-spacing:.14em;text-transform:uppercase;color:${AMARILLO};font-weight:600}`;
  const iconos =
    '<svg viewBox="0 0 84 14"><rect x="0" y="9" width="3.7" height="4.7" rx="1"/><rect x="5.7" y="7" width="3.7" height="6.7" rx="1"/><rect x="11.3" y="4.7" width="3.7" height="9" rx="1"/><rect x="17" y="2.3" width="3.7" height="11.3" rx="1"/><path d="M30 6.5a10 10 0 0 1 14 0M33 9.3a5.5 5.5 0 0 1 8 0" stroke="#000" stroke-width="2.6" fill="none" stroke-linecap="round"/><circle cx="37" cy="11.8" r="1.8"/><rect x="54" y="1.5" width="26" height="12" rx="3.4" fill="none" stroke="#000" stroke-width="1.4"/><rect x="56" y="3.5" width="18" height="8" rx="2"/><rect x="81.3" y="5.5" width="2" height="4.5" rx="1"/></svg>';
  const telefono = `<div class="pantalla"><div class="barra" id="barra"><b id="hora"></b>${iconos}</div><iframe id="app" title="app"></iframe></div>
    <img class="marco" src="/__demo/marco-telefono.png" alt=""><img class="brillo" src="/__demo/marco-brillo.png" alt="">
    <script>
      const hora = () => { const d = new Date(); document.getElementById('hora').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
      hora(); setInterval(hora, 1000);
      document.getElementById('app').addEventListener('load', () => {
        try {
          const f = document.getElementById('app').contentDocument;
          const fondo = getComputedStyle(f.body).backgroundColor;
          document.getElementById('barra').style.background = fondo;
          document.querySelector('.pantalla').style.background = fondo;
        } catch {}
      });
    </script>`;
  if (compacto) return htmlBase(`<div class="pie">Celular del estudiante</div>${telefono}`, estilo);
  return htmlBase(
    `<img class="marca" src="/logooscuro.svg" alt="">${telefono}
     <div class="panel" id="panel"><div class="eti" id="eti"></div><div class="tit" id="tit"></div><div class="txt" id="txt"></div></div>`,
    estilo
  );
}

async function prepararContexto(browser, { viewport, deviceScaleFactor = 1, sesion } = {}) {
  const base = viewport || ESCRITORIO.viewport;
  const contexto = await browser.newContext({
    viewport: { width: Math.round(base.width * Z), height: Math.round(base.height * Z) },
    deviceScaleFactor,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    acceptDownloads: true,
  });
  await contexto.addInitScript(() => {
    try {
      sessionStorage.setItem('casino_splash_visto', '1');
    } catch {}
  });
  if (sesion) {
    await contexto.addInitScript((s) => {
      try {
        localStorage.setItem('casino_sesion', JSON.stringify(s));
      } catch {}
    }, sesion);
  }
  await contexto.addInitScript((z) => {
    if (window.top !== window) return;
    const poner = () => {
      if (document.getElementById('demo-zoom')) return;
      const st = document.createElement('style');
      st.id = 'demo-zoom';
      st.textContent = `html{zoom:${z} !important}`;
      (document.head || document.documentElement).appendChild(st);
    };
    if (document.documentElement) poner();
    document.addEventListener('DOMContentLoaded', poner);
    new MutationObserver(poner).observe(document, { childList: true, subtree: true });
  }, Z);
  await contexto.addInitScript((l) => {
    window.__lento = l;
  }, LENTO);
  contexto.on('page', async (pg) => {
    try {
      const cdp = await contexto.newCDPSession(pg);
      await cdp.send('Animation.enable');
      await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / LENTO });
      pg.__cdpAnim = cdp;
    } catch {}
  });
  const desfase = Number(process.env.DEMO_DESFASE_MS || 0);
  if (desfase) {
    await contexto.addInitScript((d) => {
      const Real = Date;
      class Demo extends Real {
        constructor(...a) {
          if (a.length === 0) super(Real.now() + d);
          else super(...a);
        }
        static now() {
          return Real.now() + d;
        }
      }
      window.Date = Demo;
    }, desfase);
  }
  await contexto.addInitScript(capas);
  await contexto.route('**/__demo/telefono*', (ruta) =>
    ruta.fulfill({ contentType: 'text/html', body: htmlTelefono({ compacto: ruta.request().url().includes('compacto') }) })
  );
  await contexto.route('**/__demo/marco-*.png', (ruta) =>
    ruta.fulfill({ contentType: 'image/png', body: require('node:fs').readFileSync(require('node:path').join(__dirname, new URL(ruta.request().url()).pathname.split('/').pop())) })
  );
  await contexto.route('**/__demo/tarjeta*', (ruta) => ruta.fulfill({ contentType: 'text/html', body: contexto.__tarjeta || '' }));
  await contexto.route(/fonts\.(googleapis|gstatic)\.com/, (ruta) => ruta.abort());
  return contexto;
}

async function abrirTelefono(contexto, ruta = '/', { compacto = false } = {}) {
  const pagina = await contexto.newPage();
  await pagina.goto(`/__demo/telefono${compacto ? '?compacto' : ''}`);
  await pagina.evaluate((r) => {
    document.getElementById('app').src = r;
  }, ruta);
  const app = pagina.frameLocator('#app');
  return { pagina, app };
}

async function panel(pagina, etiqueta, titulo, texto) {
  await pagina.evaluate(
    async ([e, t, x]) => {
      const p = document.getElementById('panel');
      if (!p) return;
      if (p.textContent.trim()) {
        p.classList.add('cambia');
        await new Promise((r) => setTimeout(r, 450));
      }
      document.getElementById('eti').textContent = e;
      document.getElementById('tit').textContent = t;
      document.getElementById('txt').textContent = x;
      p.classList.remove('cambia');
    },
    [etiqueta, titulo, texto]
  );
  await esperar(500);
}

async function rotulo(pagina, etiqueta, texto) {
  await pagina.evaluate(
    async ([e, t]) => {
      const r = document.getElementById('demo-rotulo');
      if (!r) return;
      if (r.classList.contains('visible')) {
        r.classList.remove('visible');
        await new Promise((ok) => setTimeout(ok, 420));
      }
      if (!t) return;
      r.querySelector('b').textContent = e;
      r.querySelector('span').textContent = t;
      r.classList.add('visible');
    },
    [etiqueta, texto]
  );
  await esperar(450);
}

async function moverA(pagina, locator, { pasos } = {}) {
  const estado = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const afuera = r.top < 70 || r.bottom > innerHeight - 110;
    let p = el.parentElement;
    let fijo = false;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs.position === 'fixed' || cs.position === 'sticky') fijo = true;
      p = p.parentElement;
    }
    const dentroFijo = fijo && el.closest('[role=dialog], .modal, .modal-fondo, .hoja');
    const visible = r.top >= 0 && r.bottom <= innerHeight;
    if (afuera && dentroFijo) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    else if (fijo && !visible) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return { afuera: (afuera && dentroFijo) || (fijo && !visible) || (afuera && !fijo), fijo: !!fijo };
  });
  if (estado.afuera && estado.fijo) await esperar(900);
  const fuera = estado.afuera && !estado.fijo;
  if (fuera) {
    const dy = await locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top + r.height / 2 - innerHeight / 2;
    });
    await desplazar(pagina, dy, { pasos: 16 });
    const sigue = await locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top < 70 || r.bottom > innerHeight - 120;
    });
    if (sigue) {
      await locator.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await esperar(300);
    }
  }
  const interno = await locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { enMarco: window.top !== window, x: r.x, y: r.y, w: r.width, h: r.height };
  });
  let x;
  let y;
  if (interno.enMarco) {
    const marco = await pagina.locator('#app').boundingBox();
    if (!marco) return null;
    x = marco.x + (interno.x + interno.w / 2) * Z;
    y = marco.y + (interno.y + interno.h / 2) * Z;
  } else {
    const caja = await locator.boundingBox();
    if (!caja) return null;
    x = caja.x + caja.width / 2;
    y = caja.y + caja.height / 2;
  }
  const desde = pagina.__demoPos || [x - 200, y + 120];
  const distancia = Math.hypot(x - desde[0], y - desde[1]) / Z;
  const n = pasos || Math.max(12, Math.min(40, Math.round(distancia / 22)));
  const [x0, y0] = desde;
  for (let i = 1; i <= n; i += 1) {
    const k = i / n;
    const e2 = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    await pagina.mouse.move(x0 + (x - x0) * e2, y0 + (y - y0) * e2);
    await esperar(14);
  }
  pagina.__demoPos = [x, y];
  return { x, y };
}

async function clic(pagina, locator, { despues = 700 } = {}) {
  await locator.waitFor({ state: 'visible', timeout: 15000 });
  const punto = await moverA(pagina, locator);
  await esperar(180);
  if (punto) {
    await pagina.mouse.down();
    await esperar(70);
    await pagina.mouse.up();
  } else {
    await locator.click();
  }
  await esperar(despues);
}

async function elegir(pagina, locator, etiqueta, { despues = 500 } = {}) {
  await moverA(pagina, locator);
  await esperar(150);
  await locator.selectOption({ label: etiqueta });
  await esperar(despues);
}

async function escribir(pagina, locator, texto, { retardo = 55, despues = 500 } = {}) {
  await clic(pagina, locator, { despues: 200 });
  await locator.fill('');
  await locator.pressSequentially(texto, { delay: retardo * LENTO });
  await esperar(despues);
}

async function desplazar(pagina, dy, { pasos = 12 } = {}) {
  for (let i = 0; i < pasos; i += 1) {
    await pagina.mouse.wheel(0, (dy * Z) / pasos);
    await esperar(28);
  }
  await esperar(400);
}

async function tarjeta(contexto, html) {
  contexto.__tarjeta = html;
  const pagina = await contexto.newPage();
  await pagina.goto('/__demo/tarjeta');
  await pagina.evaluate(() => document.fonts.ready);
  return pagina;
}

async function resaltar(locator) {
  try {
    await locator.evaluate((el) => {
      const doc = el.ownerDocument;
      const win = doc.defaultView;
      const area = el.getBoundingClientRect();
      if (area.width * area.height > win.innerWidth * win.innerHeight * 0.5) return;
      let capa = doc.getElementById('demo-foco');
      if (!capa) {
        capa = doc.createElement('div');
        capa.id = 'demo-foco';
        capa.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;border-radius:14px;box-shadow:0 0 0 4px #fbb930,0 0 0 9999px rgba(10,22,36,.38);opacity:0;transition:opacity .35s ease;left:0;top:0;width:0;height:0';
        doc.documentElement.appendChild(capa);
        const seguir = () => {
          const objetivo = capa.__objetivo;
          if (objetivo && objetivo.isConnected) {
            const r = objetivo.getBoundingClientRect();
            const m = 8;
            capa.style.left = r.left - m + 'px';
            capa.style.top = r.top - m + 'px';
            capa.style.width = r.width + 2 * m + 'px';
            capa.style.height = r.height + 2 * m + 'px';
            capa.style.opacity = r.width > 0 ? '1' : '0';
          } else capa.style.opacity = '0';
          win.requestAnimationFrame(seguir);
        };
        win.requestAnimationFrame(seguir);
      }
      capa.__objetivo = el;
    }, null, { timeout: 1500 });
  } catch {}
}

async function quitarResaltado(pagina) {
  for (const f of pagina.frames()) {
    await f
      .evaluate(() => {
        const c = document.getElementById('demo-foco');
        if (c) c.__objetivo = null;
      })
      .catch(() => {});
  }
}

async function mover(pagina, x, y, { steps = 1 } = {}) {
  const [x0, y0] = pagina.__demoPos || [x * Z, y * Z];
  for (let i = 1; i <= steps; i += 1) {
    await pagina.mouse.move(x0 + (x * Z - x0) * (i / steps), y0 + (y * Z - y0) * (i / steps));
    if (steps > 1) await esperar(14);
  }
  pagina.__demoPos = [x * Z, y * Z];
}

module.exports = {
  resaltar,
  quitarResaltado,
  LENTO,
  Z,
  mover,
  AZUL,
  AMARILLO,
  ESCRITORIO,
  esperar,
  htmlBase,
  prepararContexto,
  abrirTelefono,
  panel,
  rotulo,
  moverA,
  clic,
  elegir,
  escribir,
  desplazar,
  tarjeta,
};
