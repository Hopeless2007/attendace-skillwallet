# Multimodal Attendance & Engagement Agent

A production-grade, privacy-first web application designed for educational institutions, coaching institutes, university classrooms, and professional training environments.

Traditional attendance systems record only whether a learner was present. This application combines **verified roster attendance**, **aggregate computer vision**, **audio signal processing**, **classroom activity analysis**, and **AI-assisted pedagogical suggestions** to provide instructors with comprehensive classroom intelligence while strictly protecting student privacy.

---

## 1. System Architecture & Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, and JavaScript (ES6+ modular architecture).
- **Backend & Database:** Supabase PostgreSQL with Row Level Security (RLS) on all tables.
- **Realtime Synchronization:** Supabase Realtime (`postgres_changes` on core tables).
- **Offline Persistence:** IndexedDB with multi-store transactional storage.
- **Offline Sync Manager:** Durable priority sync queue with deferred cloud synchronization, conflict resolution, and idempotency.
- **Offline Application Shell:** Service Worker (`sw.js`) and PWA-compatible architecture (`manifest.json`).
- **Computer Vision:** In-browser canvas processing (optical frame differencing & spatial silhouette clustering).
- **Audio Signal Processing:** Web Audio API (`AudioContext`, `AnalyserNode`, RMS energy, speech presence vs relative silence).
- **Pedagogical Recommendation Engine:** Deterministic rule-based JavaScript engine (`v1.0-deterministic-pedagogical-engine`) running 100% offline.
- **Reporting & Exports:** Native Canvas time-series charts, printable summary views, and CSV roster exports.

---

## 2. Main Application Modules

The application provides a modern, responsive navigation interface with 10 dedicated functional modules:

1. **Dashboard:** Institutional overview cards (Total Students, Active Classes, Sessions Conducted, Verified Present vs Absent), recent sessions table, and pending pedagogical alert badges.
2. **Classes:** Cohort management, course objectives, active/inactive status, and student enrollment roster directories.
3. **Students:** Student directory with institutional student IDs, enrollment histories, search/filtering, and comprehensive attendance audit records.
4. **Sessions:** Session planning and lifecycle orchestration (`planned` → `active` → `paused` → `completed`), planned vs actual timestamps, and automatic roster initialization.
5. **Attendance:** Multi-mode check-in verification:
   - Dynamic session-specific QR code generator with 6-digit PIN.
   - Student ID check-in token modal.
   - 1-click instructor quick-verification (`Present`, `Late`, `Absent`, `Excused`).
   - Authorized manual correction modal with mandatory justification, recorded in `audit_events`.
   - Real-time comparison between verified roster count and camera-estimated occupancy.
6. **Live Classroom Monitor:** Real-time HUD displaying camera status, microphone status, pipeline health, sync status, privacy overlay canvas, live audio spectrum visualizer, dB meter, and quick activity tagging (`Lecture`, `Discussion`, `Group Work`, `Solo Quiz`, `Q&A`).
7. **Engagement Analytics:** Session-level time-series canvas charts for aggregate occupancy, spatial movement intensity, speech presence vs relative silence ratios, and instructor annotation timeline.
8. **AI Teaching Suggestions:** Actionable pedagogical recommendations with structured supporting evidence, rule versions, acceptance/dismissal actions, and instructor reflection notes.
9. **Session Reports:** Official printable classroom report sheets, attendance summary breakdowns, and one-click CSV data export.
10. **Settings & Privacy:** Privacy guardrail certifications, sensor sampling frequency, aggregation window duration (1m vs 5m), offline queue inspector, and local cache pruning tools.

---

## 3. Strict Institutional Privacy & Ethics Guardrails

This project strictly adheres to educational privacy and ethical standards:

