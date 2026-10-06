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
