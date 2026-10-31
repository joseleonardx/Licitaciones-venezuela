/**
 * Transformador DTO para el dominio de Licitaciones (Licitations).
 */
class LicitationMapper {
  static toDTO(row) {
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      budget: row.budget !== null && row.budget !== undefined ? Number(row.budget) : 0,
      status: row.status,
      organization: row.organization || null,
      sector: row.sector || null,
      location: row.location || null,
      requirements: row.requirements || [],
      attachments: row.attachments || [],
      closingDate: row.closing_date ? new Date(row.closing_date).toISOString() : null,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
      ...(row.bids && { bids: row.bids }),
    };
  }

  static toDTOList(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => LicitationMapper.toDTO(r));
  }
}

module.exports = LicitationMapper;
