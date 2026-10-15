# NajmUni controlled experience update — 2026-10-14

Baseline: React 18 / TypeScript / Vite, React Router, component-local state and PreferencesContext; Flask API with SQLAlchemy-backed SQLite/Postgres, existing lead and reservation endpoints. CRM, student/admin routes, migrations and production configuration are outside this UI change.

Git baseline: 77d9a24, no tracked edits; existing untracked competitive report preserved. Production build passes before changes; unit tests started. Original screenshots captured locally before editing.

| Capability / source | Destination / change |
|---|---|
| Home.tsx, Hero.tsx | Preserve blue hero and official branding; two routes to /explore and /apply |
| Universities.tsx, Institutes.tsx | Preserve original directories; add unified /explore using existing catalog API |
| UniversityDetail.tsx | Preserve content, promote searchable programs, link /programs/:id |
| StudyPlanFeature.tsx | Preserve optional /study-plan journey |
| BudgetCalculator.tsx | Preserve at /costs |
| JourneyTimeline.tsx / ComparisonPanel | Preserve optional comparison at /compare |
| BookingSection.tsx | Preserve existing reservation workflow at /consultation |
| /api/leads | Short /apply form; no documents; real success only |

Risks found: Instagram destinations masquerade as application/advisor actions; dev lead submission falsely succeeds on network failure. Catalog has no provenance/verification dates or program-specific prerequisites, so fees/intakes must be described as requiring confirmation. No verified business WhatsApp configuration found. Testimonials use unverified names and avatars; preserve component structure but suppress publication until approved evidence exists. Existing comparison score is heuristic, not eligibility. Original study-plan logic is retained, not certified as an admissions decision.

Implementation: protect existing files/assets → hero entry and additive routes → unified catalog search/detail → contextual handoff with configured number or internal advisor form → lead intake → supporting content → browser and regression checks. No database migration, remote push or deployment.
