# FocusFlow AI — Phase II System Architecture

## Overview
FocusFlow AI is an intelligent study focus and distraction intelligence platform built across three primary subsystems:
1. **Frontend App (`frontend/`)**: Next.js App Router + TypeScript + Tailwind CSS + Recharts.
2. **Backend Server (`backend/`)**: Node.js + Express.js + Socket.io + Supabase PostgreSQL + JWT.
3. **Chrome Extension (`extension/`)**: Chrome Manifest V3 extension monitoring tab switching and idle signals.

```
                         FOCUSFLOW AI
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   Public Website        Authenticated App      Browser Extension
        │                     │                     │
   Landing Page           Dashboard             Activity Tracking
   Features               Sessions              Tab Switching
   Pricing                Analytics             Idle Detection
   About                  Reports               Keyboard Activity
   Contact                Settings              Mouse Activity
                              │
                              ▼
                       Focus Engine
                              │
                  ┌───────────┴───────────┐
                  │                       │
             Focus Score             AI Analysis
                  │                       │
                  └───────────┬───────────┘
                              ▼
                     Real-time Feedback
                              │
                 ┌────────────┼────────────┐
                 │            │            │
               Alerts     Suggestions   Analytics
```

## Focus Score Calculation Formula
The Focus Engine computes a dynamic score (0–100) using behavioral telemetry:

$$\text{Score} = \max\left(0, \min\left(100, 100 - (4 \times \text{TabSwitches}) - 1.5 \times \lfloor \frac{\text{IdleSeconds}}{10} \rfloor + \text{KeyboardBoost} + \text{MouseBoost}\right)\right)$$

Where:
- **Tab Switches**: -4 points per switch in a 2-minute sliding window.
- **Idle Seconds**: -1.5 points per 10 seconds of detected inactivity.
- **Keyboard Activity**: +5 points for active productive typing rate (15–120 kpm).
- **Mouse Interaction**: +3 points for active cursor engagement (5–60 movements/min).
