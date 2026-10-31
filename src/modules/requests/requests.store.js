const pool = require('../../database/pool');
const ConflictError = require('../../errors/conflict-error');
const { isTransitionAllowed } = require('./request-status');

/**
 * Capa de Persistencia y Acceso a Datos (Data Access Object / Store).
 *
 * Responsabilidades:
 * 1. Aislamiento total de las sentencias SQL fuera de la lógica de negocio.
 * 2. Neutralización absoluta de inyección SQL mediante consultas parametrizadas ($1, $2...).
 * 3. Garantía de transaccionalidad ACID (Atomicidad, Consistencia, Aislamiento y Durabilidad)
 *    con el ciclo estricto BEGIN / COMMIT / ROLLBACK.
 * 4. Liberación imperativa de conexiones (client.release()) en bloque finally para evitar
 *    fugas de sockets TCP en el pool de PostgreSQL.
 */
class RequestsStore {
  /**
   * Obtiene todas las solicitudes ordenadas cronológicamente.
   * @param {object} [filters]
   * @returns {Promise<Array<any>>}
   */
  async findAll(filters = {}) {
    let query = 'SELECT * FROM requests';
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      query += ` WHERE status = $${params.length}`;
    }

    query += ' ORDER BY created_at DESC;';

    const { rows } = await pool.query(query, params);
    return rows;
  }

  /**
   * Busca una solicitud por su identificador primario.
   * @param {number} id
   * @returns {Promise<any|null>}
   */
  async findById(id) {
    const query = 'SELECT * FROM requests WHERE id = $1;';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Obtiene una solicitud junto con todo su historial de cambios de estado (auditoría).
   * @param {number} id
   * @returns {Promise<any|null>}
   */
  async findWithLogsById(id) {
    const requestQuery = 'SELECT * FROM requests WHERE id = $1;';
    const logsQuery = `
      SELECT id, previous_status, new_status, reason, changed_at
      FROM request_status_logs
      WHERE request_id = $1
      ORDER BY changed_at ASC;
    `;

    const [requestRes, logsRes] = await Promise.all([
      pool.query(requestQuery, [id]),
      pool.query(logsQuery, [id]),
    ]);

    if (!requestRes.rows[0]) {
      return null;
    }

    const request = requestRes.rows[0];
    request.logs = logsRes.rows;
    return request;
  }

  /**
   * Bloque Transaccional Atómico: Crea una nueva solicitud y registra su evento
   * inicial en la tabla de auditoría bajo una misma transacción ACID.
   *
   * @param {object} data
   * @param {string} initialReason
   * @returns {Promise<any>}
   */
  async createWithAudit(data, initialReason = 'Creación inicial de la solicitud') {
    // 1. Adquisición manual de un cliente del pool para sostener la transacción
    const client = await pool.connect();

    try {
      // 2. Inicio de la transacción ACID
      await client.query('BEGIN');

      const insertRequestSql = `
        INSERT INTO requests (title, description, budget, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING *;
      `;
      const requestValues = [
        data.title,
        data.description || null,
        data.budget !== undefined ? data.budget : 0,
        data.status || 'PENDING',
      ];

      const requestRes = await client.query(insertRequestSql, requestValues);
      const createdRequest = requestRes.rows[0];

      // 3. Multi-escritura: Inserción vinculada en la tabla de auditoría
      const insertAuditSql = `
        INSERT INTO request_status_logs (request_id, previous_status, new_status, reason, changed_at)
        VALUES ($1, $2, $3, $4, NOW());
      `;
      const auditValues = [
        createdRequest.id,
        null, // Sin estado previo
        createdRequest.status,
        initialReason,
      ];

      await client.query(insertAuditSql, auditValues);

      // 4. Confirmación exitosa de todas las escrituras (All-or-Nothing)
      await client.query('COMMIT');
      return createdRequest;
    } catch (error) {
      // 5. Reversión inmediata ante cualquier excepción
      await client.query('ROLLBACK');
      throw error;
    } finally {
      // 6. LIBERACIÓN IMPERATIVA: Devuelve el socket al pool evitando fuga de conexiones
      client.release();
    }
  }

  /**
   * Bloque Transaccional Atómico: Actualiza el estado de una solicitud aplicando
   * bloqueo pesimista (FOR UPDATE) y registrando la auditoría de forma atómica.
   *
   * @param {number} id
   * @param {string} newStatus
   * @param {string} reason
   * @returns {Promise<any|null>}
   */
  async updateStatusWithAudit(id, newStatus, reason = 'Transición de estado') {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Bloqueo pesimista de fila para evitar condiciones de carrera (Race Conditions)
      const lockSql = 'SELECT * FROM requests WHERE id = $1 FOR UPDATE;';
      const lockRes = await client.query(lockSql, [id]);
      const current = lockRes.rows[0];

      if (!current) {
        await client.query('ROLLBACK');
        return null;
      }

      if (!isTransitionAllowed(current.status, newStatus)) {
        throw new ConflictError(
          `Conflicto de dominio: Transición inválida de "${current.status}" hacia "${newStatus}".`
        );
      }

      const updateSql = `
        UPDATE requests
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *;
      `;
      const updateRes = await client.query(updateSql, [newStatus, id]);
      const updated = updateRes.rows[0];

      const insertAuditSql = `
        INSERT INTO request_status_logs (request_id, previous_status, new_status, reason, changed_at)
        VALUES ($1, $2, $3, $4, NOW());
      `;
      await client.query(insertAuditSql, [id, current.status, newStatus, reason]);

      await client.query('COMMIT');
      return updated;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina una solicitud de forma segura.
   * @param {number} id
   * @returns {Promise<any|null>}
   */
  async deleteById(id) {
    const query = 'DELETE FROM requests WHERE id = $1 RETURNING *;';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }
}

module.exports = new RequestsStore();
