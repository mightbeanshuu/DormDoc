# Schema Mapping: Mongoose → Postgres

> Phase 1.1 deliverable. Maps every Mongoose model in `src/server/models/` to its target Postgres table on Supabase. The actual `CREATE TABLE` SQL lives in Phase 1.3 migrations; this file is the design source-of-truth.

## Top-level decisions

1. **`auth.users` (Supabase) is the identity root.** `profiles.id` = `auth.users.id` (1:1 FK).
2. **Consolidate `User` + `Student` → one `students` table.** Existing `User` model is a legacy student record (same fields: `studentId`, `department`, `year`, `bloodGroup`, `emergencyContact`, `medicalHistory`). `Student` is the richer, newer model and is the migration target. ETL maps each Mongo `User` doc to a `profiles` + `students` row pair.
3. **Consolidate `Doctor` → `dispensary_staff` with `staff_type='medical_officer'`.** `DispensaryStaff` already covers doctors via the enum; the standalone `Doctor` model only adds availability/queue/rating, which become separate columns or sub-tables on `dispensary_staff`.
4. **Roles live in one column on `profiles`** (`role` enum). Role-specific data lives in role tables. HOD = faculty with `role='hod'` and `hod_department` set.
5. **Drop `OTP` model entirely.** Supabase Auth handles email OTP natively.
6. **camelCase → snake_case** for every field.
7. **Embedded arrays** become child tables when relational queries matter (`medications`, `status_history`, `equipment`, `maintenance_issues`, `parent_student_links`). They stay as `text[]` or `jsonb` when only read as a blob (`allergies`, `chronic_conditions`, `qualification`).
8. **Timestamps:** every table gets `created_at timestamptz default now()` + `updated_at timestamptz default now()` with a generic `set_updated_at()` trigger.
9. **PKs:** `uuid` via `gen_random_uuid()` (Postgres 13+ built-in) unless the row belongs to `auth.users`, in which case `id uuid references auth.users(id) on delete cascade`.

---

## Model → Table map

| Mongoose model | Postgres table(s) | Status |
|---|---|---|
| `User` | `profiles` + `students` (consolidated with Student) | merge |
| `Student` | `profiles` + `students` | rename |
| `Faculty` | `profiles` + `faculty` | split |
| `Parent` | `profiles` + `parents` + `parent_student_links` | split |
| `Doctor` | `dispensary_staff` (`staff_type='medical_officer'`) + `staff_availability` | merge |
| `DispensaryStaff` | `profiles` + `dispensary_staff` + `staff_availability` | split |
| `OTP` | **deleted** | drop |
| `Prescription` | `prescriptions` + `prescription_medications` | split |
| `Appointment` | `appointments` + `leave_requests` (extract `leaveRequest` subdoc) | split |
| `InventoryItem` | `inventory_items` | 1:1 |
| `Ambulance` | `ambulances` + `ambulance_equipment` + `ambulance_maintenance_issues` | split |
| `AmbulanceTrip` | `ambulance_trips` + `ambulance_trip_status_log` | split |
| `LeaveDecision` | `leave_decisions` (immutable audit log) | 1:1 |
| `LoginLog` | `login_logs` | 1:1 (flatten subdocs) |

---

## profiles (base identity)

1:1 with `auth.users`. Every authenticated user has exactly one row.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | = `auth.users.id`, `ON DELETE CASCADE` |
| `role` | `user_role` enum | `student\|doctor\|hod\|admin\|parent\|dispensary_staff\|faculty` |
| `name` | `text` not null | |
| `email` | `text` not null unique | mirror of `auth.users.email` for joins |
| `phone` | `text` | |
| `photo_url` | `text` | Supabase Storage path |
| `is_active` | `boolean` default `true` | |
| `last_login_at` | `timestamptz` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Trigger:** `on auth.users insert → create profiles row` with `role='student'` default. Admin reassigns role in dashboard.

---

## students

