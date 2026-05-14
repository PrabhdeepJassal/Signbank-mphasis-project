# SignBank Enterprise

A gesture-driven smart interaction platform. Users control banking operations through hand gestures captured via webcam — no mouse, no keyboard.

- **Frontend:** React 19 + TypeScript + Vite
- **Backend:** Spring Boot 4.0 + Java 21
- **Database:** PostgreSQL 16
- **Gesture Detection:** MediaPipe Hands (browser) + OpenCV (server-side finger tracking)

---

## Quick Start (5 minutes)

```bash
# 1. Clone & enter project
git clone <repo-url> && cd Sign-Bank-Enterprise-mphasis-main

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Install frontend deps
cd frontend && npm install && cd ..

# 4. Build & run backend
cd backend && ./mvnw spring-boot:run

# 5. In another terminal, start frontend
cd frontend && npm run dev
```

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
│   │   └── db/postgres/         # schema.sql + data.sql
│   ├── Dockerfile
│   ├── pom.xml
│   └── mvnw                     # Maven wrapper
│
├── docker-compose.yml           # PostgreSQL + Backend
├── setup.sh                     # One-command bootstrap
└── README.md
```

---

## Prerequisites

| Tool       | Version   | Check                |
|------------|-----------|----------------------|
| Node.js    | >= 18     | `node --version`     |
| Java       | 21 (JDK)  | `java --version`     |
| Docker     | Latest    | `docker --version`   |
| npm        | >= 9      | `npm --version`      |

> **No Maven install needed** — the project ships with the Maven wrapper (`mvnw`).

---

## Setup Options

### Option A: Local Development (recommended)

```bash
# 1. Environment variables (optional — defaults work out of the box)
cp .env.example .env

# 2. Start PostgreSQL
docker compose up -d postgres

# 3. Backend
cd backend
./mvnw clean package -DskipTests
./mvnw spring-boot:run
# Runs on http://localhost:8080

# 4. Frontend (new terminal)
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Option B: Docker Compose (everything in containers)

```bash
docker compose up --build
```

This starts PostgreSQL + the Spring Boot backend. The frontend still needs to run locally (or serve the `dist/` build via Nginx).

### Option C: Automated Script

```bash
bash setup.sh
```

This checks prerequisites, starts PostgreSQL, installs deps, builds the backend, and prints instructions.

---

## Demo Credentials

| User ID | Role     | Login Method      | Credentials                          |
|---------|----------|-------------------|--------------------------------------|
| admin   | Admin    | Username/password | Username: `admin`, Password: `admin123` |
| 1111    | Operator | Gesture password  | G001 + G002 + G003 (1, 2, 3 fingers) |
| 1212    | Operator | Gesture password  | G005 (Open Palm)                     |
| 2111    | Viewer   | Gesture password  | G001 + G002 + G001                   |
| 2212    | Viewer   | Gesture password  | G003 + G004 + G005                   |

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
| `DB_HOST`      | `localhost`      | PostgreSQL host          |
| `DB_PORT`      | `5432`           | PostgreSQL port          |
| `DB_NAME`      | `signbank_db`    | Database name            |
| `DB_USER`      | `postgres`       | Database user            |
| `DB_PASSWORD`  | `postgres`       | Database password        |
| `PORT`         | `8080`           | Backend server port      |
| `VITE_API_URL` | `http://localhost:8080` | Backend URL (frontend) |

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

### Docker

```bash
docker compose up --build
```

---

## Architecture Notes

- **Gesture detection** runs entirely in the browser via MediaPipe Hands (CDN-loaded). The backend receives classified gesture events.
- **Finger tracking** for the set-limit slider uses OpenCV on the server side (no native install needed — uses `openpnp` Java bindings).
- **Auth** uses JWT tokens. Admin logs in with username/password. Operators and viewers log in with gesture sequences.
- **Database** schema is auto-created by Hibernate (`ddl-auto=update`). Seed data is loaded from `data.sql` on startup.
