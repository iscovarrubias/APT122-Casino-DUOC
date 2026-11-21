const base = require('@playwright/test');
const { Api } = require('./api');

const CUENTAS = {
  admin: 'admin@duocuc.cl',
  personal: 'personal@duocuc.cl',
  cajero: 'cajero@duocuc.cl',
  nutricionista: 'nutricionista@duocuc.cl',
};

const test = base.test.extend({
  api: async ({}, usar) => {
    await usar(new Api());
  },

  context: async ({ context }, usar) => {
    await context.addInitScript(() => {
      try {
        sessionStorage.setItem('casino_splash_visto', '1');
      } catch {}
    });
    await usar(context);
  },

  entrarComo: async ({ page, api }, usar) => {
    await usar(async (quien, { kiosco = false, ruta } = {}) => {
      const email = CUENTAS[quien] || quien;
      const sesion = await api.sesion(email, { kiosco });
      await page.addInitScript((s) => {
        try {
          localStorage.setItem('casino_sesion', JSON.stringify(s));
        } catch {}
      }, sesion);
      if (ruta) await page.goto(`/#${ruta}`);
      return sesion;
    });
  },

  estudiante: async ({ page, api }, usar) => {
    const email = `alumno.${Date.now()}.${Math.floor(Math.random() * 1e5)}@duocuc.cl`;
    const sesion = await api.sesion(email);
    await page.addInitScript((s) => {
      try {
        localStorage.setItem('casino_sesion', JSON.stringify(s));
      } catch {}
    }, sesion);
    await usar({ email, ...sesion });
  },
});

module.exports = { test, expect: base.expect, CUENTAS };
