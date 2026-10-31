const AppError = require('./app-error');

/**
 * Error operacional correspondiente al código HTTP 409 Conflict.
 * Utilizado cuando una solicitud entra en conflicto con el estado
 * actual del recurso (ej. colisiones de la Máquina de Estados Finitos).
 */
class ConflictError extends AppError {
  /**
   * @param {string} message Descripción del conflicto de dominio
   * @param {any} details Metadatos de la colisión de estado
   */
  constructor(message = 'Conflicto con el estado actual del recurso', details = null) {
    super(message, 409, details);
  }
}

module.exports = ConflictError;

