const PUERTO_API = Number(process.env.E2E_PUERTO_API) || 3100;
const PUERTO_WEB = Number(process.env.E2E_PUERTO_WEB) || 4180;
const URL_BD = process.env.E2E_DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/casino_e2e_test';
const URL_API = `http://localhost:${PUERTO_API}/api`;
const CLAVE = 'Test1234';
const TOKEN_TAREAS = process.env.E2E_TOKEN_TAREAS || 'token-de-tareas-solo-para-e2e-0123456789';

const entornoBackend = () => ({
  PORT: String(PUERTO_API),
  HOST: '127.0.0.1',
  NODE_ENV: 'test',
  DATABASE_URL: URL_BD,
  JWT_SECRET: process.env.E2E_JWT_SECRET || 'secreto-solo-para-e2e-0123456789abcdef0123456789',
  SSO_SIMULADO: 'true',
  ENTRA_TENANT_ID: '',
  ENTRA_CLIENT_ID: '',
  ENTRA_CLIENT_SECRET: '',
  CORS_ORIGIN: `http://localhost:${PUERTO_WEB}`,
  FRONTEND_URL: `http://localhost:${PUERTO_WEB}`,
  HORA_CIERRE_AUTOMATICO: '23:59',
  HORA_INICIO_AUTOMATICO: '',
  DEMO_VENTAS_SIMULADAS: 'false',
  LIMITE_LOGIN_POR_CUENTA: '5',
  LIMITE_LOGIN_POR_IP: '100000',
  LIMITE_IDENTIFICAR_POR_IP: '100000',
  TOKEN_TAREAS,
  CORREO_MODO: 'registro',
});

module.exports = { PUERTO_API, PUERTO_WEB, URL_BD, URL_API, CLAVE, TOKEN_TAREAS, entornoBackend };
