const fs = require('node:fs');
const path = require('node:path');

const SALIDA = path.join(__dirname, 'salida', 'cuadros');

async function grabar(pagina, nombre, { ancho = 3840, alto = 2160, carpeta: base = SALIDA } = {}) {
  const carpeta = path.join(base, nombre);
  fs.rmSync(carpeta, { recursive: true, force: true });
  fs.mkdirSync(carpeta, { recursive: true });
  const cdp = await pagina.context().newCDPSession(pagina);
  const cuadros = [];
  let pendientes = Promise.resolve();
  cdp.on('Page.screencastFrame', ({ data, metadata, sessionId }) => {
    const n = cuadros.length;
    const archivo = path.join(carpeta, `${String(n).padStart(6, '0')}.jpg`);
    cuadros.push({ archivo, t: metadata.timestamp });
    pendientes = pendientes.then(() => fs.promises.writeFile(archivo, Buffer.from(data, 'base64')));
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
  });
  const inicio = Date.now() / 1000;
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: ancho, maxHeight: alto, everyNthFrame: 1 });
  return {
    inicio,
    async detener() {
      const fin = Date.now() / 1000;
      await cdp.send('Page.stopScreencast').catch(() => {});
      await pendientes;
      await cdp.detach().catch(() => {});
      fs.writeFileSync(path.join(carpeta, 'cuadros.json'), JSON.stringify({ inicio, fin, ancho, alto, lento: Number(process.env.DEMO_LENTO || 1), cuadros }, null, 2));
      return { inicio, fin };
    },
  };
}

module.exports = { grabar, SALIDA };
