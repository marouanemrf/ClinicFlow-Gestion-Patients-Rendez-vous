# ClinicFlow — Conception

Ce document décrit le schéma de la base de données, la justification des relations et la conception
objet (diagrammes de classes). Il reflète exactement les migrations `database/migrations/001` à `005`
et le code de `backend/src`.

---

## 1. Schéma de la base de données (ERD)

```mermaid
erDiagram
    USERS ||--o{ APPOINTMENTS : "crée (created_by)"
    PATIENTS ||--o{ APPOINTMENTS : "a (patient_id)"

    USERS {
        uuid id PK
        varchar full_name "NOT NULL"
        varchar email UK "NOT NULL, en minuscules"
        text password_hash "NOT NULL, hash bcrypt"
        user_role role "admin | staff"
        timestamptz created_at
        timestamptz updated_at
    }

    PATIENTS {
        uuid id PK
        varchar full_name "NOT NULL"
        varchar cin UK "NOT NULL, en majuscules"
        varchar phone "NOT NULL"
        date birth_date "entre 1900-01-01 et aujourd'hui"
        text address "nullable"
        varchar photo "nullable, nom du fichier image"
        timestamptz photo_updated_at "nullable"
        timestamptz created_at
        timestamptz updated_at
        timestamptz deleted_at "nullable, soft delete"
    }

    APPOINTMENTS {
        uuid id PK
        uuid patient_id FK "NOT NULL → patients.id"
        timestamptz appointment_date "NOT NULL"
        appointment_status status "pending | confirmed | cancelled"
        varchar reason "NOT NULL"
        text notes "nullable"
        uuid created_by FK "NOT NULL → users.id"
        timestamptz created_at
        timestamptz updated_at
    }
```

### Dictionnaire des données

**`users`** : comptes des employés de la clinique.

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | `UUID` | Clé primaire, `gen_random_uuid()` |
| `full_name` | `VARCHAR(150)` | Obligatoire, non vide |
| `email` | `VARCHAR(254)` | Obligatoire, **unique**, stocké en minuscules |
| `password_hash` | `TEXT` | Obligatoire, doit être un hash **bcrypt** (jamais le mot de passe en clair) |
| `role` | `user_role` (ENUM) | `admin` ou `staff`, `staff` par défaut |
| `created_at`, `updated_at` | `TIMESTAMPTZ` | `updated_at` mis à jour par trigger |

**`patients`** : dossiers des patients.

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | `UUID` | Clé primaire |
| `full_name` | `VARCHAR(150)` | Obligatoire, non vide |
| `cin` | `VARCHAR(20)` | Obligatoire, **unique**, stocké en majuscules |
| `phone` | `VARCHAR(20)` | Obligatoire |
| `birth_date` | `DATE` | Entre le 01/01/1900 et aujourd'hui |
| `address` | `TEXT` | Facultatif |
| `photo` | `VARCHAR(64)` | Facultatif ; nom de fichier généré par l'API (`<uuid>.jpg/png/webp`) |
| `photo_updated_at` | `TIMESTAMPTZ` | Renseigné si et seulement si `photo` l'est |
| `deleted_at` | `TIMESTAMPTZ` | `NULL` = actif ; une date = patient archivé (soft delete) |

**`appointments`** : rendez-vous.

