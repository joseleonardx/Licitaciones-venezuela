/**
 * Middleware de Registro Seguro (Audit & Request Logging) con Lista Blanca (Allowlist).
 *
 * Previene la fuga de credenciales, tokens y datos sensibles (PII / Information Disclosure)
 * en los archivos de registro o consolas de observabilidad.
 */

// Lista blanca estricta de cabeceras permitidas para auditoría
const HEADER_ALLOWLIST = Object.freeze([
  'host',
  'user-agent',
  'content-type',
  'accept',
  'x-request-id',
  'x-forwarded-for',
]);

/**
 * Filtra las cabeceras HTTP de acuerdo con la lista blanca.
 * @param {Record<string, string>} headers
 * @returns {Record<string, string>}
 */
function filterHeaders(headers) {
  const safeHeaders = {};
  for (const key of HEADER_ALLOWLIST) {
    if (headers[key]) {
      safeHeaders[key] = headers[key];
    }
  }
  return safeHeaders;
}

/**
 * Middleware para auditar peticiones entrantes y tiempos de respuesta.
 */
function requestLoggerMiddleware(req, res, next) {
  const startTime = process.hrtime.bigint();
  const requestId = req.id || 'N/A';
  const method = req.method;
  const originalUrl = req.originalUrl || req.url;

  // Escucha el evento de finalización del ciclo HTTP para registrar métricas
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number((endTime - startTime) / 1_000_000n).toFixed(2);
    const statusCode = res.statusCode;
    const safeHeaders = filterHeaders(req.headers);

    const logEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      method,
      url: originalUrl,
      statusCode,
      durationMs: `${durationMs}ms`,
      clientIp: req.ip || req.socket.remoteAddress,
      headers: safeHeaders,
    };

    // Salida estructurada apta para analizadores de logs (JSON logs)
    if (statusCode >= 500) {
      console.error(`[HTTP ERROR] ${JSON.stringify(logEntry)}`);
    } else if (statusCode >= 400) {
      console.warn(`[HTTP WARN] ${JSON.stringify(logEntry)}`);
    } else {
      console.log(`[HTTP INFO] ${JSON.stringify(logEntry)}`);
    }
  });

  next();
}

module.exports = requestLoggerMiddleware;

