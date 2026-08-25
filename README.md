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

---

## 🎯 Key Features
- **Real-Time Focus Score Engine**: Non-linear score calculation based on behavioral signals.
- **Live Session System**: Timer with start/pause/stop and simulated/live telemetry triggers.
- **Distraction Intelligence**: Immediate Socket.io alert stream upon tab switch spikes or idle timeouts.
- **Visual Analytics**: Interactive Recharts graphs for study hours and domain breakdown.
- **Random Forest ML Forecast**: AI distraction prediction model simulation.
- **PDF & CSV Export**: Submit project presentation summaries and export raw telemetry datasets.
