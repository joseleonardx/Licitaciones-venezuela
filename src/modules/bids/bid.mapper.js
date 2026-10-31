/**
 * Transformador DTO para el dominio de Postulaciones / Ofertas (Bids).
 */
class BidMapper {
  static toDTO(row) {
    if (!row) return null;

    return {
      id: row.id,
      licitationId: row.licitation_id,
      companyId: row.company_id,
      pdfUrl: row.pdf_url,
      status: row.status,
      submittedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : null,
      ...(row.licitation_title && { licitationTitle: row.licitation_title }),
      ...(row.razon_social && {
        company: {
          razonSocial: row.razon_social,
          rif: row.rif,
        },
      }),
    };
  }

  static toDTOList(rows) {
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => BidMapper.toDTO(r));
  }
}

module.exports = BidMapper;

