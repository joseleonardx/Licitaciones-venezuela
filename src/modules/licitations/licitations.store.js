const pool = require('../../database/pool');

/**
 * Persistencia para la tabla licitations.
 */
class LicitationsStore {
  async findAllActive() {
    const query = `
      SELECT * FROM licitations
      WHERE status = 'active' AND closing_date > NOW()
      ORDER BY closing_date ASC;
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  async findAll() {
    const query = 'SELECT * FROM licitations ORDER BY created_at DESC;';
    const { rows } = await pool.query(query);
    return rows;
  }

  async findById(id) {
    const query = 'SELECT * FROM licitations WHERE id = $1;';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  async create(data) {
    const query = `
      INSERT INTO licitations (
        title, description, budget, status, closing_date, created_at,
        organization, sector, location, requirements, attachments
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10)
      RETURNING *;
    `;
    const values = [
      data.title,
      data.description,
      data.budget,
      data.status || 'active',
      data.closingDate,
      data.organization,
      data.sector,
      data.location,
      JSON.stringify(data.requirements),
      JSON.stringify(data.attachments),
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}

module.exports = new LicitationsStore();