- **No Facial Recognition:** No faces are identified, no facial landmarks are computed, and no individual biometric embeddings are generated.
- **No Individual Student Tracking from Sensors:** Aggregate computer vision measures spatial luminance variance and coarse motion across an 8x6 grid to calculate an approximate room headcount (labeled as an estimate). Measurements are never mapped to named students.
- **Ephemeral In-Memory Frame Processing:** Video frames and audio buffers are processed in memory and immediately discarded. Raw video and audio recordings are never saved to IndexedDB or transmitted to external servers.
- **No Speech Transcription or Voiceprinting:** The Web Audio API calculates non-semantic acoustic energy (RMS volume, speech presence intervals, silence ratios). Verbal speech is never transcribed or monitored for semantics.
- **Separation of Verified Attendance from Sensor Observations:** Individual attendance is earned strictly through verified check-ins (QR scan, PIN code, or instructor confirmation). Camera occupancy is treated purely as an aggregate discrepancy check.

---

## 4. Supabase Database Schema

The application is connected to the remote Supabase project (`https://ftykuvzmuqbslziwqnir.supabase.co`). Migrations were applied via the Supabase MCP integration:

| Table | Purpose | RLS Status | Realtime Enabled |
|---|---|---|---|
| `public.classes` | Cohorts and course metadata | Enabled | Yes |
| `public.students` | Institutional student records | Enabled | Yes |
| `public.class_enrollments` | Student-to-class enrollments (unique per class/student) | Enabled | Yes |
| `public.sessions` | Classroom sessions with planned and actual timestamps | Enabled | Yes |
| `public.attendance_records` | Verified attendance statuses (`present`, `absent`, `late`, `excused`, `unconfirmed`) | Enabled | Yes |
| `public.session_analytics` | 60-second aggregate windows (estimated occupancy, motion, audio activity, coverage) | Enabled | Yes |
| `public.session_annotations` | Real-time instructor activity tags and context notes | Enabled | Yes |
| `public.teaching_suggestions` | Pedagogical recommendations with supporting evidence and review statuses | Enabled | Yes |
| `public.audit_events` | Immutable audit trail for authorized attendance corrections | Enabled | No |

---

## 5. Offline-First Synchronization Architecture

The application implements a local-first design with deferred cloud synchronization:

1. **Local Write First:** Every user action (class creation, student registration, attendance check-in, sensor window) is immediately committed to IndexedDB.
2. **Connection Status Tracking:** Real-time synchronization pill in the top header accurately reflects the state:
   - `Synced`: All changes confirmed by Supabase.
   - `Saving...`: Operation currently being transmitted.
   - `Offline — Changes Queued`: Network disconnected; operations held in durable IndexedDB queue.
   - `Sync Error`: Actionable error message preserved in queue without data loss.
3. **Reconnection & Replay:** When connectivity returns, the `SyncManager` replays operations in dependency order (`classes` → `students` → `enrollments` → `sessions` → `attendance` → `analytics` → `suggestions`), uses stable UUIDs for idempotency, and reconciles changes from Supabase Realtime.
4. **Service Worker:** Caches application shell assets (`index.html`, CSS, JS, offline libraries) using a stale-while-revalidate strategy, enabling cold offline loads.

---

## 6. How to Run Locally

### Prerequisites
- Node.js (v18+)

### Starting the Application
```bash
# Start the local development server
node server.js
```
The server will start at:
`http://localhost:3000/`

Open `http://localhost:3000/` in any modern web browser (Chrome, Edge, Firefox, Safari).

### Running Automated Test Suite
```bash
node test_suite.js
```
All 27 module tests, deterministic pedagogical rules, and asset delivery endpoints will run and output verification results.

---

## 7. Verification & Acceptance Results

- **Files & Assets:** 27 files created and verified.
- **Database Schema:** 9 PostgreSQL tables with RLS and Realtime publications active on Supabase.
- **Rule Engine Validation:** Verified that `PASSIVE_LISTENING_INTERVENTION`, `LOW_DISCUSSION_PARTICIPATION`, and `SENSOR_COVERAGE_CHECK` fire accurately on simulated sensor metrics.
- **Attendance Workflows:** Tested class creation, student registration, roster enrollment, QR code generation, PIN check-in, 1-click teacher verification, and audit event logging.
- **Live Classroom Monitor:** Tested non-identifying video differencing HUD, audio spectrum visualizer, dB meter, and 60-second window aggregation.
- **Exports:** Tested CSV export generation and print/PDF report styling.
