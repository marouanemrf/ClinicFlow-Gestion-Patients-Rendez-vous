-- ClinicFlow full schema (reference only).
-- Generated from database/migrations/*.sql — use `npm run migrate` to apply changes.

-- ===== 001_create_users.sql =====
CREATE TYPE user_role AS ENUM ('admin', 'staff');

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name     VARCHAR(150) NOT NULL,
    email         VARCHAR(254) NOT NULL,
    password_hash TEXT NOT NULL,
    role          user_role NOT NULL DEFAULT 'staff',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_full_name_not_blank CHECK (length(btrim(full_name)) > 0),
    CONSTRAINT users_email_normalized CHECK (email = lower(btrim(email))),
    CONSTRAINT users_password_hash_bcrypt CHECK (password_hash ~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$')
);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== 002_create_patients.sql =====
CREATE TABLE patients (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name  VARCHAR(150) NOT NULL,
    cin        VARCHAR(20) NOT NULL,
    phone      VARCHAR(20) NOT NULL,
    birth_date DATE NOT NULL,
    address    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Soft delete: archived patients keep their appointment history.
    deleted_at TIMESTAMPTZ,
    -- A CIN identifies a person, so it stays unique even after archiving.
    CONSTRAINT patients_cin_key UNIQUE (cin),
    CONSTRAINT patients_full_name_not_blank CHECK (length(btrim(full_name)) > 0),
    CONSTRAINT patients_cin_normalized CHECK (cin = upper(btrim(cin)) AND length(cin) > 0),
    CONSTRAINT patients_birth_date_valid CHECK (birth_date BETWEEN DATE '1900-01-01' AND CURRENT_DATE)
);

CREATE TRIGGER patients_set_updated_at
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== 003_create_appointments.sql =====
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'cancelled');

-- 30-minute slot starting at the appointment time. Adding a fixed number of minutes
-- does not depend on the session time zone, so the function is truly IMMUTABLE
-- (required to be used in the exclusion constraint below).
CREATE FUNCTION appointment_slot(starts_at TIMESTAMPTZ) RETURNS TSTZRANGE AS $$
    SELECT tstzrange(starts_at, starts_at + interval '30 minutes');
$$ LANGUAGE sql IMMUTABLE;

CREATE TABLE appointments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- RESTRICT: patients are soft-deleted, a hard delete must never wipe medical history.
    patient_id       UUID NOT NULL REFERENCES patients (id) ON DELETE RESTRICT,
    appointment_date TIMESTAMPTZ NOT NULL,
    status           appointment_status NOT NULL DEFAULT 'pending',
    reason           VARCHAR(255) NOT NULL,
    notes            TEXT,
    -- RESTRICT: keeps the audit trail of who created each appointment.
    created_by       UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT appointments_reason_not_blank CHECK (length(btrim(reason)) > 0),
    -- Business rule backstop: two ranges [t, t + 30min) overlap exactly when the
    -- appointments are less than 30 minutes apart. The service checks this first and
    -- returns a readable 409; this constraint guarantees it even under concurrency.
    CONSTRAINT appointments_no_confirmed_overlap EXCLUDE USING gist (
        patient_id WITH =,
        appointment_slot(appointment_date) WITH &&
    ) WHERE (status = 'confirmed')
);

CREATE TRIGGER appointments_set_updated_at
BEFORE UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ===== 004_create_indexes.sql =====
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

