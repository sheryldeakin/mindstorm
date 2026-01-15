# MindStorm Monorepo

## Structure
- `apps/web` — Vite React app (patient + clinician UI)
- `backend` — Node/Express API
- `packages/*` — shared TypeScript packages

## Setup
```bash
npm install
```

## Dev
```bash
npm run dev:web
npm run dev:backend
npm run dev
```

## Web
```bash
npm run dev --workspace apps/web
```

## Backend
```bash
npm run dev --workspace backend
```

## Routes
- `/` — landing
- `/login` — auth
- `/portal` — choose patient/clinician
- `/patient/*` — patient app
- `/clinician/*` — clinician app (disclaimer banner included)
