const base = require('../playwright.config');

const chrome = process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH, args: ['--no-sandbox'] } : {};

module.exports = {
  ...base,
  testDir: '.',
  testMatch: process.env.DEMO_ARCHIVO ? new RegExp(process.env.DEMO_ARCHIVO) : /grabar-demo\.js$/,
  timeout: 90 * 60 * 1000,
  retries: 0,
  reporter: [['list']],
  use: { ...base.use, actionTimeout: 15000, trace: 'off', screenshot: 'only-on-failure', video: 'off', launchOptions: chrome },
  projects: [{ name: 'demo', use: { launchOptions: chrome } }],
};
