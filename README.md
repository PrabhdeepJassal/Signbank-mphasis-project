# SignBank Enterprise

A gesture-driven smart interaction platform. Users control banking operations through hand gestures captured via webcam — no mouse, no keyboard.

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Spring Boot 4.0 + Java 21
- **Database:** H2 (file-based, default) / PostgreSQL 16 (optional)
- **Gesture Detection:** MediaPipe Hands (browser) + OpenCV (server-side finger tracking)

---

## Quick Start (5 minutes)

**Prerequisites:** Node.js >= 18, Java 21 JDK. No database install needed (uses H2 by default).

```bash
# 1. Clone & enter project
git clone <repo-url> && cd Sign-Bank-Enterprise-mphasis-main

# 2. Install frontend deps
cd frontend && npm install && cd ..

# 3. Build & run backend (auto-creates tables + seeds demo data)
cd backend && ./mvnw spring-boot:run

# 4. In another terminal, start frontend
cd frontend && npm run dev
```

> **Database is fully automatic** — Uses H2 file-based DB (stored in `backend/data/signbankdb.mv.db`). Tables and demo data are created on first run. No PostgreSQL needed. To reset, delete the `backend/data/` folder and restart.

Open **http://localhost:5173** in a browser with a webcam.

---

## Project Structure

```
.
├── frontend/                    # React + TypeScript + Vite
│   ├── src/
│   │   ├── api/                 # Axios HTTP client modules
│   │   ├── components/          # Reusable UI (GestureCamera, Layouts, Modal)
│   │   ├── context/             # AuthContext, DataContext
│   │   ├── hooks/               # useGestureControl, useGlobalGestureNav
│   │   ├── pages/               # Page components by role
│   │   │   ├── auth/            # Login, Landing, SetPassword
│   │   │   ├── admin/           # Dashboard, CRUD pages, Analytics
│   │   │   ├── operator/        # Dashboard, Balance, Cards, Limits
│   │   │   └── viewer/          # Dashboard, Logs, Analytics
│   │   ├── routes/              # ProtectedRoute guard
│   │   ├── App.tsx              # Router setup
│   │   └── main.tsx             # Entry point
│   ├── package.json
│   ├── vite.config.ts
│   └── .env.example
│
├── backend/                     # Spring Boot 4 + Java 21
│   ├── src/main/java/com/signbank/backend/
│   │   ├── controller/          # REST endpoints
│   │   ├── service/             # Business logic
│   │   ├── entity/              # JPA entities
│   │   ├── repository/          # Spring Data repositories
│   │   ├── dto/
│   │   │   ├── request/         # Request DTOs (13 files)
│   │   │   └── response/        # Response DTOs (12 files)
│   │   ├── mapper/              # Entity ↔ DTO mappers
│   │   ├── security/            # JWT auth, SecurityConfig
│   │   └── exception/           # Custom exceptions
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   ├── db/migration/        # Flyway migrations (schema + seed)
│   │   └── db/postgres/         # Reference SQL files
│   ├── pom.xml
│   └── mvnw                     # Maven wrapper
│
├── setup.sh                     # One-command bootstrap
└── README.md
```

---

## Prerequisites

| Tool       | Version   | Check                |
|------------|-----------|----------------------|
| Node.js    | >= 18     | `node --version`     |
| Java       | 21 (JDK)  | `java --version`     |
| npm        | >= 9      | `npm --version`      |

> **No Maven install needed** — the project ships with the Maven wrapper (`mvnw`).

---

## Setup Options

### Option A: Local Development (recommended — H2)

No database setup needed. The default profile uses an embedded H2 database stored in `backend/data/`.

**1. Backend:**
```bash
cd backend
./mvnw spring-boot:run
# Runs on http://localhost:8080
# DB file: backend/data/signbankdb.mv.db (auto-created)
```

**2. Frontend** (new terminal):
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Option A2: PostgreSQL (optional)

If you prefer PostgreSQL, ensure it's running and use the `postgres` profile:

