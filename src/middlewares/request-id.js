const crypto = require('crypto');

/**
 * Expresión regular segura para validación estricta de UUID (RFC 4122 v1-v5).
 * Neutraliza inyecciones en cabeceras o identificadores arbitrarios no normalizados.
 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Middleware de Trazabilidad Unívoca (Distributed Tracing).
 *
 * Valida la cabecera X-Request-ID enviada por clientes o proxies inversos.
 * Si es un UUID válido, la reutiliza para correlación cruzada;
 * si no existe o es inválida, genera un nuevo UUID v4 criptográficamente seguro.
 */
function requestIdMiddleware(req, res, next) {
  const incomingId = req.headers['x-request-id'];

  let requestId;
  if (typeof incomingId === 'string' && UUID_REGEX.test(incomingId.trim())) {
    requestId = incomingId.trim();
  } else {
    requestId = crypto.randomUUID();
  }

  // Se adjunta al objeto Request para el logger y manejadores posteriores
  req.id = requestId;

  // Se expone en la cabecera HTTP de respuesta para auditoría del cliente
  res.setHeader('X-Request-ID', requestId);

  next();
}

module.exports = requestIdMiddleware;

