const AppError = require('../errors/app-error');

/**
 * Manejador Global Centralizado de Errores (4-Arity Error Handler).
 *
 * REGLA ESTRICTA DE EXPRESS: Debe declarar exactamente 4 parámetros (err, req, res, next)
 * para que el motor de enrutamiento lo reconozca como middleware de captura de excepciones.
 *
 * Principio de Seguridad:
 * - Errores operacionales (AppError): devuelven mensajes semánticos y códigos RFC 9110.
 * - Errores de programación / no controlados (500): se enmascaran para prevenir la
 *   fuga de información sensible (Information Disclosure / CWE-209), como stack traces,
 *   consultas SQL o rutas absolutas del servidor.
 */
// eslint-disable-next-line no-unused-vars
function errorHandlerMiddleware(err, req, res, next) {
  const requestId = req.id || 'N/A';

  // Manejo de errores operacionales controlados (BadRequestError, ConflictError, etc.)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        type: err.name,
        message: err.message,
        statusCode: err.statusCode,
        details: err.details || null,
        requestId,
      },
    });
  }

  // Manejo de errores de sintaxis en el body JSON (ej. body-parser SyntaxError)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        type: 'BadRequestError',
        message: 'Cuerpo de solicitud JSON con formato inválido o malformado',
        statusCode: 400,
        requestId,
      },
    });
  }

  // Error NO controlado del sistema (Base de datos caída, error de programación, etc.)
  // Registro técnico completo en servidor para diagnóstico
  console.error(`[UNHANDLED SYSTEM ERROR] [RequestId: ${requestId}]`, {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  // Respuesta segura al cliente enmascarando detalles técnicos
  const isDevelopment = process.env.NODE_ENV === 'development';

  return res.status(500).json({
    error: {
      type: 'InternalServerError',
      message: 'Ocurrió un error interno en el servidor.',
      statusCode: 500,
      requestId,
      // Solo en desarrollo local se exponen detalles de depuración
      ...(isDevelopment && { debug: err.message, stack: err.stack }),
    },
  });
}

module.exports = errorHandlerMiddleware;

