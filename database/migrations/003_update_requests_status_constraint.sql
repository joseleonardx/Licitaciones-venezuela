-- =============================================================================
-- Migración 003: Actualizar constraint de estados para permitir FSM y estados terminales
-- Conserva compatibilidad con solicitudes creadas antes de alinear los estados.
-- Migración 004 normaliza los estados heredados y aplica el conjunto canónico.
-- =============================================================================

ALTER TABLE requests
DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE requests
ADD CONSTRAINT requests_status_check
CHECK (status = ANY (ARRAY[
  'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED', 'CANCELLED',
  'open', 'in_progress', 'resolved', 'closed', 'cancelled'
]));
