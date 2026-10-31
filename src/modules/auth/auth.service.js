const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const companiesStore = require('./companies.store');
const CompanyMapper = require('./company.mapper');
const BadRequestError = require('../../errors/bad-request-error');
const ConflictError = require('../../errors/conflict-error');
const UnauthorizedError = require('../../errors/unauthorized-error');
const NotFoundError = require('../../errors/not-found-error');

const BCRYPT_ROUNDS = 10;
const TOKEN_EXPIRY = '24h';

class AuthService {
  /**
   * Genera un token JWT firmado para una empresa.
   * @param {object} company
   * @returns {string}
   */
  generateToken(company) {
    const payload = {
      id: company.id,
      email: company.email,
      rif: company.rif,
      razonSocial: company.razon_social,
    };
    const secret = process.env.SECRET_KEY;
    if (!secret) {
      throw new Error('SECRET_KEY debe estar configurada para emitir tokens de autenticación.');
    }
    return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
  }

  /**
   * Registra una nueva empresa en el sistema.
   * @param {object} data
   * @returns {Promise<{ company: any, token: string }>}
   */
  async register(data) {
    // 1. Verificación de unicidad por correo y RIF
    const [existingEmail, existingRif] = await Promise.all([
      companiesStore.findByEmail(data.email),
      companiesStore.findByRif(data.rif),
    ]);

    if (existingEmail) {
      throw new ConflictError(`El correo electrónico "${data.email}" ya se encuentra registrado.`);
    }

    if (existingRif) {
      throw new ConflictError(`El RIF "${data.rif}" ya se encuentra registrado en el sistema.`);
    }

    // 2. Hashing criptográfico seguro con Salt
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // 3. Persistencia en PostgreSQL
    const created = await companiesStore.create({
      razonSocial: data.razonSocial,
      rif: data.rif,
      email: data.email,
      passwordHash,
      telefono: data.telefono,
    });

    const token = this.generateToken(created);

    return {
      company: CompanyMapper.toDTO(created),
      token,
    };
  }

  /**
   * Autentica una empresa y emite su token JWT.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ company: any, token: string }>}
   */
  async login(email, password) {
    const company = await companiesStore.findByEmail(email);
    if (!company) {
      // Mensaje genérico para evitar enumeración de usuarios (CWE-204)
      throw new UnauthorizedError('Credenciales inválidas. Verifique su correo o contraseña.');
    }

    const isMatch = await bcrypt.compare(password, company.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Credenciales inválidas. Verifique su correo o contraseña.');
    }

    const token = this.generateToken(company);

    return {
      company: CompanyMapper.toDTO(company),
      token,
    };
  }

  /**
   * Obtiene los datos del perfil de una empresa autenticada.
   * @param {string} id
   * @returns {Promise<any>}
   */
  async getProfile(id) {
    const company = await companiesStore.findById(id);
    if (!company) {
      throw new NotFoundError('Empresa no encontrada.');
    }
    return CompanyMapper.toDTO(company);
  }
}

module.exports = new AuthService();
