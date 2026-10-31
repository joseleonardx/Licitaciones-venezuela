-- =============================================================================
-- Migración 002: Agregar columna budget a la tabla requests si no existe
-- =============================================================================

ALTER TABLE requests
ADD COLUMN IF NOT EXISTS budget NUMERIC(12, 2) DEFAULT 0.00;

