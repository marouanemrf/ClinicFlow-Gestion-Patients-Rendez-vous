-- ClinicFlow demo data (idempotent: safe to run several times).
-- Passwords are stored as bcrypt hashes:
--   admin@clinicflow.com  / Admin123!
--   staff1@clinicflow.com / Staff123!
--   staff2@clinicflow.com / Staff123!
-- Appointment dates are relative to "today" in the clinic time zone so the dashboard always has data.
SET TIME ZONE 'Africa/Casablanca';

INSERT INTO users (full_name, email, password_hash, role) VALUES
    ('Admin ClinicFlow', 'admin@clinicflow.com',  '$2b$10$Nab8beJY.NfAikdMQcymX.Bm.6ww.ie0CVbCajHz5JSTY1jM5a4em', 'admin'),
    ('Sara Bennis',      'staff1@clinicflow.com', '$2b$10$3vwtASDPncsEbm/WGUx6Tes0ZOU2zy4Z6otOlgQl6GyuyUo8ESlt2', 'staff'),
    ('Youssef Karimi',   'staff2@clinicflow.com', '$2b$10$3vwtASDPncsEbm/WGUx6Tes0ZOU2zy4Z6otOlgQl6GyuyUo8ESlt2', 'staff')
ON CONFLICT (email) DO NOTHING;

INSERT INTO patients (full_name, cin, phone, birth_date, address) VALUES
    ('Amine El Idrissi', 'AB123456', '+212 661 234 567', '1988-04-12', '12 Rue Ibn Sina, Casablanca'),
    ('Salma Bennani',    'BE456789', '+212 662 345 678', '1995-09-03', '45 Avenue Hassan II, Rabat'),
    ('Omar Alaoui',      'CD789012', '+212 663 456 789', '1972-01-27', NULL),
    ('Lina Tazi',        'EF234567', '+212 664 567 890', '2001-06-15', '8 Boulevard Zerktouni, Casablanca'),
    ('Hassan Amrani',    'GH345678', '+212 665 678 901', '1960-11-30', '23 Rue de Fès, Marrakech')
ON CONFLICT (cin) DO NOTHING;

INSERT INTO appointments (id, patient_id, appointment_date, status, reason, notes, created_by)
SELECT a.id::uuid,
       p.id,
       (CURRENT_DATE + a.day_offset) + a.at_time::time,
       a.status::appointment_status,
       a.reason,
       a.notes,
       u.id
FROM (VALUES
    -- Amine: confirmed at 09:00, pending at 09:15 -> confirming it demonstrates the 30-minute rule (409).
    ('a0000000-0000-4000-8000-000000000001', 'AB123456',  0, '09:00', 'confirmed', 'General consultation', 'Bring previous blood test results', 'admin@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000002', 'AB123456',  0, '09:15', 'pending',   'Blood pressure check', NULL,                                'staff1@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000003', 'BE456789',  0, '10:00', 'confirmed', 'Dermatology follow-up', NULL,                               'staff1@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000004', 'BE456789',  1, '11:00', 'pending',   'Lab results review', 'Fasting not required',             'staff2@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000005', 'CD789012',  0, '11:30', 'pending',   'Diabetes follow-up', NULL,                                  'staff2@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000006', 'CD789012', -3, '14:00', 'confirmed', 'Annual check-up', 'All results normal',                    'admin@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000007', 'EF234567',  0, '14:00', 'cancelled', 'Vaccination', 'Cancelled by the patient',                  'staff1@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000008', 'EF234567',  2, '09:00', 'confirmed', 'Vaccination', 'Rescheduled appointment',                   'staff1@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000009', 'GH345678', -7, '10:00', 'cancelled', 'Cardiology consultation', NULL,                            'staff2@clinicflow.com'),
    ('a0000000-0000-4000-8000-000000000010', 'GH345678',  1, '15:30', 'confirmed', 'Cardiology consultation', 'ECG to be performed on site',   'admin@clinicflow.com')
) AS a (id, cin, day_offset, at_time, status, reason, notes, creator_email)
JOIN patients p ON p.cin = a.cin
JOIN users u ON u.email = a.creator_email
ON CONFLICT DO NOTHING;
