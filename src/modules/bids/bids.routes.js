const { Router } = require('express');
const bidsService = require('./bids.service');
const upload = require('./upload.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');
const BadRequestError = require('../../errors/bad-request-error');

const router = Router();

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * POST /api/v1/bids
 * Envío de postulación con archivo PDF por parte de una empresa autenticada.
 */
router.post(
  '/',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    // Fail-Fast: Validación del archivo subido
    if (!req.file) {
      throw new BadRequestError(
        'Debe adjuntar un archivo PDF válido en el campo "file" (multipart/form-data).'
      );
    }

    const licitationId = req.body.licitation_id || req.body.licitationId;
    if (!licitationId || !UUID_REGEX.test(licitationId)) {
      throw new BadRequestError('El campo "licitation_id" es obligatorio y debe ser un UUID válido.');
    }

    // Ruta relativa para acceso al archivo almacenado
    const pdfUrl = `/uploads/${req.file.filename}`;

    const bid = await bidsService.submitBid({
      licitationId,
      companyId: req.company.id,
      pdfUrl,
    });

    return res.status(201).json({
      message: 'Postulación enviada exitosamente.',
      data: bid,
    });
  })
);

/**
 * GET /api/v1/bids/my-bids
 * Consulta de todas las ofertas postuladas por la empresa autenticada.
 */
router.get(
  '/my-bids',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const bids = await bidsService.getMyBids(req.company.id);
    return res.status(200).json({
      data: bids,
      count: bids.length,
    });
  })
);

/**
 * GET /api/v1/bids/licitation/:licitationId
 * Consulta de ofertas presentadas para una licitación.
 */
router.get(
  '/licitation/:licitationId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { licitationId } = req.params;
    if (!UUID_REGEX.test(licitationId)) {
      throw new BadRequestError('El parámetro "licitationId" debe ser un UUID válido.');
    }

    const bids = await bidsService.getBidsForLicitation(licitationId);
    return res.status(200).json({
      data: bids,
      count: bids.length,
    });
  })
);

module.exports = router;

