# Enums & Foreign Keys Reference

> Phase 1.2 deliverable. Consolidates every Postgres enum and every FK relation (with `ON DELETE` rationale) used in the init schema. The migration SQL that creates these lives in Phase 1.3 (`supabase/migrations/`); this file is the design reference.

## Enums

### `user_role`
Top-level role on `profiles`. Drives RLS policies.

```
'student' | 'doctor' | 'hod' | 'admin' | 'parent' | 'dispensary_staff' | 'faculty'
```

**Notes:**
- `doctor` = legacy alias for `dispensary_staff` with `staff_type='medical_officer'`. Kept as a top-level role so existing client checks (`if role === 'doctor'`) keep working without remap.
- `hod` is a subset of `faculty`. ETL: faculty rows with `designation='HOD'` get `profiles.role='hod'` and `faculty.hod_department` set.

### `gender`
```
'male' | 'female' | 'other'
```
Used on `students`, `faculty`, `parents`, `dispensary_staff`.

### `blood_group`
```
'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
```
Used on `students`, `faculty`, `dispensary_staff`.

### `student_year`
```
'1st' | '2nd' | '3rd' | '4th' | '5th'
```
Used on `students.year`.

### `programme`
```
'B.Tech' | 'M.Tech' | 'MCA' | 'MBA' | 'B.Pharm' | 'M.Pharm' | 'Ph.D'
```
Used on `students.programme`.

### `designation`
Faculty designation.
```
'Professor' | 'Associate Professor' | 'Assistant Professor' | 'Lecturer' |
'HOD' | 'Dean' | 'Registrar' | 'Director'
```

### `employee_type`
```
'permanent' | 'contractual' | 'visiting'
```
Used on `faculty.employee_type`.

### `relation_to_student`
```
'father' | 'mother' | 'guardian' | 'uncle' | 'aunt' | 'sibling' | 'other'
```
Used on `parents.relation_to_student`.

### `staff_type`
```
'medical_officer' | 'nurse' | 'pharmacist' | 'lab_technician' |
'admin_staff' | 'ambulance_driver' | 'counsellor'
```
Used on `dispensary_staff.staff_type`.

### `staff_shift`
```
'morning' | 'evening' | 'night' | 'rotating'
```

### `day_of_week`
```
'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
```
Used on `staff_availability.day_of_week`.

### `prescription_status`
```
'pending' | 'active' | 'completed' | 'expired' | 'cancelled'
```

### `appointment_status`
```
'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
```
**Note:** Mongo used `'in-progress'` and `'no-show'` (kebab). Postgres convention: snake_case. ETL maps the dashes to underscores.

### `leave_request_status`
```
'pending' | 'approved' | 'rejected'
```

### `leave_decision_action`
Immutable audit. Append-only.
```
'approved' | 'rejected'
```

### `inventory_category`
```
'medication' | 'supplies' | 'equipment' | 'consumables'
```

### `ambulance_status`
```
'available' | 'in_use' | 'maintenance' | 'out_of_service'
```
**Note:** Mongo `'in-use'` → Postgres `'in_use'`.

### `equipment_status`
```
'available' | 'in_use' | 'maintenance'
```

### `issue_severity`
```
'low' | 'medium' | 'high' | 'critical'
```

### `emergency_type`
```
'medical' | 'accident' | 'cardiac' | 'respiratory' | 'trauma' | 'other'
```

### `trip_priority`
```
'high' | 'medium' | 'low'
```

### `ambulance_trip_status`
```
'pending' | 'dispatched' | 'en_route' | 'arrived' | 'completed' | 'cancelled'
```

### `login_action`
```
'login' | 'logout' | 'register' | 'password_reset' | 'password_change' |
'otp_request' | 'otp_verify' | 'profile_update' | 'account_lock' | 'account_unlock'
```

### `login_status`
```
'success' | 'failed' | 'pending'
```

---

## Foreign keys & `ON DELETE` matrix

Rationale per FK below. Three policies in use:

- **`CASCADE`** — child cannot exist without parent; deleting parent removes child.
- **`SET NULL`** — child survives, link goes to null (column must be nullable).
- **`RESTRICT`** — block parent deletion if children exist; used when child records are clinical/audit data that must not be silently orphaned.

