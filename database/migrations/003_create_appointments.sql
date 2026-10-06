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
