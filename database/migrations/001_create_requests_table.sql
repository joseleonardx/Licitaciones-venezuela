-- =============================================================================
-- Migración 001: Creación de tablas de solicitudes (requests) y auditoría
-- Arquitectura Modular por Dominios - Persistencia Relacional
-- =============================================================================

CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    budget NUMERIC(12, 2) DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla de trazabilidad y auditoría de cambios de estado (FSM transitions)
CREATE TABLE IF NOT EXISTS request_status_logs (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    previous_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    reason TEXT,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de optimización para consultas frecuentes por estado y fecha
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_status_logs_request_id ON request_status_logs(request_id);