| Table | Column | References | ON DELETE | Why |
|---|---|---|---|---|
| `profiles` | `id` | `auth.users(id)` | `CASCADE` | Profile cannot exist without auth user. Standard Supabase pattern. |
| `students` | `id` | `profiles(id)` | `CASCADE` | Same — student row dies with profile. |
| `faculty` | `id` | `profiles(id)` | `CASCADE` | Same. |
| `parents` | `id` | `profiles(id)` | `CASCADE` | Same. |
| `parents` | `verified_by` | `dispensary_staff(id)` | `SET NULL` | Verification record survives staff turnover. |
| `dispensary_staff` | `id` | `profiles(id)` | `CASCADE` | Same. |
| `parent_student_links` | `parent_id` | `parents(id)` | `CASCADE` | Link is meaningless without parent. |
| `parent_student_links` | `student_id` | `students(id)` | `CASCADE` | Link is meaningless without student. |
| `staff_availability` | `staff_id` | `dispensary_staff(id)` | `CASCADE` | Availability rows belong to staff. |
| `medical_history` | `student_id` | `students(id)` | `CASCADE` | History dies with student record (audit trail in `leave_decisions` and `login_logs` separately). |
| `prescriptions` | `student_id` | `students(id)` | `RESTRICT` | Clinical record — block accidental student deletion. Anonymize via separate process if ever required. |
| `prescriptions` | `doctor_id` | `dispensary_staff(id)` | `SET NULL` | Prescription survives if doctor leaves. Name preserved in `doctor_name` column (denormalized). |
| `prescriptions` | `appointment_id` | `appointments(id)` | `SET NULL` | Prescription can outlive the appointment that created it. |
| `prescription_medications` | `prescription_id` | `prescriptions(id)` | `CASCADE` | Meds are part of the prescription. |
| `appointments` | `student_id` | `students(id)` | `RESTRICT` | Clinical record — same reason as `prescriptions`. |
| `appointments` | `doctor_id` | `dispensary_staff(id)` | `RESTRICT` | Block doctor deletion while appointments exist; reassign or cancel first. |
| `leave_requests` | `appointment_id` | `appointments(id)` | `CASCADE` | Request belongs to the appointment that triggered it. |
| `leave_requests` | `student_id` | `students(id)` | `RESTRICT` | Block deletion — audit. |
| `leave_requests` | `decided_by` | `faculty(id)` | `SET NULL` | Decider record survives faculty turnover (also denormalized in `decided_by_name`). |
| `leave_decisions` | `leave_request_id` | `leave_requests(id)` | `RESTRICT` | Immutable audit — never lose. |
| `leave_decisions` | `student_id` | (denormalized) | *no FK* | Stored as uuid but not FK'd — survives student deletion. |
| `leave_decisions` | `decider_id` | (denormalized) | *no FK* | Same. |
| `inventory_items` | `added_by` | `profiles(id)` | `RESTRICT` | Block deletion of staff while their inventory rows exist; reassign first. |
| `inventory_items` | `updated_by` | `profiles(id)` | `SET NULL` | Only the most recent updater; safe to null. |
| `ambulance_equipment` | `ambulance_id` | `ambulances(id)` | `CASCADE` | Equipment list is part of the ambulance. |
| `ambulance_maintenance_issues` | `ambulance_id` | `ambulances(id)` | `CASCADE` | Same. |
| `ambulance_trips` | `student_id` | `students(id)` | `SET NULL` | Trip survives student deletion; patient name kept in `patient_name`. |
| `ambulance_trips` | `ambulance_id` | `ambulances(id)` | `RESTRICT` | Block ambulance deletion while trips exist (history matters). |
| `ambulance_trips` | `driver_id` | `profiles(id)` | `SET NULL` | Same as doctor — driver may leave. |
| `ambulance_trips` | `created_by` | `profiles(id)` | `RESTRICT` | Audit — block dispatcher deletion. |
| `ambulance_trip_status_log` | `trip_id` | `ambulance_trips(id)` | `CASCADE` | Status entries belong to the trip. |
| `ambulance_trip_status_log` | `updated_by` | `profiles(id)` | `SET NULL` | Updater may leave. |
| `login_logs` | `user_id` | `profiles(id)` | `SET NULL` | Log survives user deletion (anonymized). Email column preserves identification. |

### Notable patterns

- **Profile chain (`auth.users → profiles → role tables`) uses `CASCADE` end-to-end.** Deleting an auth user removes everything cleanly.
- **All clinical FKs (`appointments`, `prescriptions`, `leave_requests`) use `RESTRICT` on the student side.** Medical history is not silently destroyed.
- **All "actor" FKs (`doctor_id`, `driver_id`, `decided_by`, `updated_by`) use `SET NULL` with a denormalized name column.** Survives staff turnover, preserves who-did-what at the time.
- **Audit tables (`leave_decisions`, `login_logs`) deliberately denormalize identifiers** rather than FK'ing — so audit records can outlive the people they reference.

---

## Extensions required

- `pgcrypto` — for `gen_random_uuid()` (or use Postgres 13+ built-in `gen_random_uuid()` from `pg_strom`/core).
- `citext` — case-insensitive email comparisons (`profiles.email`).

Optional, deferred to Phase 1.3 decision:
- `postgis` — only if we want geo-based nearest-ambulance queries. Costs ~5MB. Currently `ambulances.latitude/longitude` are plain `numeric`; nearest-neighbor can be done in app or with a manual haversine SQL function. **Default: skip PostGIS for free tier.**

---

## Common table prelude

Every business table gets:

```sql
created_at  timestamptz not null default now()
updated_at  timestamptz not null default now()
```

And a trigger:

```sql
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- per table:
create trigger trg_<table>_set_updated_at
before update on public.<table>
for each row execute function public.set_updated_at();
```

Audit tables (`leave_decisions`, `login_logs`) get `created_at` only — no `updated_at` since they're append-only.