Owns student-specific medical + academic data. `id` FK → `profiles.id`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK `profiles(id) on delete cascade` |
| `student_id` | `text` unique not null | e.g. `BIT2021001` |
| `roll_number` | `text` unique | |
| `dob` | `date` | |
| `gender` | `gender` enum | `male\|female\|other` |
| `department` | `text` not null | |
| `year` | `student_year` enum | `1st\|2nd\|3rd\|4th\|5th` |
| `section` | `text` | |
| `programme` | `programme` enum | `B.Tech\|M.Tech\|MCA\|MBA\|B.Pharm\|M.Pharm\|Ph.D` |
| `batch` | `text` | e.g. `2021-2025` |
| `hostel` | `text` | |
| `room_number` | `text` | |
| `blood_group` | `blood_group` enum | |
| `allergies` | `text[]` | |
| `current_medications` | `text[]` | |
| `chronic_conditions` | `text[]` | |
| `disabilities` | `text` default `''` | |
| `emergency_contact` | `jsonb` | `{name, phone, relation, email}` — read as blob |
| `qr_code` | `text` unique | |
| `is_currently_admitted` | `boolean` default `false` | |
| `insurance_id` | `text` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(department, year)`, `(hostel)`, `(blood_group)`.

**Note on `medicalHistory[]`:** extracted to its own table `medical_history` (`student_id` FK, `condition`, `diagnosis`, `date`, `doctor`, `notes`) — needed for HOD/doctor read queries that join with appointments.

**Note on `parentId`:** removed. Parent ↔ student is M:N via `parent_student_links`.

---

## faculty

Includes HODs and deans (distinguished by `role` on `profiles` + `hod_department` here).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK `profiles(id) on delete cascade` |
| `faculty_id` | `text` unique not null | e.g. `BIT-FAC-001` |
| `dob` | `date` | |
| `gender` | `gender` enum | |
| `department` | `text` not null | |
| `designation` | `designation` enum | `Professor\|Associate Professor\|...\|HOD\|Dean\|Registrar\|Director` |
| `specialization` | `text[]` | |
| `qualification` | `text[]` | |
| `joining_date` | `date` | |
| `employee_type` | `employee_type` enum | `permanent\|contractual\|visiting` |
| `cabin_number` | `text` | |
| `campus_address` | `text` | |
| `blood_group` | `blood_group` enum | |
| `allergies` | `text[]` | |
| `chronic_conditions` | `text[]` | |
| `emergency_contact` | `jsonb` | |
| `hod_department` | `text` | populated when `profiles.role = 'hod'` |
| `hod_since` | `date` | |
| `hod_permissions` | `jsonb` | `{can_approve_leave, can_view_medical_history, can_export_reports}` — defaults to all-true on insert |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(department)`, `(designation)`.

---

## parents

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK `profiles(id) on delete cascade` |
| `parent_id` | `text` unique not null | e.g. `PAR-2021-001` |
| `alternate_phone` | `text` | |
| `dob` | `date` | |
| `gender` | `gender` enum | |
| `occupation` | `text` | |
| `address` | `jsonb` | `{street, city, state, pincode, country}` |
| `relation_to_student` | `relation_to_student` enum not null | `father\|mother\|guardian\|uncle\|aunt\|sibling\|other` |
| `notifications` | `jsonb` | `{sms_enabled, email_enabled, emergency_alerts, appointment_updates, prescription_alerts}` defaults all-true |
| `is_verified` | `boolean` default `false` | |
| `verified_at` | `timestamptz` | |
| `verified_by` | `uuid` | FK `dispensary_staff(id)` nullable |
| `created_at`/`updated_at` | `timestamptz` | |

---

## parent_student_links

M:N. Replaces the embedded `Parent.students[]` array.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `parent_id` | `uuid` not null | FK `parents(id) on delete cascade` |
| `student_id` | `uuid` not null | FK `students(id) on delete cascade` |
| `relation` | `text` | per-link relation (`father`, `mother`, etc.) |
| `is_primary` | `boolean` default `true` | primary ward flag |
| `created_at` | `timestamptz` | |

**Unique:** `(parent_id, student_id)`.

---

## dispensary_staff

