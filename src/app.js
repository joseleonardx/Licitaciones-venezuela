const express = require('express');
const path = require('path');
const requestIdMiddleware = require('./middlewares/request-id');
const requestLoggerMiddleware = require('./middlewares/request-logger');
const errorHandlerMiddleware = require('./middlewares/error-handler');
const authRoutes = require('./modules/auth/auth.routes');
const licitationsRoutes = require('./modules/licitations/licitations.routes');
const bidsRoutes = require('./modules/bids/bids.routes');
const requestsRoutes = require('./modules/requests/requests.routes');
const NotFoundError = require('./errors/not-found-error');
const pool = require('./database/pool');

/**
 * Fábrica y Configuración Central de la Aplicación Express (Application Factory).
 *
 * Sigue el principio de Separación de Responsabilidades (SoC):
 * Se aísla la inicialización de middlewares y rutas de la capa de transporte TCP (server.js).
 */
const app = express();

const configuredOrigins = (process.env.FRONTEND_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.get('origin');
  const isLocalDevelopmentOrigin = process.env.NODE_ENV !== 'production'
    && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || '');

  if (origin && (configuredOrigins.includes(origin) || isLocalDevelopmentOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-ID');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  return next();
});

// 1. Middlewares de análisis de cuerpo (Body Parsers)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 2. Servir archivos estáticos subidos (PDFs de propuestas)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// 3. Middlewares de Observabilidad y Seguridad
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Liveness: confirma que el proceso HTTP puede responder.
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    requestId: req.id,
  });
});

// Readiness: confirma que la aplicación puede acceder a PostgreSQL.
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1;');
    return res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      requestId: req.id,
      database: 'CONNECTED',
    });
  } catch (err) {
    console.error(`[READINESS CHECK FAILED] [RequestId: ${req.id}]`, err.message);
    return res.status(503).json({
      status: 'DOWN',
      timestamp: new Date().toISOString(),
      requestId: req.id,
      database: 'DISCONNECTED',
    });
  }
});

// 5. Montaje de Módulos por Dominios Funcionales (Arquitectura Modular)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/licitations', licitationsRoutes);
app.use('/api/v1/bids', bidsRoutes);
app.use('/api/v1/requests', requestsRoutes);

// 6. Manejador para rutas inexistentes (404 Not Found)
app.use((req, res, next) => {
  next(new NotFoundError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
});

// 7. Manejador Global de Errores (4-Arity Middleware) - DEBE IR AL FINAL
app.use(errorHandlerMiddleware);

module.exports = app;
