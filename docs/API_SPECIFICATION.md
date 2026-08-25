# FocusFlow AI — API Specification

## Base URL
`http://localhost:5000/api`

## REST Endpoints

### 1. Authentication
- `POST /auth/register` — Create user account.
- `POST /auth/login` — Authenticate user and receive JWT.

### 2. Focus Engine & Telemetry
- `POST /focus/calculate` — Submit tab switches, idle seconds, typing/mouse rate to compute Focus Score.

### 3. Study Sessions
- `POST /sessions/start` — Start a new session.
- `POST /sessions/end` — Conclude session and log duration & average focus score.
- `GET /sessions/history` — Fetch past session logs.

## Socket.io WebSocket Events
- Server Port: `5000`
- `telemetry_signal` (Client -> Server): Send live telemetry data.
- `focus_score_update` (Server -> Client): Broadcast real-time score updates and alerts.
