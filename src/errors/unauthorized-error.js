const AppError = require('./app-error');

/**
 * Error operacional correspondiente al código HTTP 401 Unauthorized.
 * Utilizado cuando faltan credenciales o el token JWT es inválido o expirado.
 */
class UnauthorizedError extends AppError {
  /**
   * @param {string} message Mensaje descriptivo
   * @param {any} details Detalles adicionales
   */
  constructor(message = 'Acceso no autorizado. Se requiere autenticación válida.', details = null) {
    super(message, 401, details);
  }
}

module.exports = UnauthorizedError;