| Colonne | Type | Contraintes |
| --- | --- | --- |
| `id` | `UUID` | Clé primaire |
| `patient_id` | `UUID` | Obligatoire, FK → `patients.id`, `ON DELETE RESTRICT` |
| `appointment_date` | `TIMESTAMPTZ` | Obligatoire (instant précis, fuseau de la clinique pour l'affichage) |
| `status` | `appointment_status` (ENUM) | `pending`, `confirmed` ou `cancelled` ; `pending` par défaut |
| `reason` | `VARCHAR(255)` | Obligatoire, non vide |
| `notes` | `TEXT` | Facultatif |
| `created_by` | `UUID` | Obligatoire, FK → `users.id`, `ON DELETE RESTRICT` ; vient du JWT |

**Règle des 30 minutes en base** : la contrainte d'exclusion
`EXCLUDE USING gist (patient_id WITH =, appointment_slot(appointment_date) WITH &&) WHERE (status = 'confirmed')`
interdit deux rendez-vous **confirmés** d'un même patient à moins de 30 minutes d'écart.
`appointment_slot(t)` renvoie l'intervalle `[t, t + 30 min)` ; deux intervalles se chevauchent exactement
quand l'écart est inférieur à 30 minutes. Ainsi, 10:00 et 10:15 sont en conflit, mais pas 10:00 et 10:30.

### Index

| Index | Rôle |
| --- | --- |
| `patients_cin_key` (unique) | Unicité et recherche exacte du CIN |
| `patients_full_name_trgm_idx`, `patients_cin_trgm_idx` (GIN trigram, partiels `WHERE deleted_at IS NULL`) | Recherche `ILIKE '%texte%'` rapide sur les patients actifs |
| `users_email_key` (unique) | Unicité et connexion par email |
| `appointments_patient_id_date_idx (patient_id, appointment_date)` | Historique d'un patient, vérification des 30 minutes, contrôles de FK |
| `appointments_date_idx (appointment_date)` | Filtre par date, rendez-vous du jour |
| `appointments_status_date_idx (status, appointment_date)` | Filtre par statut, compteurs du dashboard |
| `appointments_created_by_idx (created_by)` | Contrôles de FK sur `users` |

---

## 2. Relations et justification

| Relation | Cardinalité | Mise en œuvre |
| --- | --- | --- |
| Un **utilisateur** crée des **rendez-vous** | **1 – N** | `appointments.created_by → users.id` |
| Un **patient** a des **rendez-vous** | **1 – N** | `appointments.patient_id → patients.id` |

Cardinalités détaillées (notation Merise) :

```text
USERS     (0,n) ──── crée ────  (1,1) APPOINTMENTS
PATIENTS  (0,n) ──── a ───────  (1,1) APPOINTMENTS
```

### Pourquoi 1 – N

- **Utilisateur → rendez-vous (1-N).** Un membre du personnel enregistre de nombreux rendez-vous au fil du
  temps (0 à n), mais chaque rendez-vous a **un seul auteur** (exactement 1). Une clé étrangère
  `created_by` obligatoire (`NOT NULL`) côté « N » suffit. Elle est remplie à partir du JWT, jamais
  du corps de la requête, ce qui en fait une **trace d'audit** fiable.
- **Patient → rendez-vous (1-N).** Un patient peut avoir aucun, un ou plusieurs rendez-vous
  (consultation, suivi, contrôle...), mais un rendez-vous concerne **un seul patient**. D'où la
  clé étrangère obligatoire `patient_id`.

### Pourquoi pas de 1 – 1

Aucune donnée n'existe en exactement un exemplaire pour une autre entité tout en méritant sa propre table.
La **photo du patient** aurait pu être une table `patient_photos` en 1-1, mais elle ne contient qu'un nom
de fichier et une date : deux colonnes facultatives dans `patients` évitent une jointure, sans perte
d'intégrité. La contrainte `patients_photo_consistent` garantit qu'elles sont remplies ensemble.

### Pourquoi pas de N – N

- Un patient est vu par plusieurs employés, et un employé gère plusieurs patients. Mais ce lien passe
  **toujours par un rendez-vous**, qui a sa propre identité et ses propres données (date, statut, motif,
  notes). Ce n'est donc pas une simple table de jointure : `appointments` est une **entité** reliée par
  deux relations 1-N.
- `created_by` désigne **l'auteur** du rendez-vous, pas un médecin traitant. Il n'y a pas, dans cette
  version, d'affectation de médecins à des patients ni de spécialités multiples, qui seraient les cas
  typiques de N-N (par exemple une table `doctor_specialties`).

### Règles `ON DELETE`

| Clé étrangère | Règle | Justification |
| --- | --- | --- |
| `appointments.patient_id` | `RESTRICT` | Les patients sont **archivés** (`deleted_at`), jamais supprimés : l'historique médical est conservé. `RESTRICT` empêche qu'un `DELETE` SQL accidentel efface les rendez-vous (un `CASCADE` les supprimerait silencieusement). |
| `appointments.created_by` | `RESTRICT` | Préserve la traçabilité « qui a créé ce rendez-vous ». Il n'y a pas de suppression d'utilisateur dans l'API. |

---

## 3. Diagramme de classes

Le backend est écrit en JavaScript avec des **modules de fonctions** (pas de classes ES6). Les diagrammes
ci-dessous représentent ces modules comme des classes UML : le premier modélise le **domaine métier**,
le second l'**architecture en couches** avec les fonctions réellement exposées par chaque module.

### 3.1 Modèle du domaine

Les attributs correspondent aux objets JSON de l'API (camelCase). Le repository fait la conversion
depuis les colonnes SQL (snake_case), par exemple `full_name AS "fullName"`.

```mermaid
classDiagram
    direction LR

    class User {
        +UUID id
        +String fullName
        +String email
        -String passwordHash
        +Role role
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Patient {
        +UUID id
        +String fullName
        +String cin
        +String phone
        +Date birthDate
        +String address
        +Boolean hasPhoto
        +DateTime photoUpdatedAt
        +DateTime createdAt
        +DateTime updatedAt
        -DateTime deletedAt
        +age() int
        +isArchived() bool
    }

    class Appointment {
        +UUID id
        +DateTime appointmentDate
        +AppointmentStatus status
        +String reason
        +String notes
        +DateTime createdAt
        +DateTime updatedAt
        +confirm()
        +cancel()
    }

    class Role {
        <<enumeration>>
        admin
        staff
    }

    class AppointmentStatus {
        <<enumeration>>
        pending
        confirmed
        cancelled
    }

    User "1" --> "0..*" Appointment : crée (createdBy)
    Patient "1" --> "0..*" Appointment : a (patientId)
    User ..> Role
    Appointment ..> AppointmentStatus
```

Image : [diagramme-classes-domaine.png](images/diagramme-classes-domaine.png) ([SVG](images/diagramme-classes-domaine.svg))

Règles métier portées par le modèle :

- **`Appointment.confirm()`** refuse (HTTP 409) si le même patient a déjà un rendez-vous `confirmed` à
  moins de 30 minutes. Implémenté dans `appointmentService.updateAppointmentStatus` et
  `createAppointment`, puis garanti en base par la contrainte d'exclusion.
- **Patient archivé** (`deletedAt` renseigné) : il n'apparaît plus dans les listes et ne peut plus
  recevoir de nouveau rendez-vous ni de confirmation. L'annulation reste possible.
- **`passwordHash`** est privé : il n'est jamais renvoyé par l'API.
- Seul un **`admin`** peut archiver un patient ou créer des comptes.

### 3.2 Architecture du backend (couches)

Chaque requête traverse : `Route → Middlewares → Controller → Service → Repository → PostgreSQL`.

```mermaid
classDiagram
    direction TB

    class AuthController {
        <<controller>>
        +login(req, res)
        +me(req, res)
    }
    class PatientController {
        <<controller>>
        +list(req, res)
        +getById(req, res)
        +listAppointments(req, res)
        +create(req, res)
        +update(req, res)
        +remove(req, res)
        +uploadPhoto(req, res)
        +deletePhoto(req, res)
        +getPhoto(req, res)
    }
    class AppointmentController {
        <<controller>>
        +list(req, res)
        +create(req, res)
        +updateStatus(req, res)
    }
    class DashboardController {
        <<controller>>
        +getStats(req, res)
    }
    class UserController {
        <<controller>>
        +list(req, res)
        +create(req, res)
    }

    class AuthService {
        <<service>>
        +login(email, password) Session
    }
    class PatientService {
        <<service>>
        +listPatients(search, page, limit) Page~Patient~
        +getPatient(id) Patient
        +createPatient(input) Patient
        +updatePatient(id, input) Patient
        +deletePatient(id)
        +updatePhoto(id, buffer) Patient
        +deletePhoto(id) Patient
        +getPhotoFile(id) File
        -assertCinAvailable(cin, currentId)
    }
    class AppointmentService {
        <<service>>
        +listAppointments(filters) Page~Appointment~
        +listPatientAppointments(patientId) Page~Appointment~
        +createAppointment(input, createdBy) Appointment
        +updateAppointmentStatus(id, status) Appointment
        -lockActivePatient(client, patientId)
        -assertNoConfirmedConflict(client, patientId, date, excludeId)
    }
    class DashboardService {
        <<service>>
        +getStats() Stats
    }
    class UserService {
        <<service>>
        +listUsers() User[]
        +createUser(input) User
    }
    class TokenService {
        <<service>>
        +sign(user) String
        +verify(token) Payload
    }
    class PasswordService {
        <<service>>
        +hash(password) String
        +verify(password, hash) bool
    }
    class PhotoStorage {
        <<service>>
        +save(buffer) String
        +resolve(filename) File
        +remove(filename)
    }

    class UserRepository {
        <<repository>>
        +findById(id) User
        +findByEmailWithPassword(email) User
        +findAll() User[]
        +create(user) User
    }
    class PatientRepository {
        <<repository>>
        +findMany(search, limit, offset)
        +findActiveById(id) Patient
        +lockById(client, id)
        +findByCin(cin)
        +create(patient) Patient
        +update(id, patient) Patient
        +softDelete(id) bool
        +findPhotoFilename(id)
        +updatePhoto(id, filename) Patient
        +countActive() int
    }
    class AppointmentRepository {
        <<repository>>
        +findMany(filters, limit, offset)
        +findById(id) Appointment
        +findByIdForUpdate(client, id)
        +resolveDate(client, rawDate)
        +hasConfirmedConflict(client, patientId, date, excludeId) bool
        +create(client, appointment) UUID
        +updateStatus(client, id, status)
        +getDashboardCounts() Counts
    }

    AuthController --> AuthService
    PatientController --> PatientService
    PatientController --> AppointmentService
    AppointmentController --> AppointmentService
    DashboardController --> DashboardService
    UserController --> UserService

    AuthService --> UserRepository
    AuthService --> PasswordService
    AuthService --> TokenService
    UserService --> UserRepository
    UserService --> PasswordService
    PatientService --> PatientRepository
    PatientService --> PhotoStorage
    AppointmentService --> AppointmentRepository
    AppointmentService --> PatientRepository
    DashboardService --> PatientRepository
    DashboardService --> AppointmentRepository
```

Image : [diagramme-classes-architecture.png](images/diagramme-classes-architecture.png) ([SVG](images/diagramme-classes-architecture.svg))

Middlewares transverses (appliqués par les routes, avant les contrôleurs) :

| Middleware | Rôle |
| --- | --- |
| `authMiddleware` | Vérifie le JWT (`TokenService.verify`) et recharge l'utilisateur (`UserRepository.findById`). Répond 401 sinon. |
| `roleMiddleware(...roles)` | Répond 403 si le rôle n'est pas autorisé, par exemple `roleMiddleware('admin')` sur `DELETE /patients/:id`. |
| `validate(schemas)` | Valide `body`, `query` et `params` avec Zod. Répond 400 avec le détail par champ. |
| `uploadPhoto` | Reçoit la photo patient (multer, en mémoire, 2 Mo maximum). |
| `errorHandler` | Convertit toute erreur au format `{ success: false, message, error }` (400, 401, 403, 404, 409, 413 ou 500). |

Responsabilités des couches :

- **Controller** : traduit HTTP vers un appel de service, puis le résultat en réponse JSON. Pas de logique métier.
- **Service** : règles métier (30 minutes, soft delete, unicité du CIN, hash des mots de passe) et transactions.
- **Repository** : uniquement des requêtes SQL **paramétrées** (`$1`, `$2`...), sans concaténation de données
  utilisateur.
