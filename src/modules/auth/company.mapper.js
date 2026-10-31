/**
 * Transformador DTO para el dominio de Empresas (Companies).
 *
 * REGLA CRÍTICA DE SEGURIDAD:
 * Nunca expone password_hash ni datos internos sensibles al exterior.
 */
class CompanyMapper {
  /**
   * Mapea un registro de base de datos a un DTO seguro para clientes.
   * @param {Record<string, any>|null} row
   * @returns {Record<string, any>|null}
   */
  static toDTO(row) {
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      razonSocial: row.razon_social,
      rif: row.rif,
      email: row.email,
      telefono: row.telefono || null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    };
  }

  /**
   * Mapea una colección de registros a DTOs.
   * @param {Array<Record<string, any>>} rows
   * @returns {Array<Record<string, any>>}
   */
  static toDTOList(rows) {
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows.map((r) => CompanyMapper.toDTO(r));
  }
}

module.exports = CompanyMapper;