Includes medical officers (was `Doctor`), nurses, pharmacists, lab techs, admin staff, drivers, counsellors.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | FK `profiles(id) on delete cascade` |
| `staff_id` | `text` unique not null | e.g. `DISP-001` |
| `staff_type` | `staff_type` enum not null | `medical_officer\|nurse\|pharmacist\|lab_technician\|admin_staff\|ambulance_driver\|counsellor` |
| `designation` | `text` not null | e.g. `Chief Medical Officer` |
| `license_number` | `text` unique | nullable — only doctors/pharmacists |
| `qualification` | `text[]` | |
| `specialization` | `text` | |
| `experience` | `int` default `0` | years |
| `joining_date` | `date` | |
| `shift` | `staff_shift` enum default `morning` | `morning\|evening\|night\|rotating` |
| `shift_start` | `time` default `09:00` | |
| `shift_end` | `time` default `17:00` | |
| `is_on_duty` | `boolean` default `false` | |
| `total_consultations` | `int` default `0` | medical officers only |
| `current_queue_number` | `int` default `0` | |
| `max_patients_per_day` | `int` default `30` | |
| `average_consultation_time` | `int` default `15` | minutes |
| `rating` | `numeric(2,1)` default `0` | 0–5 |
| `blood_group` | `blood_group` enum | |
| `emergency_contact` | `jsonb` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(staff_type)`, `(is_on_duty)`.

**Note: merged from `Doctor` model.** `availability` per-day map → `staff_availability` table.

---

## staff_availability

Per-day availability for any `dispensary_staff` row. Replaces `Doctor.availability.{monday|...|sunday}.{isAvailable,startTime,endTime}` and `DispensaryStaff.availability.{day}` boolean map.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `staff_id` | `uuid` not null | FK `dispensary_staff(id) on delete cascade` |
| `day_of_week` | `day_of_week` enum not null | `monday\|...\|sunday` |
| `is_available` | `boolean` default `true` | |
| `start_time` | `time` default `09:00` | |
| `end_time` | `time` default `17:00` | |

**Unique:** `(staff_id, day_of_week)`.

---

## prescriptions

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `student_id` | `uuid` not null | FK `students(id) on delete restrict` (preserve medical history) |
| `doctor_id` | `uuid` | FK `dispensary_staff(id) on delete set null` |
| `doctor_name` | `text` not null | denormalized for durability |
| `date` | `date` not null | |
| `notes` | `text` default `''` | |
| `file_url` | `text` | Supabase Storage path |
| `status` | `prescription_status` enum default `pending` | `pending\|active\|completed\|expired\|cancelled` |
| `appointment_id` | `uuid` | FK `appointments(id) on delete set null` — optional link |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(student_id, created_at desc)`, `(doctor_id, created_at desc)`, `(status)`.

---

## prescription_medications

Replaces `Prescription.medications[]`.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `prescription_id` | `uuid` not null | FK `prescriptions(id) on delete cascade` |
| `name` | `text` not null | |
| `dosage` | `text` not null | |
| `frequency` | `text` not null | |
| `duration` | `text` not null | |
| `instructions` | `text` default `''` | |
| `position` | `int` not null default `0` | preserve array order |

---

## appointments

`leaveRequest` subdoc extracted to its own `leave_requests` table. Embedded `prescription` blob removed — use `prescriptions.appointment_id` FK instead (the dual representation in Mongo was a bug).

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `student_id` | `uuid` not null | FK `students(id) on delete restrict` |
| `doctor_id` | `uuid` not null | FK `dispensary_staff(id) on delete restrict` |
| `appointment_date` | `date` not null | |
| `appointment_time` | `time` not null | |
| `status` | `appointment_status` enum default `scheduled` | `scheduled\|confirmed\|in_progress\|completed\|cancelled\|no_show` |
| `symptoms` | `text` not null | |
| `priority` | `int` default `5` check (1..10) | |
| `queue_number` | `int` not null | |
| `estimated_wait_time` | `int` default `0` | minutes |
| `actual_wait_time` | `int` default `0` | minutes |
| `consultation_notes` | `text` default `''` | |
| `diagnosis` | `text` default `''` | |
| `treatment` | `text` default `''` | |
| `is_emergency` | `boolean` default `false` | |
| `emergency_reason` | `text` default `''` | |
| `check_in_time` | `timestamptz` | |
| `check_out_time` | `timestamptz` | |
| `follow_up_required` | `boolean` default `false` | |
| `follow_up_date` | `date` | |
| `feedback_rating` | `int` check (1..5) | |
| `feedback_comments` | `text` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(student_id, appointment_date)`, `(doctor_id, appointment_date)`, `(status, appointment_date)`, `(priority desc, appointment_date)`.

---

## leave_requests

Extracted from `Appointment.leaveRequest`. One row per leave application, FK back to appointment.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `appointment_id` | `uuid` not null unique | FK `appointments(id) on delete cascade` |
| `student_id` | `uuid` not null | FK `students(id) on delete restrict` (denormalized for fast dept-scoped queries) |
| `duration_days` | `int` not null | |
| `reason` | `text` not null | |
| `status` | `leave_request_status` enum default `pending` | `pending\|approved\|rejected` |
| `decided_by` | `uuid` | FK `faculty(id) on delete set null` |
| `decided_by_name` | `text` | denormalized |
| `decided_at` | `timestamptz` | |
| `decision_role` | `text` | `hod\|admin` |
| `decision_comments` | `text` default `''` | |
| `hod_reviewed_at` | `timestamptz` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(student_id, status)`, `(status, created_at desc)`.

---

## leave_decisions (immutable audit)

