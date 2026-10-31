const AppError = require('./app-error');

/**
 * Error operacional correspondiente al código HTTP 404 Not Found.
 * Utilizado cuando un recurso solicitado no existe en la base de datos.
 */
class NotFoundError extends AppError {
  /**
   * @param {string} message Descripción del recurso ausente
   */
  constructor(message = 'Recurso solicitado no encontrado') {
    super(message, 404);
  }
}

module.exports = NotFoundError;

