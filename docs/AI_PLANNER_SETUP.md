# AI Planner setup

FocusFlow builds an individualized plan from the signed-in user's goals,
unfinished tasks, due dates, focus-session history, working-time preference,
chosen persona, available time and calendar commitments. The planner supports
students, professionals, developers, creators, freelancers, entrepreneurs,
job seekers and personal goals. Users can review a draft, edit it, save
versions, restore a version, simulate time changes, or apply confirmed blocks
as real tasks and calendar events.

## Enable Gemini generation

Set these backend environment variables and restart the backend:

```dotenv
GEMINI_API_KEY=<server-side Google AI Studio API key>
GEMINI_MODEL=gemini-2.5-flash
```

Keep the API key on the backend. Do not add it to a frontend `.env` file or a
`NEXT_PUBLIC_` variable. The server tries the configured model first, then
`gemini-2.5-flash`.

Plans use only the authenticated user's stored goals, pending tasks, focus
session statistics, supplied planning options, and calendar commitments.
Client-supplied `existingGoals` are ignored. Gemini output is requested as JSON
and checked against a server-owned schema; invalid schedules, overlaps,
out-of-bounds durations, and goal links that do not belong to the user are
rejected.

When Gemini is unavailable, unconfigured, or returns invalid output, the API
marks the plan as `generationSource: "rules"` and `aiPowered: false`. This
deterministic fallback is not presented as AI-generated. Validated Gemini
plans use `generationSource: "gemini"` and `aiPowered: true`.
Manually created plans report `generationSource: "user"` and `aiPowered: false`.

PDF, DOCX, TXT, and CSV uploads support text extraction. Image OCR and voice
transcription currently return HTTP 501; the server does not claim to have
processed images or audio. Client-supplied image OCR/voice transcription fields
are rejected too. Temporary uploads are removed after each request.

Generation requires `sessions`, `goals`, `tasks`, and `calendar_events`, plus
`user_plans` and `plan_versions`. The backend startup migration creates planner
persistence tables. Session fields consumed are `user_id`, `status`,
`start_time`, `created_at`, `avg_focus_score`, and `duration_seconds`; task
fields consumed are `user_id`, `title`, `priority`, `due_date`, and
`estimated_duration`.
