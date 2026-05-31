# SignBank Enterprise — Gesture-Driven Banking Platform

A **gesture-driven smart banking platform** where users control banking operations entirely through **hand gestures captured via webcam**. No mouse, no keyboard — just your hands.

Built for **Mphasis** as an enterprise-grade proof-of-concept for accessible, touchless banking interaction using AI-powered computer vision.

---

## 🔥 Key Features

### 🖐️ Gesture-Based Authentication
- **Gesture Password Login** — Instead of typing a password, perform a sequence of hand gestures (e.g., "One Finger → Two Fingers → Three Fingers") captured via webcam
- **Shuffled Challenge Login** — On each login, the system presents a random challenge (e.g., "Show 4 fingers") to prevent recording attacks
- **Admin Login** — Traditional username/password for admin role
- **JWT Token Auth** — All subsequent API calls authenticated via JWT

### 🤖 AI Fraud Detection System
- **11 Fraud Detection Rules** running on every login and transaction:
  - Login anomaly detection (unusual times, locations)
  - Transaction amount anomaly detection
  - Velocity checking (too many actions in short time)
  - Failed gesture attempt tracking
  - Device fingerprint mismatch detection
- **Real-time Fraud Alerts** — Instant alert generation with severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- **Alert Management UI** — View, acknowledge, and resolve alerts in the admin dashboard
- **Fraud Analytics Dashboard** — Visual trends, rule performance metrics, geo-distribution maps
- **Custom Alert Rules** — Admins can configure threshold rules (e.g., alert if >5 failed attempts in 10 minutes)
- **Session Tracking** — Every user session is logged with IP, device fingerprint, and user agent

### ✋ Gesture Control & Navigation
- **10 Built-in Gestures:**
  | ID | Gesture | Action |
  |----|---------|--------|
  | G001 | One Finger | Select / Confirm |
  | G002 | Two Fingers | Navigate Right / Next |
  | G003 | Three Fingers | Navigate Left / Back |
  | G004 | Closed Middle Two Fingers | Cancel / Close |
  | G005 | Open Palm | Stop / Home |
  | G006 | Thumbs Up | Confirm / Yes |
  | G007 | Thumbs Down | Reject / No |
  | G008 | Fist | Emergency Lock |
  | G009 | Middle Two Closed | Menu / Options |
  | G010 | Victory (✌️) | Custom Action |
- **Global Gesture Navigation** — Navigate the entire app using gestures, works across all pages
- **Per-Page Command Mapping** — Admins can map which gestures trigger which commands on each page
- **Gesture Training** — Users can register and train custom gesture patterns
- **AR Onboarding Guide** — Interactive tutorial that teaches gesture controls via camera overlay

### 🔐 Card Management
- **View Cards** — List all cards with status, type, and limits
- **Block / Unblock Cards** — Instantly block or unblock a card using gestures
- **Card Replacement** — Request and track card replacements
- **Set Transaction Limits** — Use finger tracking (OpenCV) to slide a limit selector visually

### 👥 Multi-Role System
| Role | Access | Login Method |
|------|--------|-------------|
| **Admin** | Full platform management, user CRUD, fraud dashboard, analytics | Username + Password |
| **Operator** | Banking operations: balance, cards, limits, transactions | Gesture password |
| **Viewer** | Read-only: dashboard, logs, personal analytics | Gesture password |

### 📊 Analytics & Monitoring
- **Admin Analytics** — Platform-wide interaction statistics, gesture usage heatmaps
- **Viewer Analytics** — Personal usage patterns and history
- **Fraud Analytics Dashboard** — Alert trends, rule effectiveness, geographic distribution
- **Interaction Logs** — Complete audit trail of all gesture events and system actions

### 🛡️ Security Features
- **JWT Authentication** with token expiry and refresh flow
- **Password Hashing** — bcrypt for admin passwords
- **Gesture Challenge Login** — Randomized challenges prevent replay attacks
- **Fraud Detection Engine** — Real-time evaluation of login and transaction patterns
- **Session Management** — Track and monitor active user sessions
- **Rate Limiting** — Prevent brute-force gesture attempts
- **Device Fingerprinting** — Detect unusual devices accessing accounts

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + TypeScript + Vite |
| **Backend** | Spring Boot 4.0 + Java 21 |
| **Database** | H2 (default, zero-setup) / PostgreSQL 16 (production) |
| **Gesture Detection** | MediaPipe Hands (browser, client-side) |
| **Finger Tracking** | OpenCV (server-side, for limit slider) |
| **Auth** | JWT (jjwt library) |
| **Build** | Maven (via wrapper `mvnw`) |
| **Migrations** | Flyway |
| **AI/ML** | Custom fraud detection engine with 11 rules |

