# NajmUni UX rebuild — 11 October 2026

Implemented locally in the existing React/Vite + Flask application. Production has not been deployed or modified.

## What changed
- Replaced the crowded homepage with one discovery action, a direct application-assistance path, a compact program entry, transparent budget tool, process explanation and FAQ.
- Added a restrained, shared public design system, Arabic default, complete English alternatives for the new journeys, mobile navigation, keyboard focus, semantic forms and reduced-motion handling.
- Rebuilt program discovery from the existing catalog; added `/programs/:id`, clear university details, searchable directories and up-to-three-university comparison.
- Reduced the questionnaire to four steps. Added education country and optional percentage/GPA grading. Results precede contact capture and never infer admission eligibility or invent intake dates.
- Unified `/apply` and `/consultation` on the real `/api/leads` service. University/program IDs and names, study preferences and budget context are retained. Removed development-only fake submission success.
- Replaced unverified statistics, reviews, accreditation, scholarship and availability claims with explicit data limitations. Added privacy and terms pages, plus a working 404.
- Removed obsolete UI and the random matching/demo recommendation code after checking the import graph. CRM/admin services and database schemas remain unchanged.

## Main files
- Shell and design: `client/src/App.tsx`, `client/src/styles/public.css`, `client/src/i18n.tsx`, `client/src/components/public/UI.tsx`, Navbar, Footer, Hero and BudgetCalculator.
- Journeys: Home, Universities, UniversityDetail, Programs, ProgramDetail, Institutes, Consultation and Policies under `client/src/pages/`.
- Study plan: `client/src/features/study-plan/StudyExplorer.tsx` and `studyDraft.ts`.
- Integration: `client/src/api.ts`, `client/src/hooks/useCatalog.ts`, `client/src/utils/analytics.ts`.
- Verification: `client/e2e/public.spec.ts`, `client/playwright.public.config.ts`, `server/tests/public_e2e_server.py`.

## Verification
- TypeScript and production build passed. Main entry JS: about 214 kB / 69 kB gzip, with detail pages loaded lazily.
- Nine Playwright tests passed against a real disposable Flask database through the Vite proxy. Covered Arabic/English, navigation, questionnaire validation and persistence, program context, actual lead saves/readback, submission outage/retry, costs, catalog fallback, privacy/terms and 404.
- Ten public routes checked at 1440, 768, 390 and 320 px: no unexpected horizontal overflow or JavaScript page errors.
- Existing frontend CRM regression suite: 20 passed. Backend routes/seed checks: 7 passed.
- No lint command is configured. Changed UI files were formatted with a temporary Prettier invocation; no frontend dependency was added.
- Screenshots were captured and visually reviewed. Adjusted the hero image framing and moved the contact form before explanatory content on mobile.

## Screenshots
- [Before: desktop](../.run-logs/before-home-1440.png), [before: mobile](../.run-logs/before-home-390.png)
- [After: desktop](../.run-logs/qa-home-1440.png), [after: mobile](../.run-logs/qa-home-390.png)
- [Program at 320 px](../.run-logs/qa--programs-1-320.png), [consultation at 390 px](../.run-logs/qa--consultation-390.png), [study result](../.run-logs/plan-result-desktop.png)

## Remaining external decisions and data
- Catalog fees, intake dates, requirements and institutional classifications have no authoritative verification timestamps. They remain labelled as directory information; advisor/university confirmation is required.
- Calculator constants are retained planning assumptions, not verified quotes. Visa, insurance, deposits, flights and other one-off costs are explicitly excluded pending data.
- Privacy notice describes implemented behavior. The business still needs to confirm retention periods, operational privacy contact, service pricing and response commitments before publication.
- Conversion events are emitted through `najmuni:analytics` without personal data; an analytics destination has not been selected or connected. No conversion uplift is claimed.
- Secure document collection remains an advisor-led next step; no upload service or WhatsApp number was invented.
- Live production and competitor browser behavior could not be verified; this report covers local implementation.

## Local preview
Frontend: http://127.0.0.1:5173 — kept running at the user's request.

API: http://127.0.0.1:5000 — disposable local preview database, seeded with the existing catalog (26 universities, 57 programs, 7 institutes). Requests really save locally; external notifications are disabled. Preview requests are discarded when the disposable fixture stops.

To reproduce the safe preview in two PowerShell terminals:

```powershell
$env:NAJMUNI_QA_PORT='5000'
.venv/Scripts/python.exe server/tests/public_e2e_server.py
```

```powershell
cd client
npm.cmd run dev -- --host 127.0.0.1 --port 5173
```

Public QA uses separate ports 5179/5091. Run from `client`: `node node_modules/@playwright/test/cli.js test -c playwright.public.config.ts`.
