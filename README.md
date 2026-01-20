# MindStorm Monorepo

MindStorm is a patient + clinician mental health journal platform that turns free-text entries into structured evidence signals. The same evidence powers both views: the clinician portal shows criteria coverage, while the patient portal shows experience language.

## Structure
- `apps/web` — Vite React app (patient + clinician UI)
- `backend` — Node/Express API
- `packages/criteria-graph` — DSM-5 logic graph + patient view mapping
- `packages/signal-schema` — shared signal/EvidenceUnit schema

## Core Concepts
- **EvidenceUnits**: Structured signals extracted from journal text (labels + attributes). These drive all downstream views.
- **Same signals, different semantics**: Patient UI uses `depressive_disorders_patient_view.json` to translate clinical labels into patient-friendly language.
- **Criteria Coverage, not diagnosis**: Clinician UI shows coverage + gates, not a diagnosis decision.

Key files:
- `packages/criteria-graph/criteria_specs/v1/depressive_disorders.json`
- `packages/criteria-graph/criteria_specs/v1/depressive_disorders_patient_view.json`

## Architecture (Data Flow)
1) Journal entry saved → stored as raw text + metadata.  
2) Evidence extraction generates `evidenceUnits` (labels + attributes).  
3) Patient UI renders translated “experience” language from evidenceUnits.  
4) Clinician UI renders criteria coverage, gates, and logic graphs from the same evidence.  

## Setup
```bash
npm install
```

## Environment
Copy the backend example file and set values:
```bash
cp backend/.env.example backend/.env
```

Required (backend):
- `MONGODB_URI`
- `JWT_SECRET`

Optional LLM (backend):
- `OPENAI_API_KEY`
- `OPENAI_API_URL` (local or hosted)
- `OPENAI_MODEL`
- `LLM_DISABLE_JSON_RESPONSE_FORMAT` (set when using non-JSON LLMs)

## Dev
```bash
npm run dev         # both web + backend
npm run dev:web     # web only
npm run dev:backend # backend only
```

## Routes
- `/` — landing
- `/login` — auth
- `/portal` — choose patient/clinician
- `/patient/*` — patient app
- `/clinician/*` — clinician app (decision-support wording)

## Evidence + Derived Data
Evidence units are stored per entry and used to rebuild derived signals.

## Quick Start Demo
This creates a deterministic demo user with evidence units and a visible trajectory.

1) Seed entries
```bash
node backend/scripts/seed-sample-entries.js <userId> MDD_SEVERE_MELANCHOLIC \
  --count 150 \
  --trajectory "MDD_SEVERE_MELANCHOLIC:30,MDD_MODERATE_ANXIOUS:14,MDD_PARTIAL_REMISSION:65"
```

2) Rebuild derived data
```bash
node backend/scripts/rebuild-derived.js --user <userId> --only-missing
```

3) View in app
- Patient view: `/patient/journal`
- Clinician view: `/clinician/cases/<userId>`

### Seeded Profiles
The seed script supports profile keys defined in `backend/scripts/seed-sample-entries.js`.
Common examples:
- `MDD_SEVERE_MELANCHOLIC`
- `MDD_MODERATE_ANXIOUS`
- `MDD_PARTIAL_REMISSION`
- `MDD_SEVERE_WITH_RISK`

You can mix profiles using `--trajectory`, or seed a single profile across a date window.

### Seeding Options
```bash
--count N                  # Fill the most recent missing days up to N entries
--start YYYY-MM-DD         # Start of date window
--end YYYY-MM-DD           # End of date window (inclusive)
--trajectory "P:days,..."  # Profile phases (days per phase)
--skip 0.2                 # Skip probability for missing days (default 0.2)
```

Notes:
- If `--count` is used, the script fills the most recent missing days first.
- If `--start/--end` are used, the script fills any missing days within the window.
- Trajectory phases are strict day counts; if the timeline is longer, the last phase repeats.

### Seed data (deterministic evidence units)
```bash
node backend/scripts/seed-sample-entries.js <userId> [profileKey] [--count N] [--start YYYY-MM-DD --end YYYY-MM-DD] [--trajectory "PROFILE:days,..."] [--skip 0.2]
```

### Rebuild derived data
```bash
node backend/scripts/rebuild-derived.js [--only-missing] [--user <userId>]
```

Rebuild details:
- Generates `evidenceBySection` and `evidenceUnits` if missing.
- Updates derived signals (patterns, connections, weekly summaries).
- `--only-missing` skips entries that already have evidence.
- `--user` limits the run to a single user.

Other scripts:
- `backend/scripts/remove-seeded-entries.js`
- `backend/scripts/migrate-date-iso.js`
- `backend/scripts/backfill-entry-evidence.js`
- `backend/scripts/backfill-weekly-summaries.js`

## Patient UI (Signals)
Patient pages read `entry.evidenceUnits` and translate labels via:
- `packages/criteria-graph/criteria_specs/v1/depressive_disorders_patient_view.json`

Examples:
- SYMPTOM_MOOD → "Low Mood or Emptiness"
- IMPACT_WORK → "Work/School"
- CONTEXT_MEDICAL → "Physical Health"
- SYMPTOM_RISK → "Safety Support"

## Clinician UI (Criteria Coverage)
Clinician views show:
- Criteria coverage bars (current vs diagnostic window)
- Rule-out gates and exclusions
- Diagnostic logic graph
- Overrides + audit trail

## Troubleshooting
- **Module not found**: run `npm install` at repo root.
- **Backend LLM parse failures**: check `.env` LLM settings or use deterministic seed evidence.
- **CSP eval warnings**: ensure no inline eval usage in frontend.

## Safety
This project is a decision-support interface, not an automated diagnosis engine. The patient UI avoids clinical labels and does not expose raw diagnostic codes.
