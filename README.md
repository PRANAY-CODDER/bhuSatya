# BhuSatya

BhuSatya is a land-record digitization workspace for turning scanned revenue documents into searchable records that can be reviewed, validated, mapped, and audited by field and district officers.

The project is built as a Next.js application. It includes a dashboard for record operations, a review queue for low-confidence entries, GIS views, analytics, an audit trail, a local knowledge bank, and export/backup tools.

> **Current status:** BhuSatya is a functional prototype. The application has a complete demo workflow and a PostgreSQL data layer, but document OCR and field extraction are represented by mock responses in the current source. Do not use the current extraction flow for real records without connecting a production OCR service and adding the required security and operational controls.

## What the application does

- **Dashboard:** Shows record volume, processing status, confidence, recent activity, and review workload.
- **Repository:** Searches and filters land records, opens record details, and exports CSV or XLSX files.
- **Upload and extraction:** Accepts PDF and image uploads, starts a record-processing workflow, and displays extracted fields with confidence values. The current extraction route uses sample profiles for demonstration.
- **Validation:** Checks required fields, area limits, overall confidence, and the number of extracted fields above the review threshold.
- **Human review:** Lets an officer verify, reject, flag, or return records for review instead of requiring every record to be typed manually.
- **GIS map:** Displays parcel locations from record latitude and longitude values.
- **Audit trail:** Records ingestion, preprocessing, OCR, AI scoring, review actions, exports, and system events.
- **Analytics:** Provides operational views of throughput, confidence, statuses, and district activity.
- **Knowledge Bank:** Provides local guidance for uploads, OCR, validation, review, security, backup, and navigation.
- **AI assistant:** Answers questions from the local Knowledge Bank. An optional Hugging Face token enables a general-purpose model response, with the local guidance retained as the fallback.
- **Settings:** Exposes system health, account/security actions, and JSON backup export.

## Technology

- Next.js 16 with the App Router
- React 19 and TypeScript
- PostgreSQL with Drizzle ORM
- Tailwind CSS 4
- Framer Motion for interface motion
- React Three Fiber and Three.js for ambient visual elements
- Leaflet for map views
- Recharts for analytics
- XLSX for spreadsheet export
- Zod for request validation in selected API paths

## Requirements

- Node.js 20 or newer
- npm
- PostgreSQL 14 or newer if running with the database-backed mode

The local demo mode does not need a running PostgreSQL server for authentication and sample records. A `DATABASE_URL` is still required by the database module, so keep the value in `.env` even when using local mode.

## Run the demo locally

Install dependencies:

```powershell
npm install
```

Create the environment file:

```powershell
Copy-Item .env.example .env
```

The default `.env` enables local mode:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
BHULEKH_LOCAL_MODE=true
HF_TOKEN=
```

Start the development server:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts

Local mode starts with two in-memory accounts:

| Email | Password | Role |
| --- | --- | --- |
| `admin@bhusatya.gov.in` | `admin123` | Admin |
| `officer@bhusatya.gov.in` | `officer123` | Officer |

Local records, accounts, sessions, notifications, and audit events live in the running Node.js process. Restarting the development server resets this demo state.

## Run with PostgreSQL

Create a PostgreSQL database and set its connection string in `.env`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
BHULEKH_LOCAL_MODE=false
```

The Drizzle schema is defined in `src/db/schema.ts`, and the database connection is created in `src/db/index.ts`. The seed script creates demo users, land records, audit events, and notifications:

```powershell
npx tsx src/db/seed.ts
```

The seed script skips itself when the `users` table already contains data. The current repository does not include a migration script in `package.json`; apply schema changes with the Drizzle tooling appropriate to your database workflow before running the seed script.

## Useful commands

```powershell
npm run dev       # Start the development server
npm run lint      # Run ESLint
npm run typecheck # Run TypeScript without emitting files
npm run build     # Create a production build
npm run start     # Serve the production build
```

Before opening a pull request, run at least:

```powershell
npm run lint
npm run typecheck
npm run build
```

## Application flow

1. An authenticated user uploads a supported PDF or image from the repository/upload workflow.
2. The record is created with a processing status and placeholder extracted values.
3. Audit events are added for ingestion, preprocessing, OCR queueing, and field scoring.
4. The validation endpoint checks required fields, parcel area, overall confidence, and field-level confidence.
5. Passing records become verified. Failing records stay available in the review queue.
6. Review actions update the record and add audit/notification entries.
7. Records can be searched, viewed on the map, analysed, exported, or included in a backup.

## Project structure

```text
src/
  app/                 Pages, layouts, and API route handlers
  components/          Dashboard, records, validation, shell, map, and UI components
  db/                  Drizzle connection, schema, and seed data
  lib/                 Authentication, queries, local demo data, state, and knowledge base
```

Important areas:

- `src/app/(app)/` contains the authenticated workspace pages.
- `src/app/api/` contains authentication, records, upload, extraction, chat, health, backup, and notification routes.
- `src/db/schema.ts` defines users, sessions, land records, audit events, and notifications.
- `src/lib/local-data.ts` provides the in-memory records used by local mode.
- `src/lib/auth.ts` switches between local in-memory authentication and PostgreSQL-backed sessions.
- `src/lib/knowledge-base.ts` contains the assistant's verified local answers.

## API areas

The main API groups are:

| Area | Routes | Purpose |
| --- | --- | --- |
| Auth | `/api/auth/*` | Login, registration, logout, and password changes |
| Records | `/api/records`, `/api/records/[id]` | Search, create, update, delete, and export records |
| Validation | `/api/records/[id]/validate` | Run validation checks and update record status |
| Suggestions | `/api/records/[id]/suggestions/*` | Review and apply extracted-field suggestions |
| Documents | `/api/documents/upload`, `/api/documents/extract` | Accept documents and return demo extraction data |
| Assistant | `/api/ai/chat`, `/api/knowledge/chat` | Answer workspace questions |
| Operations | `/api/health`, `/api/integration/health`, `/api/backup` | Health checks and JSON backup |
| Activity | `/api/activity`, `/api/notifications`, `/api/stats` | Operational activity, notifications, and dashboard statistics |

All protected pages and most operational routes require the session cookie created during login.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string used by Drizzle |
| `BHULEKH_LOCAL_MODE` | For demo mode | Set to `true` for in-memory auth and sample data; set to `false` for database-backed sessions and records |
| `HF_TOKEN` | No | Hugging Face Inference API token for optional assistant responses |

Never commit `.env`. The repository includes `.env.example` for the non-secret configuration shape.

## Current limitations

- `src/app/api/documents/extract/route.ts` validates file type and size but does not read the uploaded document. It selects a mock extraction profile and generates confidence values.
- `src/app/api/documents/upload/route.ts` accepts upload metadata but does not persist the file or connect it to an OCR worker.
- Local mode stores state in memory and is intended for demos, not shared use.
- The application does not yet provide a production migration command or background worker setup.
- HF_TOKEN is optional. Without it, the assistant answers from the local Knowledge Bank. With it, the app calls the Hugging Face inference router and falls back locally if that request fails.
- Demo credentials are present in source and must not be reused in a deployed environment.

## Before production use

At minimum, replace the mock extraction path with a secured OCR/document-processing service, persist source documents in controlled storage, add a proper migration and deployment process, rotate demo credentials, review authorization by role, and add automated tests for upload, extraction, validation, export, and backup flows.

## License

See [LICENSE](LICENSE).