Append-only — RLS denies UPDATE/DELETE on this table to all roles.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `leave_request_id` | `uuid` not null | FK `leave_requests(id) on delete restrict` |
| `student_id` | `uuid` not null | not FK — denormalized to survive student deletion |
| `student_name` | `text` not null | |
| `student_department` | `text` not null | |
| `decider_id` | `uuid` not null | not FK — survives decider deletion |
| `decider_name` | `text` not null | |
| `decider_role` | `text` not null | `hod\|admin` |
| `action` | `leave_decision_action` enum not null | `approved\|rejected` |
| `comments` | `text` default `''` | |
| `decided_at` | `timestamptz` not null default `now()` | |
| `leave_snapshot` | `jsonb` not null | `{duration, reason, status}` at decision time |
| `ip_address` | `text` default `''` | |
| `user_agent` | `text` default `''` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(student_department, decided_at desc)`, `(leave_request_id, decided_at desc)`.

---

## inventory_items

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` not null | |
| `category` | `inventory_category` enum not null | `medication\|supplies\|equipment\|consumables` |
| `description` | `text` default `''` | |
| `current_stock` | `int` not null check (>= 0) | |
| `minimum_stock` | `int` not null check (>= 0) | |
| `maximum_stock` | `int` not null check (>= 0) | |
| `unit_price` | `numeric(10,2)` default `0` check (>= 0) | |
| `supplier` | `text` default `''` | |
| `expiry_date` | `date` | |
| `batch_number` | `text` default `''` | |
| `added_by` | `uuid` not null | FK `profiles(id) on delete restrict` |
| `updated_by` | `uuid` | FK `profiles(id) on delete set null` |
| `is_active` | `boolean` default `true` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(name)`, `(category)`, `(current_stock)`, `(expiry_date)`.

**Computed (in app, not DB):** `stock_status`, `stock_percentage`. Could be Postgres VIEW later.

---

## ambulances

`currentAssignment` removed — derive from latest active row in `ambulance_trips`. `equipment[]` and `maintenance.issues[]` extracted to child tables.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `vehicle_number` | `text` unique not null | |
| `driver_name` | `text` not null | |
| `driver_phone` | `text` not null | |
| `driver_license` | `text` unique not null | |
| `capacity` | `int` not null check (1..4) | |
| `status` | `ambulance_status` enum default `available` | `available\|in_use\|maintenance\|out_of_service` |
| `latitude` | `numeric(9,6)` not null | |
| `longitude` | `numeric(9,6)` not null | |
| `address` | `text` not null | |
| `last_service_at` | `timestamptz` default `now()` | |
| `next_service_at` | `timestamptz` not null | |
| `mileage` | `int` default `0` | |
| `total_trips` | `int` default `0` | |
| `average_response_time` | `int` default `0` | minutes |
| `rating` | `numeric(2,1)` default `0` | 0–5 (computed from total/count) |
| `total_rating` | `int` default `0` | |
| `rating_count` | `int` default `0` | |
| `is_active` | `boolean` default `true` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(status)`, geo index on `(latitude, longitude)` — if PostGIS is enabled add a `location geography(POINT)` column with GIST index for `<nearest available>` queries.

---

## ambulance_equipment

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `ambulance_id` | `uuid` not null | FK `ambulances(id) on delete cascade` |
| `name` | `text` not null | |
| `status` | `equipment_status` enum default `available` | `available\|in_use\|maintenance` |
| `last_checked_at` | `timestamptz` default `now()` | |

---

## ambulance_maintenance_issues

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `ambulance_id` | `uuid` not null | FK `ambulances(id) on delete cascade` |
| `description` | `text` not null | |
| `severity` | `issue_severity` enum default `low` | `low\|medium\|high\|critical` |
| `reported_at` | `timestamptz` default `now()` | |
| `resolved` | `boolean` default `false` | |
| `resolved_at` | `timestamptz` | |

---

