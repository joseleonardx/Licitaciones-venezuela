/**
 * Clase base para errores operacionales controlados de la aplicación.
 * Permite distinguir entre errores predecibles de dominio/validación
 * y fallos no controlados del sistema o programación.
 */
class AppError extends Error {
  /**
   * @param {string} message Mensaje legible del error
   * @param {number} statusCode Código de estado HTTP (RFC 9110)
   * @param {any} details Metadatos o detalles complementarios del error
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

