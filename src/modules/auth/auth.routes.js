const { Router } = require('express');
const authService = require('./auth.service');
const authMiddleware = require('../../middlewares/auth.middleware');
const BadRequestError = require('../../errors/bad-request-error');

const router = Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Expresión regular estándar para validación sintáctica de emails
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/v1/auth/register
 * Registro de nueva empresa proveedora con validación Fail-Fast.
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { razonSocial, rif, email, password, telefono } = req.body || {};

    if (!razonSocial || typeof razonSocial !== 'string' || razonSocial.trim().length === 0) {
      throw new BadRequestError('El campo "razonSocial" es obligatorio.');
    }

    if (!rif || typeof rif !== 'string' || rif.trim().length === 0) {
      throw new BadRequestError('El campo "rif" es obligatorio (ej. J-12345678-0).');
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      throw new BadRequestError('El campo "email" es obligatorio y debe tener un formato válido.');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new BadRequestError('El campo "password" es obligatorio y debe tener al menos 6 caracteres.');
    }

    const result = await authService.register({
      razonSocial: razonSocial.trim(),
      rif: rif.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
      password,
      telefono: telefono && typeof telefono === 'string' ? telefono.trim() : null,
    });

    return res.status(201).json({
      message: 'Empresa registrada exitosamente.',
      data: result,
    });
  })
);

/**
 * POST /api/v1/auth/login
 * Autenticación y generación de token JWT.
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      throw new BadRequestError('Debe proporcionar un "email" válido.');
    }

    if (!password || typeof password !== 'string') {
      throw new BadRequestError('Debe proporcionar el campo "password".');
    }

    const result = await authService.login(email.trim().toLowerCase(), password);

    return res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      data: result,
    });
  })
);

/**
 * GET /api/v1/auth/me
 * Consulta del perfil de la empresa autenticada mediante JWT.
 */
router.get(
  '/me',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const profile = await authService.getProfile(req.company.id);
    return res.status(200).json({
      data: profile,
    });
  })
);

module.exports = router;