---

## 📁 Project Structure

```
.
├── frontend/                          # React 19 + TypeScript + Vite
│   ├── src/
│   │   ├── api/                       # Axios HTTP client modules (7 API modules)
│   │   │   ├── adminApi.ts            # Admin CRUD operations
│   │   │   ├── authApi.ts             # Login, registration, gesture verification
│   │   │   ├── cardApi.ts             # Card management
│   │   │   ├── fraudApi.ts            # Fraud alerts & analytics
│   │   │   ├── gestureApi.ts          # Gesture event submission
│   │   │   ├── logsApi.ts             # Interaction logs
│   │   │   └── transactionsApi.ts     # Transaction operations
│   │   ├── components/
│   │   │   ├── ARGuide/               # Camera overlay onboarding tutorial
│   │   │   ├── GestureCamera/         # MediaPipe hand tracking camera component
│   │   │   ├── Layout/                # Admin & Portal layout shells
│   │   │   ├── ui/                    # Reusable Modal component
│   │   │   ├── FraudAlertBanner.tsx   # Real-time fraud alert notification
│   │   │   └── *                      # Other shared components
│   │   ├── context/
│   │   │   ├── AuthContext.tsx         # Auth state management
│   │   │   ├── DataContext.tsx         # Global data state
│   │   │   └── FraudContext.tsx        # Fraud alert state
│   │   ├── hooks/
│   │   │   ├── useGestureControl.ts   # Per-page gesture binding
│   │   │   ├── useGlobalGestureNav.ts # Global gesture navigation
│   │   │   └── useARGuide.ts          # AR tutorial state
│   │   ├── pages/
│   │   │   ├── auth/                  # Login, Landing, SetPassword
│   │   │   ├── admin/                 # (9 pages) Dashboard, Users, Gestures, Pages,
│   │   │   │                          # Commands, Mappings, Analytics, Fraud Dashboard,
│   │   │   │                          # Fraud Alert List, Fraud Rule Editor
│   │   │   ├── operator/              # (6 pages) Dashboard, Balance, Cards,
│   │   │   │                          # Card Actions, Set Limit, Set Limit Modal
│   │   │   └── viewer/                # (3 pages) Dashboard, Logs, Analytics
│   │   ├── routes/ProtectedRoute.tsx  # Role-based route guarding
│   │   ├── utils/
│   │   │   ├── eyeAspectRatio.ts      # Eye tracking utility
│   │   │   └── sound.ts               # Sound feedback for gestures
│   │   └── types.ts                   # Shared TypeScript interfaces
│   ├── dist/                          # Production build output
│   └── package.json
│
├── backend/                           # Spring Boot 4 + Java 21
│   ├── src/main/java/com/signbank/backend/
│   │   ├── controller/                # (11 controllers) REST endpoints
│   │   │   ├── AuthController.java    # Login, register, set password
│   │   │   ├── AdminController.java   # Full CRUD for users, gestures, pages, commands
│   │   │   ├── CardController.java    # Card operations
│   │   │   ├── FraudController.java   # Fraud alerts, analytics, rule management
│   │   │   ├── GestureController.java # Gesture event submission & querying
│   │   │   ├── TransactionController.java # Transaction processing
│   │   │   ├── LogController.java     # Interaction log queries
│   │   │   ├── TestController.java    # Debug/test endpoints
│   │   │   └── GlobalExceptionHandler.java
│   │   ├── service/                   # Business logic
│   │   │   ├── FraudDetectionEngine.java    # AI fraud evaluation engine
│   │   │   ├── LoginAnomalyRule.java        # Login pattern anomaly detection
│   │   │   ├── TransactionAnomalyRule.java  # Transaction amount anomaly detection
│   │   │   ├── VelocityRule.java            # Velocity/rate checking
│   │   │   ├── AlertManager.java            # Alert lifecycle management
│   │   │   ├── AuthService.java             # Authentication logic
│   │   │   ├── GestureService/Impl.java     # Gesture classification
│   │   │   ├── CardService/Impl.java        # Card business logic
│   │   │   ├── TransactionService.java      # Transaction processing
│   │   │   ├── LogService.java              # Log querying
│   │   │   ├── AdminService.java            # Admin operations
│   │   │   ├── OpenCvFingerTrackingService.java # Server-side finger counting
│   │   │   └── CustomUserDetailsService.java
│   │   ├── entity/                   # (14 JPA entities)
│   │   │   ├── User.java, Role.java, Card.java, Transaction.java
│   │   │   ├── Gesture.java, Page.java, Command.java, CommandMapping.java
│   │   │   ├── FraudAlert.java, AlertRule.java, CardReplacement.java
│   │   │   ├── InteractionLog.java, UserSession.java
│   │   ├── repository/               # (12 Spring Data repositories)
│   │   ├── dto/request/              # (14 request DTOs)
│   │   ├── dto/response/             # (13 response DTOs)
│   │   ├── mapper/                   # Entity ↔ DTO mappers
│   │   ├── security/                 # JWT auth filter, util, SecurityConfig
│   │   └── exception/                # Custom exceptions
│   ├── src/main/resources/
│   │   ├── application.properties
│   │   ├── db/migration/
│   │   │   ├── V1__initial_schema.sql    # Full database schema
│   │   │   └── V2__seed_data.sql         # Demo data
│   │   └── db/postgres/                  # PostgreSQL reference SQL
│   ├── pom.xml
│   └── mvnw                             # Maven wrapper (no install needed)
│
├── setup.sh                        # One-command bootstrap script
├── gesture_implementation_summary.pdf
├── signbank_ar_ai_technical_proposal.md
└── signbank_ar_ai_technical_proposal.pdf
```

