const AppError = require('./app-error');

/**
 * Error operacional correspondiente al código HTTP 403 Forbidden.
 * Utilizado cuando el cliente está autenticado pero no tiene permisos sobre el recurso.
 */
class ForbiddenError extends AppError {
  constructor(message = 'Acceso prohibido. No posee los permisos requeridos.', details = null) {
    super(message, 403, details);
  }
}

module.exports = ForbiddenError;

