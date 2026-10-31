const { Router } = require('express');
const licitationsService = require('./licitations.service');
const BadRequestError = require('../../errors/bad-request-error');

const router = Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// UUID v4 validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * GET /api/v1/licitations
 * Lista todas las licitaciones activas.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { all } = req.query;
    const licitations = all === 'true'
      ? await licitationsService.getAllLicitations()
      : await licitationsService.getActiveLicitations();

    return res.status(200).json({
      data: licitations,
      count: licitations.length,
    });
  })
);

/**
 * GET /api/v1/licitations/:id
 * Detalle de una licitación con validación Fail-Fast de UUID.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!UUID_REGEX.test(id)) {
      throw new BadRequestError('El parámetro ID debe ser un UUID válido.');
    }

    const licitation = await licitationsService.getLicitationById(id);
    return res.status(200).json({
      data: licitation,
    });
  })
);

/**
 * POST /api/v1/licitations
 * Creación de una nueva licitación.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const created = await licitationsService.createLicitation(req.body || {});
    return res.status(201).json({
      message: 'Licitación publicada con éxito.',
      data: created,
    });
  })
);

module.exports = router;

