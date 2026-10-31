/**
 * Transformador DTO (Data Transfer Object) para el dominio de Solicitudes (Requests).
 *
 * Desacopla la estructura física del modelo de datos relacional (columnas SQL snake_case)
 * de la interfaz pública expuesta a los clientes HTTP (JSON camelCase).
 */
class RequestMapper {
  /**
   * Transforma una fila de PostgreSQL a un DTO de respuesta.
   * @param {Record<string, any>|null} row
   * @returns {Record<string, any>|null}
   */
  static toDTO(row) {
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      title: row.title,
      description: row.description || null,
      budget: row.budget !== null && row.budget !== undefined ? Number(row.budget) : 0,
      status: row.status,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      ...(row.logs && {
        statusHistory: row.logs.map((log) => ({
          id: log.id,
          previousStatus: log.previous_status,
          newStatus: log.new_status,
          reason: log.reason,
          changedAt: log.changed_at ? new Date(log.changed_at).toISOString() : null,
        })),
      }),
    };
  }

  /**
   * Transforma un array de filas a una colección de DTOs.
   * @param {Array<Record<string, any>>} rows
   * @returns {Array<Record<string, any>>}
   */
  static toDTOList(rows) {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map((row) => RequestMapper.toDTO(row));
  }
}

module.exports = RequestMapper;

