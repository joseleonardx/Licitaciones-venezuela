const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const BadRequestError = require('../../errors/bad-request-error');

// Asegurar que el directorio de uploads existe
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuración de almacenamiento en disco
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    cb(null, `propuesta-${uniqueSuffix}.pdf`);
  },
});

// Filtro estricto de tipo de archivo (Solo PDFs)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        'Tipo de archivo inválido. Solo se admiten documentos en formato PDF (.pdf).'
      ),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024, // Límite de 15 MB
  },
});

module.exports = upload;

