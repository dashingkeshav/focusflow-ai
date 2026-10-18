# FocusFlow AI — Phase II

> **AI-Powered Study Focus & Distraction Intelligence Platform**

FocusFlow AI is a professional, full-stack SaaS platform designed to monitor tab switching, idle durations, and micro-behavioral typing/mouse interactions, calculate real-time Focus Scores (0–100), generate instant distraction alerts via Socket.io, and store analytics in MongoDB Atlas.

---

## 📁 Repository Structure

```text
FOCUSFLOW-AI/
│
├── frontend/             # Next.js 16 + TypeScript + Tailwind CSS App Router
│   ├── app/              # Landing page, Auth, and Dashboard sub-routes
│   ├── components/       # FocusTimer, FocusScoreGauge, Sidebar, TopHeader, Navbar, Footer
│   └── lib/              # Focus engine math calculation and API client
│
├── backend/              # Node.js + Express.js + Socket.io Server
│   ├── server.js         # Main server entry point
│   └── src/              # Models, Controllers, Routes, Config, and Middleware
│
├── extension/            # Chrome Extension Manifest V3
│   ├── manifest.json
│   ├── background.js     # Tab switch & idle background tracker
│   ├── content.js        # Interaction rate collector
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
│
└── docs/                 # System architecture, API specs, & Extension loading guide
```

---

## ⚡ Quick Start Guide

### 1. Launch Backend Server
```powershell
cd backend
npm start
```
Server runs at `http://localhost:5000`

### 2. Launch Next.js Frontend Application
```powershell
cd frontend
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Load Chrome Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `extension/` folder.
4. Open the extension popup, enter your dashboard and API origin, then choose **Save & connect**. The extension requests access only to those two origins.

### Windows Desktop Installer

The Windows desktop app is a secure Electron shell for the deployed FocusFlow
web app. The NSIS installer is written to `release/FocusFlow-Setup.exe`. The
first launch opens the public HTTPS site configured for that installer. Build
a Windows installer by setting the deployed site origin first:

```powershell
$env:FOCUSFLOW_APP_URL = Read-Host "Public HTTPS FocusFlow site origin"
npm run desktop:build:win
```

The build rejects missing, localhost, non-HTTPS, or non-origin URLs. Tag a
version as `v*` and push it to publish the Windows installer and Chrome
extension ZIP in a GitHub release. Set the repository Actions variable
`FOCUSFLOW_APP_URL` to the deployed HTTPS site origin before publishing. To
publish from the GitHub Actions page instead, run **Windows desktop and Chrome
extension release** with a version in `vMAJOR.MINOR.PATCH` format (for example
`v2.0.1`) and the deployed HTTPS site origin. The workflow builds both
artifacts and attaches them to that release; the download buttons work after
the release has completed.

### Billing and AI configuration

Razorpay test/live keys, the monthly `RAZORPAY_PLAN_PRO`, the billing webhook,
and the Gemini `GEMINI_API_KEY` are backend-only settings. See
[`docs/RAZORPAY_SETUP.md`](docs/RAZORPAY_SETUP.md) before testing payment
activation and [`docs/AI_PLANNER_SETUP.md`](docs/AI_PLANNER_SETUP.md) to
enable actual Gemini-backed plan generation. Never put private keys in
frontend environment variables.

---

## 🎯 Key Features
- **Real-Time Focus Score Engine**: Non-linear score calculation based on behavioral signals.
- **Live Session System**: Timer with start/pause/stop and simulated/live telemetry triggers.
- **Distraction Intelligence**: Immediate Socket.io alert stream upon tab switch spikes or idle timeouts.
- **Visual Analytics**: Interactive Recharts graphs for study hours and domain breakdown.
- **Adaptive AI Planner**: Builds persona-aware plans from real goals, tasks,
  focus history and calendar commitments, with a rule-based fallback if the
  Gemini API is not configured.
- **PDF & CSV Export**: Submit project presentation summaries and export raw telemetry datasets.
