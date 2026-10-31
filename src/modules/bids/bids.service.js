const bidsStore = require('./bids.store');
const licitationsStore = require('../licitations/licitations.store');
const BidMapper = require('./bid.mapper');
const NotFoundError = require('../../errors/not-found-error');
const ConflictError = require('../../errors/conflict-error');
const BadRequestError = require('../../errors/bad-request-error');

class BidsService {
  /**
   * Postula una nueva oferta con archivo PDF para una licitación activa.
   */
  async submitBid(data) {
    const { licitationId, companyId, pdfUrl } = data;

    if (!licitationId) {
      throw new BadRequestError('El identificador de la licitación es obligatorio.');
    }

    if (!pdfUrl) {
      throw new BadRequestError('El documento PDF de la propuesta es obligatorio.');
    }

    // 1. Verificar existencia de la licitación
    const licitation = await licitationsStore.findById(licitationId);
    if (!licitation) {
      throw new NotFoundError(`Licitación con ID ${licitationId} no encontrada.`);
    }

    // 2. Regla de negocio: Licitación debe estar activa
    if (licitation.status !== 'active') {
      throw new ConflictError(
        `Conflicto de dominio: No se pueden enviar ofertas. La licitación está en estado "${licitation.status}".`
      );
    }

    // 3. Regla de negocio: Fecha límite no vencida
    const now = new Date();
    if (new Date(licitation.closing_date) <= now) {
      throw new ConflictError(
        'Conflicto de dominio: El período de postulaciones para esta licitación ha expirado.'
      );
    }

    // 4. Regla de negocio: Unicidad de oferta por empresa
    const existingBid = await bidsStore.findByLicitationAndCompany(licitationId, companyId);
    if (existingBid) {
      throw new ConflictError(
        'Conflicto de dominio: Su empresa ya ha presentado una propuesta formal para esta licitación.'
      );
    }

    // 5. Persistencia
    const created = await bidsStore.create({
      licitationId,
      companyId,
      pdfUrl,
      status: 'submitted',
    });

    return BidMapper.toDTO(created);
  }

  /**
   * Obtiene las postulaciones de la empresa autenticada.
   */
  async getMyBids(companyId) {
    const rows = await bidsStore.findByCompany(companyId);
    return BidMapper.toDTOList(rows);
  }

  /**
   * Obtiene todas las postulaciones de una licitación específica.
   */
  async getBidsForLicitation(licitationId) {
    const rows = await bidsStore.findByLicitation(licitationId);
    return BidMapper.toDTOList(rows);
  }
}

module.exports = new BidsService();