```bash
createdb signbank_db
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

### Option B: Automated Script

```bash
bash setup.sh
```

This checks prerequisites, installs deps, builds the backend, and prints instructions.

---

## Demo Credentials

| User ID | Role     | Login Method      | Credentials                          |
|---------|----------|-------------------|--------------------------------------|
| admin   | Admin    | Username/password | Username: `admin`, Password: `admin123` |
| 1111    | Operator | Gesture password  | G001-G002-G003 (One → Two → Three Fingers) |
| 1212    | Operator | Gesture password  | G005 (Open Palm)                          |
| 2111    | Viewer   | Gesture password  | G001-G002-G001                            |
| 2212    | Viewer   | Gesture password  | G003-G004-G005                            |

### Gesture ID Reference

| ID   | Gesture                  |
|------|--------------------------|
| G001 | One Finger               |
| G002 | Two Fingers              |
| G003 | Three Fingers            |
| G004 | Closed Middle Two Fingers|
| G005 | Open Palm                |
| G006 | Thumbs Up                |
| G007 | Thumbs Down              |
| G008 | Fist                     |
| G009 | Middle Two Closed        |

---

## User Roles & Routes

| Role     | Login Page           | Landing Page          |
|----------|----------------------|-----------------------|
| Admin    | `/admin/login`       | `/admin/dashboard`    |
| Operator | `/login/gesture`     | `/operator/dashboard` |
| Viewer   | `/login/gesture`     | `/viewer/dashboard`   |

### Admin Pages

| Route                  | Description                          |
|------------------------|--------------------------------------|
| `/admin/dashboard`     | Navigation hub                       |
| `/admin/users`         | CRUD users                           |
| `/admin/gestures`      | View registered gestures             |
| `/admin/pages`         | View pages & role assignments        |
| `/admin/commands`      | View commands per page               |
| `/admin/mappings`      | Gesture → command mapping editor     |
| `/admin/analytics`     | Platform interaction statistics      |

### Operator Pages

| Route                        | Description                    |
|------------------------------|--------------------------------|
| `/operator/dashboard`        | Available commands + gestures  |
| `/operator/balance`          | Check balance                  |
| `/operator/set-limit/:type`  | Set transaction limit via finger tracking |
| `/operator/cards`            | Card management                |
| `/operator/card-actions/:type` | Block/unblock/replace cards  |

### Viewer Pages

| Route                   | Description                   |
|-------------------------|-------------------------------|
| `/viewer/dashboard`     | Available commands + gestures |
| `/viewer/logs`          | Personal interaction history  |
| `/viewer/analytics`     | Personal usage analytics      |

---

## API Overview

All endpoints are under `http://localhost:8080/api/`.

| Endpoint                    | Method | Auth     | Description              |
|-----------------------------|--------|----------|--------------------------|
| `/api/auth/login`           | POST   | Public   | Login (probe + password) |
| `/api/auth/set-password`    | POST   | Public   | Set gesture password     |
| `/api/auth/register`        | POST   | Public   | Register new user        |
| `/api/auth/verify-credential`| POST  | Public   | Verify gesture password  |
| `/api/admin/*`              | GET/POST/PUT/DELETE | Public* | Admin CRUD operations |
| `/api/logs/*`               | GET/POST | Public* | Interaction logs       |
| `/api/gesture-events`       | POST   | Public   | Submit gesture event     |
| `/api/operator/cards/*`     | GET/POST | Public* | Card operations        |
| `/api/operator/analyse-finger` | POST | Public | Finger tracking        |
| `/api/operator/set-limit`   | GET/POST | Public | Transaction limit       |

> \* Currently set to `permitAll()` in `SecurityConfig` for development. Lock down in production.

---

## Environment Variables

| Variable       | Default          | Description              |
|----------------|------------------|--------------------------|
| `PORT`         | `8080`           | Backend server port      |
| `VITE_API_URL` | `http://localhost:8080` | Backend URL (frontend) |
| `SPRING_PROFILES_ACTIVE` | *(unset)* | Set to `postgres` for PostgreSQL mode |
| `DB_HOST`      | `localhost`      | PostgreSQL host (postgres profile) |
| `DB_PORT`      | `5432`           | PostgreSQL port (postgres profile) |
| `DB_NAME`      | `signbank_db`    | Database name (postgres profile) |
| `DB_USER`      | `postgres`       | Database user (postgres profile) |
| `DB_PASSWORD`  | `postgres`       | Database password (postgres profile) |

---

## Production Build

### Frontend

```bash
cd frontend
npm run build
# Output: frontend/dist/ — serve with Nginx or any static server
```

### Backend

```bash
cd backend
./mvnw clean package -DskipTests
# Output: backend/target/backend-0.0.1-SNAPSHOT.jar
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar
```



---

## Architecture Notes

- **Gesture detection** runs entirely in the browser via MediaPipe Hands (CDN-loaded). The backend receives classified gesture events.
- **Finger tracking** for the set-limit slider uses OpenCV on the server side (no native install needed — uses `openpnp` Java bindings).
- **Auth** uses JWT tokens. Admin logs in with username/password. Operators and viewers log in with gesture sequences.
- **Database** defaults to **H2** (file-based, zero setup). A `postgres` Spring profile switches to PostgreSQL 16. Schema and seed data are managed by **Flyway** migrations + a `data.sql` that re-runs on every startup (safe upsert via `MERGE INTO`).
- **Gesture passwords** are gesture-ID sequences joined with hyphens (e.g. `G001-G002-G003`). When entering via camera, perform the gestures in order and confirm with Thumbs Up.
- **Reset database**: delete `backend/data/signbankdb.mv.db` (and `.trace.db`) and restart the backend. All tables and demo data will be recreated.
