CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Partial trigram indexes: fast ILIKE '%term%' search on active patients only.
-- Exact CIN lookups already use the unique index patients_cin_key.
CREATE INDEX patients_full_name_trgm_idx ON patients USING gin (full_name gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX patients_cin_trgm_idx ON patients USING gin (cin gin_trgm_ops) WHERE deleted_at IS NULL;

-- Also covers lookups on patient_id alone (patient history, foreign key checks).
CREATE INDEX appointments_patient_id_date_idx ON appointments (patient_id, appointment_date);
CREATE INDEX appointments_date_idx ON appointments (appointment_date);
CREATE INDEX appointments_status_date_idx ON appointments (status, appointment_date);
CREATE INDEX appointments_created_by_idx ON appointments (created_by);
