const jwt = require('jsonwebtoken');
const UnauthorizedError = require('../errors/unauthorized-error');

/**
 * Middleware de Autenticación JWT para empresas y usuarios del sistema.
 * Valida la firma del token emitido y propaga la identidad en req.company.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError(
      'Cabecera Authorization ausente o formato incorrecto. Use: Bearer <token>'
    );
  }

  const token = authHeader.split(' ')[1];
  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    throw new Error('SECRET_KEY debe estar configurada para validar tokens de autenticación.');
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    // Inyección de la identidad autenticada para consumo por los controladores
    req.company = {
      id: decoded.id,
      email: decoded.email,
      rif: decoded.rif,
      razonSocial: decoded.razonSocial,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new UnauthorizedError('La sesión ha expirado. Por favor inicie sesión nuevamente.');
    }
    throw new UnauthorizedError('Token de autenticación inválido o manipulado.');
  }
}

module.exports = authMiddleware;
