const AppError = require('./app-error');

/**
 * Error operacional correspondiente al código HTTP 400 Bad Request.
 * Utilizado para fallos de validación sintáctica, tipos incorrectos
 * o payloads malformados (Patrón Fail-Fast).
 */
class BadRequestError extends AppError {
  /**
   * @param {string} message Mensaje de la validación fallida
   * @param {any} details Lista o mapa de errores de validación
   */
  constructor(message = 'Solicitud incorrecta o parámetros inválidos', details = null) {
    super(message, 400, details);
  }
}

module.exports = BadRequestError;

