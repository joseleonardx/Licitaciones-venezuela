-- Core schema used by the Node.js API and the PWA.
-- Existing rows with legacy request states are normalized before the constraint is tightened.

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razon_social VARCHAR(255) NOT NULL,
  rif VARCHAR(32) NOT NULL,
  email VARCHAR(320) NOT NULL,
  password_hash TEXT NOT NULL,
  telefono TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS licitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  budget NUMERIC(12, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  closing_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organization TEXT,
  sector TEXT,
  location TEXT,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE licitations
  ADD COLUMN IF NOT EXISTS organization TEXT,
  ADD COLUMN IF NOT EXISTS sector TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  licitation_id UUID NOT NULL REFERENCES licitations(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  pdf_url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_email_lower_unique
  ON companies (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_rif_upper_unique
  ON companies (UPPER(rif));

CREATE INDEX IF NOT EXISTS idx_licitations_status_closing
  ON licitations (status, closing_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_licitation_company_unique
  ON bids (licitation_id, company_id);

CREATE INDEX IF NOT EXISTS idx_bids_company_submitted_at
  ON bids (company_id, submitted_at DESC);

UPDATE requests
SET status = CASE LOWER(status)
  WHEN 'open' THEN 'PENDING'
  WHEN 'in_progress' THEN 'IN_REVIEW'
  WHEN 'resolved' THEN 'APPROVED'
  WHEN 'closed' THEN 'CLOSED'
  WHEN 'cancelled' THEN 'CANCELLED'
  ELSE UPPER(status)
END
WHERE LOWER(status) IN (
  'open', 'in_progress', 'resolved', 'closed', 'cancelled'
);

UPDATE request_status_logs
SET previous_status = CASE LOWER(previous_status)
  WHEN 'open' THEN 'PENDING'
  WHEN 'in_progress' THEN 'IN_REVIEW'
  WHEN 'resolved' THEN 'APPROVED'
  WHEN 'closed' THEN 'CLOSED'
  WHEN 'cancelled' THEN 'CANCELLED'
  ELSE UPPER(previous_status)
END
WHERE previous_status IS NOT NULL
  AND LOWER(previous_status) IN (
    'open', 'in_progress', 'resolved', 'closed', 'cancelled'
  );

UPDATE request_status_logs
SET new_status = CASE LOWER(new_status)
  WHEN 'open' THEN 'PENDING'
  WHEN 'in_progress' THEN 'IN_REVIEW'
  WHEN 'resolved' THEN 'APPROVED'
  WHEN 'closed' THEN 'CLOSED'
  WHEN 'cancelled' THEN 'CANCELLED'
  ELSE UPPER(new_status)
END
WHERE LOWER(new_status) IN (
  'open', 'in_progress', 'resolved', 'closed', 'cancelled'
);

ALTER TABLE requests
  DROP CONSTRAINT IF EXISTS requests_status_check;

ALTER TABLE requests
  ADD CONSTRAINT requests_status_check
  CHECK (status = ANY (ARRAY[
    'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CLOSED', 'CANCELLED'
  ]));