---

## 🚀 Quick Start (5 Minutes)

**Prerequisites:** Node.js >= 18, Java 21 JDK.

```bash
# 1. Clone & enter
git clone <repo-url> && cd Sign-Bank-Enterprise-mphasis-main

# 2. Frontend deps
cd frontend && npm install && cd ..

# 3. Build & run backend (auto-creates DB + seeds data)
cd backend && ./mvnw spring-boot:run

# 4. New terminal — start frontend
cd frontend && npm run dev
```

> **Database is fully automatic** — uses H2 file-based DB. Tables and demo data are created on first run. To reset, delete `backend/data/signbankdb.mv.db` and restart.

Open **http://localhost:5173** with a webcam.

### Automated Script
```bash
bash setup.sh
```

---

## 🧪 Demo Credentials

| User ID | Role | Login Method | Credentials |
|---------|------|-------------|-------------|
| `admin` | Admin | Username/password | `admin` / `admin123` |
| `1111` | Operator | Gesture sequence | G001→G002→G003 (One→Two→Three) |
| `1212` | Operator | Gesture | G005 (Open Palm) |
| `2111` | Viewer | Gesture sequence | G001→G002→G001 |
| `2212` | Viewer | Gesture sequence | G003→G004→G005 |

### Gesture Reference
| ID | Gesture | ID | Gesture |
|----|--------|----|--------|
| G001 | ☝️ One Finger | G006 | 👍 Thumbs Up |
| G002 | ✌️ Two Fingers | G007 | 👎 Thumbs Down |
| G003 | 🤟 Three Fingers | G008 | ✊ Fist |
| G004 | 🖖 Closed Middle Two | G009 | 🤏 Middle Two Closed |
| G005 | 🖐️ Open Palm | G010 | ✌️ Victory |

---

## 🗺️ Routes

### Admin
| Route | Description |
|-------|------------|
| `/admin/dashboard` | Navigation hub with platform overview |
| `/admin/users` | CRUD user management |
| `/admin/gestures` | View registered gestures |
| `/admin/pages` | View pages & role assignments |
| `/admin/commands` | View available commands per page |
| `/admin/mappings` | Gesture → Command mapping editor |
| `/admin/analytics` | Platform-wide interaction analytics |
| `/admin/fraud-dashboard` | Fraud overview & trends |
| `/admin/fraud-alerts` | Browse & manage fraud alerts |
| `/admin/fraud-rules` | Configure fraud detection rules |

