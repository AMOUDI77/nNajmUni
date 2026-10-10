# NajmUni UX implementation audit — 2026-10-11

Scope: existing React 18/TypeScript/Vite app, React Router, inline CSS + global CSS. Flask API and existing lead/reservation tables remain the integration boundary. No deployment or schema changes.

## Findings before implementation
- Home renders 12 sections with competing discovery, contact, and booking paths. Primary CTAs and study-plan review leave for a generic Instagram profile.
- Public data API supports catalog fallback; lead submission has a development-only fake success. Remove that success fallback.
- University detail invents generic accreditation, facilities, scholarships and requirements. Replace with catalog facts and explicit confirmation states.
- Programs is a static field marketing page rather than a program directory. Build from the existing API, with filters and program details.
- Study plan requires seven steps, defaults country to Saudi Arabia, supports percentage grades only, and invents intake dates/readiness thresholds. Shorten it and avoid eligibility inference without rules.
- Existing calculator uses broad constants. Preserve these only as editable planning assumptions; explicitly exclude unknown visa, insurance and one-off charges.
- Footer privacy/terms links target FAQ. Publish factual data-use information and preliminary-request terms, without invented retention or business guarantees.
- Claims (12,400 students, 98% success, free services, testimonials) have no supplied substantiation. Remove from active public pages.
- No catch-all page, incomplete translations, inaccessible labels, heavy decoration and scattered inline UI styles.
- Existing CRM and administrative screens are out of scope and retained.

## Implementation priorities
1. Shared public shell/tokens, Arabic default, one discovery action and a ready-to-apply path.
2. Unified in-site consultation using the real /api/leads contract, with university/program and study-plan context preserved.
3. Catalog-backed university/program discovery, honest result and estimate states.
4. Responsive browser verification at 1440/768/390/320, real isolated local API submission, build and regression checks.

## Evidence limits
Prior web review retrieved Neogoals content with old crawl dates. Live network browser navigation was blocked; do not infer current competitor conversion performance. Catalog lacks authoritative verification dates and admission rules. Local browser tests use the existing disposable backend fixture, never production data.
