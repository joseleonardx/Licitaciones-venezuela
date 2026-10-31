/**
 * Máquina de Estados Finitos (Finite State Machine - FSM) para el dominio de Solicitudes (Requests).
 *
 * Emplea inmutabilidad profunda con Object.freeze() para prevenir modificaciones
 * en tiempo de ejecución de las reglas y estados permitidos.
 */

const REQUEST_STATUS = Object.freeze({
  PENDING: 'PENDING',
  IN_REVIEW: 'IN_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
});

/**
 * Estados Terminales: Una vez que una solicitud alcanza uno de estos estados,
 * queda estrictamente bloqueada contra modificaciones o transiciones adicionales.
 */
const TERMINAL_STATUSES = Object.freeze([
  REQUEST_STATUS.CLOSED,
  REQUEST_STATUS.CANCELLED,
  REQUEST_STATUS.REJECTED,
]);

/**
 * Grafo de Transiciones Permitidas.
 * Cada clave representa el estado de origen y el valor es la lista inmutable
 * de estados destino autorizados por las reglas de negocio.
 */
const ALLOWED_TRANSITIONS = Object.freeze({
  [REQUEST_STATUS.PENDING]: Object.freeze([
    REQUEST_STATUS.IN_REVIEW,
    REQUEST_STATUS.CANCELLED,
  ]),
  [REQUEST_STATUS.IN_REVIEW]: Object.freeze([
    REQUEST_STATUS.APPROVED,
    REQUEST_STATUS.REJECTED,
    REQUEST_STATUS.CANCELLED,
  ]),
  [REQUEST_STATUS.APPROVED]: Object.freeze([
    REQUEST_STATUS.CLOSED,
    REQUEST_STATUS.CANCELLED,
  ]),
  [REQUEST_STATUS.REJECTED]: Object.freeze([]),
  [REQUEST_STATUS.CLOSED]: Object.freeze([]),
  [REQUEST_STATUS.CANCELLED]: Object.freeze([]),
});

/**
 * Verifica si un estado dado es un estado reconocido del dominio.
 * @param {string} status
 * @returns {boolean}
 */
function isValidStatus(status) {
  return typeof status === 'string' && Object.values(REQUEST_STATUS).includes(status);
}

/**
 * Determina si el estado corresponde a un estado terminal bloqueado.
 * @param {string} status
 * @returns {boolean}
 */
function isTerminalStatus(status) {
  return TERMINAL_STATUSES.includes(status);
}

/**
 * Evalúa si una transición entre dos estados está permitida por la FSM.
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {boolean}
 */
function isTransitionAllowed(currentStatus, nextStatus) {
  if (isTerminalStatus(currentStatus)) {
    return false;
  }
  const targetStatuses = ALLOWED_TRANSITIONS[currentStatus];
  return targetStatuses ? targetStatuses.includes(nextStatus) : false;
}

/**
 * Obtiene las transiciones posibles para un estado dado.
 * @param {string} currentStatus
 * @returns {readonly string[]}
 */
function getAllowedTransitions(currentStatus) {
  return ALLOWED_TRANSITIONS[currentStatus] || Object.freeze([]);
}

module.exports = Object.freeze({
  REQUEST_STATUS,
  TERMINAL_STATUSES,
  ALLOWED_TRANSITIONS,
  isValidStatus,
  isTerminalStatus,
  isTransitionAllowed,
  getAllowedTransitions,
});

