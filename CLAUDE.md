# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DormDoc is a full-stack MERN application for college dispensary management at BIT Mesra. It serves students, doctors, and administrators with role-based dashboards, appointment booking, prescription management, ambulance tracking, and an AI-powered medical chatbot.

## Commands

### Development
```bash
npm run dev          # Start both server (port 5000) and client (port 3000) concurrently
npm run server       # Server only (nodemon)
npm run client       # React client only
```

### Build & Production
```bash
npm run build        # Build React client
npm start            # Start production server
```

### Database
```bash
npm run seed         # Seed DB with 6k students, 6k parents, 400 faculty, 50 staff
node test-db.js      # Verify MongoDB connection
```

### Linting & Tests
```bash
cd src/client && npm run lint   # ESLint (--max-warnings=0, must pass clean)
cd src/client && npm test       # Run React client tests
```

### Setup
```bash
cp .env.example .env            # Create env file
npm install && npm run install-client  # Install all dependencies
```

## Architecture

### Stack
- **Backend**: Node.js + Express 4 + Socket.io, served from `src/server/server.js`
- **Frontend**: React 18 + Material-UI 5, located at `src/client/`
- **Database**: MongoDB via Mongoose (auto-creates collections, no migrations)
- **Real-time**: Socket.io for ambulance tracking and live chat

### Backend Structure (`src/server/`)
- **`server.js`** — Express + Socket.io entry point, CORS, helmet, rate limiting
- **`middleware/auth.js`** — JWT verification, role checks (`requireStudent`, `requireAdmin`, etc.). In development, token `'dev_token'` returns a mock student user.
- **`models/`** — 13 Mongoose schemas: User, Student, Parent, Faculty, Doctor, DispensaryStaff, Appointment, Prescription, Ambulance, AmbulanceTrip, Inventory, OTP, LoginLog
- **`routes/`** — 17 route files organized by domain: `auth`, `student`, `admin`, `doctor`, `prescriptions`, `ambulance`, `ambulance-tracking`, `analytics`, `inventory`, `qr`, `ai`, `chatbot`, `erp`, `profile`, `clerkAuth`, `chat`

### Frontend Structure (`src/client/src/`)
- **`App.js`** — Main router wrapping ClerkProvider; routes split by role
- **`pages/`** — Role-based page directories: `Auth/`, `Student/`, `Admin/`, `Doctor/`, `HOD/`, `Parent/`, `Profile/`
- **`contexts/`** — `AuthContext` (JWT), `ClerkAuthContext` (Clerk), `SocketContext` (Socket.io)
- **`components/`** — Shared components: Layout, Chatbot, QR code scanner/generator, health check

### Authentication
Two parallel auth systems coexist:

**JWT (traditional)**: Login → bcrypt password check → JWT issued → stored in `localStorage` as `'token'` → Axios interceptor injects as `Authorization: Bearer <token>`.

**Clerk (modern)**: Clerk handles UI auth → on first sign-in, `/api/clerk-auth/sync` upserts the user in MongoDB → role and profile stored in Clerk `publicMetadata`.

Both systems support RBAC. Role hierarchy: student, admin, doctor, dispensary_staff, hod.

### Data Flow
```
React (Axios + Socket.io) → Express Routes (JWT middleware) → Mongoose → MongoDB
                                       ↓
                          External: Nodemailer, Gemini/OpenAI/HuggingFace
```

## Environment Variables

Copy `.env.example` to `.env`. Required:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Random string for signing tokens
- `PORT` — Defaults to 5000

Optional (features degrade gracefully without them):
- `GOOGLE_AI_API_KEY` / `OPENAI_API_KEY` — AI chatbot
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` — OTP email via Nodemailer
- `QR_CODE_SECRET` — QR generation
- `ERP_API_URL`, `ERP_API_KEY` — ERP integration
- `CLIENT_URL` — CORS origin (default: `http://localhost:3000`)

The client has its own `src/client/.env.development` for React environment variables (e.g., `REACT_APP_CLERK_PUBLISHABLE_KEY`).

## Branching & Commits

Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`. Branch names: `feature/*`, `fix/*`, `chore/*`, `docs/*`. The pre-commit hook runs ESLint — commits will fail if lint errors exist.

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on push to `main`: installs root + client deps and builds the React client. The React client deploys to Netlify (`netlify.toml`); the server deploys to Heroku/Node hosting.
