const { defineConfig, devices } = require('@playwright/test');
const { PUERTO_API, PUERTO_WEB, URL_BD, entornoBackend } = require('./soporte/entorno');

const chrome = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH, args: ['--no-sandbox'] } : {};

module.exports = defineConfig({
  testDir: './pruebas',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 45000,
  expect: { timeout: 8000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PUERTO_WEB}`,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    launchOptions: chrome,
  },
  projects: [
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, launchOptions: chrome } },
    { name: 'movil', use: { ...devices['Pixel 7'], launchOptions: chrome }, grep: /@movil/ },
  ],
  webServer: [
    {
      command: 'node ../e2e/soporte/preparar-bd.js && node src/app.js',
      cwd: '../backend',
      port: PUERTO_API,
      env: entornoBackend(),
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: `npx vite build --outDir ../e2e/.dist --emptyOutDir && npx vite preview --outDir ../e2e/.dist --port ${PUERTO_WEB} --strictPort`,
      cwd: '../frontend',
      port: PUERTO_WEB,
      env: { VITE_API_URL: `http://localhost:${PUERTO_API}` },
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
  metadata: { baseDeDatos: URL_BD.replace(/\/\/[^@]*@/, '//***@') },
});
