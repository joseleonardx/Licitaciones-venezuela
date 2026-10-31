const { Router } = require('express');
const requestsService = require('./requests.service');
const BadRequestError = require('../../errors/bad-request-error');

const router = Router();

/**
 * Envoltorio de seguridad para capturar excepciones en funciones asíncronas
 * y transferirlas limpiamente al manejador centralizado de errores (next).
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * GET /api/v1/requests
 * Recupera la lista de solicitudes con filtros opcionales.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { status } = req.query;

    if (status && typeof status !== 'string') {
      throw new BadRequestError('El parámetro de consulta "status" debe ser una cadena de texto.');
    }

    const requests = await requestsService.getAllRequests({ status });
    return res.status(200).json({
      data: requests,
      count: requests.length,
    });
  })
);

/**
 * GET /api/v1/requests/:id
 * Capa de Frontera: Validación Temprana (Fail-Fast) del parámetro de ruta.
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    // Patrón Fail-Fast: Verificación de tipos estricta antes de invocar la capa de servicio
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError(
        'Validación de entrada fallida: El parámetro "id" debe ser un número entero positivo.'
      );
    }

    const request = await requestsService.getRequestById(id);
    return res.status(200).json({
      data: request,
    });
  })
);

/**
 * POST /api/v1/requests
 * Validación temprana del payload de creación antes de tocar persistencia.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, description, budget } = req.body || {};

    // Validaciones estrictas de frontera
    if (!title || typeof title !== 'string' || title.trim() === '') {
      throw new BadRequestError(
        'Validación de entrada fallida: El campo "title" es obligatorio y debe ser texto no vacío.'
      );
    }

    if (
      budget !== undefined &&
      (typeof budget !== 'number' || isNaN(budget) || budget < 0)
    ) {
      throw new BadRequestError(
        'Validación de entrada fallida: El campo "budget" debe ser un número mayor o igual a 0.'
      );
    }

    const created = await requestsService.createRequest({
      title,
      description,
      budget,
    });

    return res.status(201).json({
      message: 'Solicitud creada exitosamente.',
      data: created,
    });
  })
);

/**
 * PATCH /api/v1/requests/:id/status
 * Transición de estado en la FSM con validación de frontera estricta.
 */
router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    // Fail-Fast: Validación del identificador
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError(
        'Validación de entrada fallida: El parámetro "id" debe ser un número entero positivo.'
      );
    }

    const { status, reason } = req.body || {};

    if (!status || typeof status !== 'string' || status.trim() === '') {
      throw new BadRequestError(
        'Validación de entrada fallida: El campo "status" es obligatorio para la transición.'
      );
    }

    if (reason !== undefined && typeof reason !== 'string') {
      throw new BadRequestError(
        'Validación de entrada fallida: El campo "reason", si se incluye, debe ser una cadena de texto.'
      );
    }

    const updated = await requestsService.transitionStatus(
      id,
      status.trim().toUpperCase(),
      reason ? reason.trim() : undefined
    );

    return res.status(200).json({
      message: 'Transición de estado completada con éxito.',
      data: updated,
    });
  })
);

/**
 * DELETE /api/v1/requests/:id
 * Eliminación de una solicitud con verificación Fail-Fast.
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestError(
        'Validación de entrada fallida: El parámetro "id" debe ser un número entero positivo.'
      );
    }

    await requestsService.deleteRequest(id);
    return res.status(204).send();
  })
);

module.exports = router;

