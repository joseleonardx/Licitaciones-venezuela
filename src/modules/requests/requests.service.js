const requestsStore = require('./requests.store');
const RequestMapper = require('./request.mapper');
const {
  REQUEST_STATUS,
  isValidStatus,
  isTerminalStatus,
  isTransitionAllowed,
} = require('./request-status');
const BadRequestError = require('../../errors/bad-request-error');
const ConflictError = require('../../errors/conflict-error');
const NotFoundError = require('../../errors/not-found-error');

/**
 * Capa de Lógica de Negocio y Orquestación de Dominio (Service Layer).
 *
 * Responsabilidades:
 * 1. Aplicación de reglas del dominio y políticas de negocio.
 * 2. Orquestación de la Máquina de Estados Finitos (FSM) para transiciones.
 * 3. Lanzamiento de errores operacionales semánticos (400, 404, 409).
 * 4. Transformación de entidades a contratos DTO mediante el Mapper.
 */
class RequestsService {
  /**
   * Obtiene la colección completa de solicitudes.
   * @param {object} [filters]
   * @returns {Promise<Array<any>>}
   */
  async getAllRequests(filters = {}) {
    const rows = await requestsStore.findAll(filters);
    return RequestMapper.toDTOList(rows);
  }

  /**
   * Recupera una solicitud específica por su ID junto a su trazabilidad.
   * @param {number} id
   * @returns {Promise<any>}
   */
  async getRequestById(id) {
    const row = await requestsStore.findWithLogsById(id);
    if (!row) {
      throw new NotFoundError(`Solicitud con ID ${id} no encontrada.`);
    }
    return RequestMapper.toDTO(row);
  }

  /**
   * Crea una nueva solicitud en el sistema asignándole el estado inicial.
   * @param {object} payload
   * @returns {Promise<any>}
   */
  async createRequest(payload) {
    // Validaciones de negocio adicionales
    if (!payload.title || typeof payload.title !== 'string' || payload.title.trim().length === 0) {
      throw new BadRequestError('El título de la solicitud es obligatorio.');
    }

    const budget = payload.budget !== undefined ? Number(payload.budget) : 0;
    if (isNaN(budget) || budget < 0) {
      throw new BadRequestError('El presupuesto (budget) debe ser un valor numérico positivo o cero.');
    }

    const entityToCreate = {
      title: payload.title.trim(),
      description: payload.description ? payload.description.trim() : null,
      budget,
      status: REQUEST_STATUS.PENDING, // Estado inicial forzado por la FSM
    };

    const created = await requestsStore.createWithAudit(
      entityToCreate,
      'Registro inicial en estado PENDING'
    );

    return RequestMapper.toDTO(created);
  }

  /**
   * Ejecuta una transición de estado en la Máquina de Estados Finitos (FSM).
   *
   * Reglas de Dominio:
   * 1. Validación de existencia del recurso (404 Not Found).
   * 2. Bloqueo de mutaciones sobre estados terminales (CLOSED, CANCELLED, REJECTED) -> 409 Conflict.
   * 3. Evaluación del grafo de transiciones autorizadas -> 409 Conflict.
   *
   * @param {number} id Identificador de la solicitud
   * @param {string} newStatus Estado objetivo
   * @param {string} [reason] Justificación del cambio
   * @returns {Promise<any>}
   */
  async transitionStatus(id, newStatus, reason = 'Actualización de estado') {
    if (!isValidStatus(newStatus)) {
      throw new BadRequestError(
        `El estado "${newStatus}" no es un estado válido del dominio. Estados permitidos: ${Object.values(
          REQUEST_STATUS
        ).join(', ')}`
      );
    }

    const current = await requestsStore.findById(id);
    if (!current) {
      throw new NotFoundError(`Solicitud con ID ${id} no encontrada.`);
    }

    // Regla FSM 1: Bloqueo absoluto de estados terminales
    if (isTerminalStatus(current.status)) {
      throw new ConflictError(
        `Conflicto de dominio: La solicitud #${id} se encuentra en estado terminal "${current.status}" y no permite nuevas transiciones.`
      );
    }

    // Regla FSM 2: Verificación de transición legal en el grafo
    if (!isTransitionAllowed(current.status, newStatus)) {
      throw new ConflictError(
        `Conflicto de dominio: Transición inválida de "${current.status}" hacia "${newStatus}".`
      );
    }

    // Persistencia atómica de la transición y su auditoría
    const updated = await requestsStore.updateStatusWithAudit(id, newStatus, reason);
    if (!updated) {
      throw new NotFoundError(`Solicitud con ID ${id} no encontrada.`);
    }

    // Recuperamos el registro con su historial para devolver el DTO completo
    const fullUpdated = await requestsStore.findWithLogsById(updated.id);
    return RequestMapper.toDTO(fullUpdated);
  }

  /**
   * Elimina una solicitud verificando reglas de negocio.
   * @param {number} id
   * @returns {Promise<void>}
   */
  async deleteRequest(id) {
    const existing = await requestsStore.findById(id);
    if (!existing) {
      throw new NotFoundError(`Solicitud con ID ${id} no encontrada.`);
    }

    if (existing.status === REQUEST_STATUS.CLOSED) {
      throw new ConflictError(
        `No es posible eliminar una solicitud en estado terminal "${REQUEST_STATUS.CLOSED}".`
      );
    }

    await requestsStore.deleteById(id);
  }
}

module.exports = new RequestsService();
