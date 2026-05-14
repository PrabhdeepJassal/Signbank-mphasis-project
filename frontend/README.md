# SignBank Enterprise — Frontend

SignBank Enterprise is a gesture-driven smart interaction platform. The frontend is a React single-page application built with Vite and TypeScript. It communicates with a Spring Boot backend over REST and uses MediaPipe Hands for real-time gesture detection via the device camera.

---

## Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- The SignBank Spring Boot backend running on `http://localhost:8080`
- A device with a webcam (required for gesture detection)

---

## Installation

```bash
cd frontend
npm install
```

---

## Development

```bash
npm run dev
```

The application is available at `http://localhost:5173`. API requests to `/api/*` are proxied to `http://localhost:8080` by Vite.

---

## Production Build

```bash
npm run build
```

Output is in `dist/`. Serve with any static file server or Nginx.

---

## Environment

Copy `.env.example` to `.env` and set `VITE_API_URL` (defaults to `http://localhost:8080`).

---

## Project Structure

```
frontend/
├── index.html                  # Entry point, loads MediaPipe CDN scripts
├── package.json                # Dependencies and scripts
├── vite.config.ts              # Vite build configuration
└── src/
    ├── main.tsx                # React DOM root render
    ├── App.tsx                 # Router setup and route definitions
    ├── types.ts                # Shared TypeScript interfaces
    ├── api/                    # Axios HTTP client modules
    ├── components/             # Reusable UI components
    ├── context/                # React context providers
    ├── hooks/                  # Custom React hooks
    ├── pages/                  # Page components by role
    │   ├── auth/               # Public authentication pages
    │   ├── admin/              # Admin-only pages
    │   ├── operator/           # Operator-only pages
    │   └── viewer/             # Viewer-only pages
    └── routes/                 # Route guard components
```
