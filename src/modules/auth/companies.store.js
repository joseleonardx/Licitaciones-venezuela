const pool = require('../../database/pool');

/**
 * Capa de Persistencia para la entidad Company.
 * Emplea consultas SQL parametrizadas para neutralizar Inyección SQL.
 */
class CompaniesStore {
  /**
   * Busca una empresa por su correo electrónico.
   * @param {string} email
   * @returns {Promise<any|null>}
   */
  async findByEmail(email) {
    const query = 'SELECT * FROM companies WHERE LOWER(email) = LOWER($1);';
    const { rows } = await pool.query(query, [email]);
    return rows[0] || null;
  }

  /**
   * Busca una empresa por su RIF.
   * @param {string} rif
   * @returns {Promise<any|null>}
   */
  async findByRif(rif) {
    const query = 'SELECT * FROM companies WHERE UPPER(rif) = UPPER($1);';
    const { rows } = await pool.query(query, [rif]);
    return rows[0] || null;
  }

  /**
   * Busca una empresa por su ID primario (UUID).
   * @param {string} id
   * @returns {Promise<any|null>}
   */
  async findById(id) {
    const query = 'SELECT * FROM companies WHERE id = $1;';
    const { rows } = await pool.query(query, [id]);
    return rows[0] || null;
  }

  /**
   * Registra una nueva empresa en PostgreSQL.
   * @param {object} data
   * @returns {Promise<any>}
   */
  async create(data) {
    const query = `
      INSERT INTO companies (razon_social, rif, email, password_hash, telefono, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `;
    const values = [
      data.razonSocial,
      data.rif.trim().toUpperCase(),
      data.email.trim().toLowerCase(),
      data.passwordHash,
      data.telefono || null,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}

module.exports = new CompaniesStore();

