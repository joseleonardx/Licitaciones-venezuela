const pool = require('../../database/pool');

/**
 * Persistencia para la tabla bids (ofertas de licitaciones).
 */
class BidsStore {
  async create(data) {
    const query = `
      INSERT INTO bids (licitation_id, company_id, pdf_url, status, submitted_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    const values = [
      data.licitationId,
      data.companyId,
      data.pdfUrl,
      data.status || 'submitted',
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  async findByLicitationAndCompany(licitationId, companyId) {
    const query = `
      SELECT * FROM bids
      WHERE licitation_id = $1 AND company_id = $2;
    `;
    const { rows } = await pool.query(query, [licitationId, companyId]);
    return rows[0] || null;
  }

  async findByCompany(companyId) {
    const query = `
      SELECT b.*, l.title as licitation_title
      FROM bids b
      JOIN licitations l ON b.licitation_id = l.id
      WHERE b.company_id = $1
      ORDER BY b.submitted_at DESC;
    `;
    const { rows } = await pool.query(query, [companyId]);
    return rows;
  }

  async findByLicitation(licitationId) {
    const query = `
      SELECT b.*, c.razon_social, c.rif
      FROM bids b
      JOIN companies c ON b.company_id = c.id
      WHERE b.licitation_id = $1
      ORDER BY b.submitted_at ASC;
    `;
    const { rows } = await pool.query(query, [licitationId]);
    return rows;
  }
}

module.exports = new BidsStore();

