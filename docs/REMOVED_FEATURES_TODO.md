# DormDoc: Removed Feature Scaffolding — Recovery Guide

> This document tracks code that was removed during the CI lint cleanup (May 2025).
> Everything below was **defined but never called/rendered** in the original codebase.
> All code is preserved in git history and can be recovered with the commands shown.

---

## Priority 1: Likely Planned Features (Functions & Mutations)

### 1. QR Code Decode Handler — `QRScanner.js`

**What it was:** A function to parse scanned QR data, populate student details, and open a confirmation dialog.

**Why removed:** Defined but never wired to any scanner callback or UI event.

**Impact:** The QR scanner page currently has camera start/stop and manual confirm,
but no automatic decode-on-scan flow. This function was the missing link.

**Recovery:**
```bash
git log -p --all -S "handleQRCodeDetected" -- src/client/src/pages/Admin/QRScanner.js
```

**TODO:** Wire this function to the camera/scanner's `onResult` or `onScan` callback
when implementing real-time QR decode. You'll also need to re-import it and
connect it to the `react-qr-scanner` component's result handler.

---

### 2. Ambulance Assignment Flow — `AmbulanceManagement.js`

**What was removed:**
- `assignAmbulanceMutation` — POST to `/api/admin/ambulance-queue/:id/assign`
- `handleAssignAmbulance(queueId, ambulanceId, driverId)` — handler calling the mutation

**Why removed:** Both defined but never called from any button or UI element.

**Impact:** The ambulance management page can update status and queue, but cannot
assign a specific ambulance + driver to a queue item.

**Recovery:**
```bash
git log -p --all -S "assignAmbulanceMutation" -- src/client/src/pages/Admin/AmbulanceManagement.js
git log -p --all -S "handleAssignAmbulance" -- src/client/src/pages/Admin/AmbulanceManagement.js
```

**TODO:** Add an "Assign Ambulance" button in the queue item row/card that opens
a dialog to select ambulance + driver, then calls `handleAssignAmbulance`.

---

## Priority 2: Unused State Variables (UI Scaffolding)

These state variables were declared but never read in JSX. They suggest planned but
unbuilt UI features.

| File | Removed State | Likely Intended Purpose |
|------|--------------|------------------------|
| `AmbulanceManagement.js` | `queueData`, `ambulanceData` | Local state for queue/ambulance arrays (superseded by react-query) |
| `AdminPrescriptionManagement.js` | `openDialog`, `setOpenDialog` | Dialog for adding/editing prescriptions |
| `PrescriptionManagement.js` | `openDialog`, `setOpenDialog` | Dialog for student prescription actions |
| `LoginInfo.js` | `activeTab`, `dateRange` | Tab navigation + date range filter for login history |
| `LoginInfo.js` | `recentLogins` (query data) | Display recent login attempts section |
| `BookAppointment.js` | `availableSlots` | Time slot picker for appointment booking |
| `PatientChat.js` | `activeTab`, `filterStatus` | Chat tabs + message filtering |
| `PatientChat.js` | `isTyping`, `typingUsers` | Real-time typing indicators |
| `DoctorDashboard.js` | `selectedPatient` | Patient detail view in doctor dashboard |
| `ForgotPassword.js` | `otpSent`, `otpVerified` | Step validation flags (setters still active) |
| `AuthContext.js` | `loading` | Auth loading state (setter still active) |

**Recovery (any of them):**
```bash
git diff HEAD -- src/client/src/path/to/file.js
# Shows exactly what was removed — copy back what you need
```

---

## Priority 3: Unused Query Destructured Properties

These query return values were fetched but the specific aliases were never consumed.
The queries themselves still fire (for caching), only the unused aliases were removed.

| File | Removed Alias | Query Key |
|------|--------------|-----------|
| `AmbulanceManagement.js` | `drivers`, `driversLoading`, `students`, `studentsLoading` | `'drivers'`, `'students'` |
| `AmbulanceTracking.js` | `drivers` | `'drivers'` |
| `AdminPrescriptionManagement.js` | `students` | `'students'` |
| `Analytics.js` | `refetch` | `'analytics'` |
| `DoctorDashboard.js` | `patientsLoading`, `patientsListLoading`, `ambulances`, `ambulancesLoading` | Various doctor queries |
| `PatientChat.js` | `refetchPatients`, `refetchMessages`, `onlineLoading` | Chat queries |
| `LeaveApplication.js` | `prescriptionsLoading`, `user` | `'user-prescriptions'` |
| `QRScanner.js` | `students`, `studentsLoading` | `'students'` |

**These are trivially recoverable** — just add the alias back to the destructuring
when you build the UI that consumes them.

---

## Priority 4: Removed MUI Component/Icon Imports

Over 300 MUI component and icon imports were removed. These are **not tracked individually**
because they're trivially re-importable (`import { IconName } from '@mui/icons-material'`).

Key categories of removed icons that suggest planned UI features:
- **Stepper components** (`Stepper`, `Step`, `StepLabel`, `StepContent`) — Multi-step workflows
- **Badge, LinearProgress** — Activity indicators
- **FilterList, DateRange, PieChart** — Advanced filtering and analytics charts
- **FileUpload, AttachFile** — File attachment UI
- **VideoCall, Mic** — Video/audio call UI elements in PatientChat

---

## How to Recover Any Removed Code

```bash
# Option 1: See the full diff of what was removed from a specific file
git diff HEAD -- src/client/src/path/to/file.js

# Option 2: Search git history for a specific function/variable name
git log -p --all -S "functionName" -- src/client/src/path/to/file.js

# Option 3: Restore the original version of any file
git checkout HEAD -- src/client/src/path/to/file.js
# (then manually re-apply only the lint fixes you want to keep)
```

---

## Prevention Going Forward

When implementing these features:
1. Write the UI that **uses** the function/state/import at the same time
2. The pre-commit hook (`husky` + `lint-staged`) will block commits with unused code
3. If you need to scaffold code for later, create a GitHub Issue instead of dead code