## ambulance_trips

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `patient_name` | `text` not null | |
| `patient_phone` | `text` not null | |
| `student_id` | `uuid` | FK `students(id) on delete set null` (nullable — non-student patients) |
| `pickup_location` | `text` not null | |
| `destination` | `text` not null | |
| `emergency_type` | `emergency_type` enum default `medical` | `medical\|accident\|cardiac\|respiratory\|trauma\|other` |
| `priority` | `trip_priority` enum default `medium` | `high\|medium\|low` |
| `ambulance_id` | `uuid` not null | FK `ambulances(id) on delete restrict` |
| `driver_id` | `uuid` | FK `profiles(id) on delete set null` (driver = `dispensary_staff` with `staff_type='ambulance_driver'`) |
| `status` | `ambulance_trip_status` enum default `pending` | `pending\|dispatched\|en_route\|arrived\|completed\|cancelled` |
| `current_latitude` | `numeric(9,6)` | |
| `current_longitude` | `numeric(9,6)` | |
| `current_address` | `text` default `''` | |
| `estimated_time` | `int` | minutes |
| `actual_duration` | `int` | minutes |
| `notes` | `text` default `''` | |
| `completion_notes` | `text` default `''` | |
| `created_by` | `uuid` not null | FK `profiles(id) on delete restrict` |
| `completed_at` | `timestamptz` | |
| `created_at`/`updated_at` | `timestamptz` | |

**Indexes:** `(status)`, `(priority)`, `(ambulance_id)`, `(created_at desc)`, `(completed_at desc)`.

---

## ambulance_trip_status_log

Replaces `AmbulanceTrip.statusHistory[]`. Realtime feed source.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `trip_id` | `uuid` not null | FK `ambulance_trips(id) on delete cascade` |
| `status` | `ambulance_trip_status` enum not null | |
| `latitude` | `numeric(9,6)` | |
| `longitude` | `numeric(9,6)` | |
| `address` | `text` | |
| `updated_by` | `uuid` | FK `profiles(id) on delete set null` |
| `created_at` | `timestamptz` default `now()` | |

---

## login_logs

`location` and `device` subdocs flattened to columns.

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `user_id` | `uuid` | FK `profiles(id) on delete set null` (null = failed login before user identified) |
| `email` | `text` not null | |
| `action` | `login_action` enum not null | `login\|logout\|register\|password_reset\|password_change\|otp_request\|otp_verify\|profile_update\|account_lock\|account_unlock` |
| `ip_address` | `inet` not null | |
| `user_agent` | `text` not null | |
| `status` | `login_status` enum not null | `success\|failed\|pending` |
| `reason` | `text` | |
| `location_country` | `text` | |
| `location_region` | `text` | |
| `location_city` | `text` | |
| `location_timezone` | `text` | |
| `device_type` | `text` | mobile/desktop/tablet |
| `device_browser` | `text` | |
| `device_os` | `text` | |
| `session_id` | `text` | |
| `additional_data` | `jsonb` default `'{}'` | |
| `created_at` | `timestamptz` default `now()` | |

**Indexes:** `(user_id, created_at desc)`, `(email, created_at desc)`, `(ip_address, created_at desc)`, `(action, created_at desc)`, `(status, created_at desc)`, `(created_at desc)`.

---

## Dropped tables / models

- **`OTP`** — Supabase Auth `signInWithOtp` + `verifyOtp` replaces it entirely. Email-only OTP today maps 1:1.
- **`Appointment.prescription` embedded subdoc** — replaced by FK from `prescriptions.appointment_id`. ETL: for each appointment with embedded prescription, create a `prescriptions` row pointing back.
- **`Ambulance.currentAssignment` subdoc** — derived from `select * from ambulance_trips where ambulance_id = ? and status not in ('completed', 'cancelled') order by created_at desc limit 1`.

## ETL notes (Phase 8 preview)

- **Order of inserts:** `auth.users` → `profiles` → role tables (`students`, `faculty`, `parents`, `dispensary_staff`) → linkages (`parent_student_links`, `staff_availability`) → clinical (`appointments`, `prescriptions` + medications) → leave (`leave_requests`, `leave_decisions`) → ops (`ambulances` + children, `ambulance_trips` + log) → `inventory_items` → `login_logs`.
- **User → student consolidation:** Mongo `User` docs with `role='student'` become rows in both `profiles` and `students`. Mongo `User` docs with `role='admin'` become `profiles` only with `role='admin'`.
- **Doctor → dispensary_staff merge:** each Mongo `Doctor` doc becomes a `dispensary_staff` row with `staff_type='medical_officer'` + 7 `staff_availability` rows (one per day).
- **Appointment.leaveRequest extraction:** for every appointment with `leaveRequest.requested=true`, create a `leave_requests` row.

## Open questions (resolve in 1.2 / 1.3)

1. PostGIS for ambulance nearest-neighbor? — adds ~5MB to free tier, but `find nearest available` is currently a Mongo `$near` query. Probably yes.
2. Keep `qr_code` on `students` or compute on-the-fly? — current model stores serialized JSON; safer to keep stored.
3. `medical_history` as own table or `jsonb` on `students`? — own table wins for query-ability (HOD reports by condition).
