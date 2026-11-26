const { htmlBase, AMARILLO } = require('./escena');

const comun = `
  .centro{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 90px}
  .a{opacity:0;transform:translateY(22px)}
  body.go .a{animation:entra .9s cubic-bezier(.2,.7,.2,1) forwards}
  @keyframes sale{to{opacity:0;transform:translateY(-14px)}}
  .eti{font-size:17px;letter-spacing:.16em;text-transform:uppercase;color:${AMARILLO};font-weight:600}
  .linea{width:64px;height:4px;border-radius:2px;background:${AMARILLO};margin:26px auto}`;

function intro() {
  return htmlBase(
    `<div class="centro f2">
       <img class="a" src="/logooscuro.svg" alt="" style="height:170px;animation-delay:.3s">
       <h2 class="a" style="animation-delay:.9s;font-size:50px;font-weight:700;margin-top:18px;white-space:nowrap">El menú del casino, en tu celular y en tiempo real.</h2>
       <div class="a chips" style="animation-delay:1.6s"><span>Estudiantes</span><span>Cocina y caja</span><span>Nutrición y administración</span></div>
     </div>`,
    `${comun}
     .chips{display:flex;gap:16px;margin-top:34px}
     .chips span{padding:10px 22px;border-radius:999px;border:1.5px solid rgba(255,255,255,.35);font-size:20px;color:#e6edf6}`
  );
}

function calidad() {
  const datos = [
    ['708', 'pruebas automáticas', 'Backend, frontend y de punta a punta en un navegador real'],
    ['100', 'en Lighthouse', 'Accesibilidad, buenas prácticas y SEO de las páginas públicas'],
    ['0', 'errores de accesibilidad', 'WCAG 2.1 AA revisado con axe, en modo claro y oscuro'],
    ['CI', 'en cada cambio', 'Revisión automática de formato, dependencias y seguridad'],
  ];
  const tarjetas = datos
    .map(
      ([n, t, d], i) => `<div class="dato a" style="animation-delay:${0.7 + i * 0.25}s">
        <div class="num" data-n="${/^\d+$/.test(n) ? n : ''}">${/^\d+$/.test(n) ? '0' : n}</div>
        <div class="tt">${t}</div><div class="dd">${d}</div></div>`
    )
    .join('');
  return htmlBase(
    `<div class="centro">
       <div class="eti a" style="animation-delay:.1s">Calidad</div>
       <h2 class="a" style="animation-delay:.3s;font-size:50px;font-weight:700;margin-top:14px">Probado como lo usaría cada persona</h2>
       <div class="grilla">${tarjetas}</div>
     </div>
     <script>
       new MutationObserver(() => {
         if (!document.body.classList.contains('go')) return;
         document.querySelectorAll('.num[data-n]').forEach((el, i) => {
           const fin = Number(el.dataset.n); if (!el.dataset.n) return;
           const L = window.__lento || 1;
           const t0 = performance.now() + (700 + i * 250) * L;
           const paso = (t) => { const p = Math.min(1, Math.max(0, (t - t0) / (1400 * L))); el.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(paso); };
           requestAnimationFrame(paso);
         });
       }).observe(document.body, { attributes: true });
     </script>`,
    `${comun}
     .grilla{display:grid;grid-template-columns:repeat(4,1fr);gap:26px;margin-top:56px;width:100%;max-width:1500px}
     .dato{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);border-radius:22px;padding:34px 26px;text-align:left}
     .num{font-size:72px;font-weight:800;color:${AMARILLO};line-height:1}
     .tt{font-size:24px;font-weight:600;margin-top:12px}
     .dd{font-size:17px;line-height:1.5;color:#c9d6e6;margin-top:10px}`
  );
}

function cierre() {
  return htmlBase(
    `<div class="centro">
       <img class="a" src="/logooscuro.svg" alt="" style="height:200px;animation-delay:.2s">
       <div class="linea a" style="animation-delay:.6s"></div>
       <div class="a" style="animation-delay:.9s;font-size:44px;font-weight:700">Revisa el menú antes de ir.</div>
     </div>`,
    comun
  );
}

module.exports = { intro, calidad, cierre };