### Operator
| Route | Description |
|-------|------------|
| `/operator/dashboard` | Available commands with gesture guide |
| `/operator/balance` | Check account balance |
| `/operator/set-limit/:type` | Set daily/transaction limits via finger tracking |
| `/operator/cards` | View managed cards |
| `/operator/card-actions/:type` | Block / unblock / replace cards |

### Viewer
| Route | Description |
|-------|------------|
| `/viewer/dashboard` | Available commands with gesture guide |
| `/viewer/logs` | Personal interaction history |
| `/viewer/analytics` | Personal usage analytics |

---

## 🔌 API Endpoints

`http://localhost:8080/api/`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login (username + password) |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/set-password` | Set/update gesture password |
| POST | `/api/auth/verify-credential` | Verify gesture sequence login |
| POST | `/api/auth/probe` | Probe user ID to check role & login type |

### Fraud Detection
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/fraud/alerts` | List fraud alerts (paginated, filterable) |
| GET | `/api/fraud/alerts/{id}` | Get alert details |
| PATCH | `/api/fraud/alerts/{id}/acknowledge` | Acknowledge alert |
| PATCH | `/api/fraud/alerts/{id}/resolve` | Resolve alert |
| GET | `/api/fraud/analytics/summary` | Fraud statistics summary |
| GET | `/api/fraud/analytics/trends` | Alert trend data |
| GET | `/api/fraud/rules` | List alert rules |
| POST | `/api/fraud/rules` | Create alert rule |
| PUT | `/api/fraud/rules/{id}` | Update alert rule |
| DELETE | `/api/fraud/rules/{id}` | Delete alert rule |

### Card Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/operator/cards/{userId}` | List user's cards |
| GET | `/api/operator/cards/{userId}/{cardNumber}` | Card details |
| POST | `/api/operator/cards/block` | Block a card |
| POST | `/api/operator/cards/unblock` | Unblock a card |
| POST | `/api/operator/cards/replace` | Request card replacement |
| GET | `/api/operator/cards/replacement/status/{requestId}` | Replacement status |

### Gesture & Interaction
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/gesture-events` | Submit a detected gesture event |
| GET | `/api/gestures` | List all registered gestures |
| POST | `/api/operator/set-limit` | Set transaction limit |
| POST | `/api/operator/analyse-finger` | Finger count analysis (OpenCV) |
| GET | `/api/logs` | Query interaction logs |
| GET | `/api/analytics/summary` | Platform analytics summary |

### Admin CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/admin/users` | List / Create users |
| GET/PUT/DELETE | `/api/admin/users/{id}` | Read / Update / Delete user |
| GET/POST | `/api/admin/gestures` | List / Create gestures |
| GET/PUT/DELETE | `/api/admin/gestures/{id}` | Read / Update / Delete gesture |
| GET/POST | `/api/admin/pages` | List / Create pages |
| GET/POST | `/api/admin/commands` | List / Create commands |
| GET/POST/PUT/DELETE | `/api/admin/mappings` | Gesture→Command mapping CRUD |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Backend server port |
| `VITE_API_URL` | `http://localhost:8080` | Backend URL (frontend .env) |
| `SPRING_PROFILES_ACTIVE` | *(unset)* | Set to `postgres` for PostgreSQL |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `signbank_db` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |

---

## 🏭 Production Build

```bash
# Frontend
cd frontend && npm run build
# Output: frontend/dist/ — serve via Nginx

# Backend
cd backend && ./mvnw clean package -DskipTests
java -jar backend/target/backend-0.0.1-SNAPSHOT.jar
```

---

## 🏛️ Architecture Highlights

- **Client-Side Gesture Detection** — MediaPipe Hands runs entirely in the browser via CDN. No video data is sent to the server, preserving privacy. The backend only receives classified gesture IDs.
- **AI Fraud Detection** — Custom engine evaluates login patterns, transaction amounts, velocity, and device fingerprints in real-time. 11 rules fire on every event.
- **Dual Database Support** — H2 for zero-setup development, PostgreSQL for production. Flyway manages both schemas.
- **Gesture Challenge Login** — Users don't set a fixed gesture password. Instead, they register multiple gesture "challenges" and the system presents a random subset each login, preventing shoulder-surfing and recording attacks.
- **OpenCV Finger Tracking** — For the set-limit slider, the server processes individual finger images to count raised fingers, enabling precise limit adjustment without a mouse.

---

## 📄 License

Enterprise project — developed for Mphasis.
