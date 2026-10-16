# Student discovery redesign

The local preview now uses the complete reference catalogue: 22 institutions and 2,233 programmes. The previously running development database had only 34 visible legacy sample programmes. No existing student or production records were modified.

## Local preview

From the repository root, run `.venv\Scripts\python.exe server\preview_catalog.py` and `npm.cmd run dev --prefix client -- --host 127.0.0.1`. The API runs on port 5000 and Vite on 5173. Stop another process owned by this project on those ports before starting these commands.

The preview script explicitly imports the catalogue into `.run-logs/catalog-preview.db`, creates the local schema, and disables outbound messaging. It does not change the configured production database. Catalogue import into any other deployment remains an explicit operational step.

## Experience

- `/explore`: six visible field tiles with an option to show all fields, subject chips, bilingual search, programme cards, university and degree filters, and expandable results.
- `/universities` and `/programs`: redirect to the corresponding discovery tabs instead of maintaining conflicting directories.
- `/universities/:id`: complete programme list with degree tabs, field filtering, search, fees, location, and comparison.
- `/programs/:id`: discipline explanation, suitability, four curriculum modules where verified or clearly labelled field topics otherwise, career examples, preparation checklist, reference fees, and one application action.
- Search/filter state survives reload and the return trip from programme details, including university-specific searches.
- Mobile filters are collapsible; field tiles and selects fit narrow screens.

## Data boundaries

Programme names, durations and fees retain their existing `reference_only` status. The redesign does not turn the catalogue into an officially verified fee offer or confirm admission eligibility.

`studyFields.ts` supplies editorial discipline introductions and broad career examples. Its topics are explicitly **not university-specific course lists**. `programDetails.ts` holds seven manually checked curriculum excerpts with exact institution, programme-title and degree matching. Source URLs are kept internally in `program-curriculum-sources-2026-10-16.json`, not in the visitor flow. No EMGS links were reintroduced.

The Neogoals university directory was reviewed for navigation and information organization. The new components and Arabic guidance were written for NajmUni; marketing copy, admissions promises and imagery were not copied.

## Verification

- Production build passed.
- 28 targeted client tests passed (search, application context, comparison, curriculum identity and subject guidance).
- `node client/e2e/discovery-preview.cjs` passed against the complete local catalogue at 1440, 768, 390 and 320 px. Checks include field/subject selection, reload, return navigation, full university count, programme details, application prefilling, external-link absence, horizontal overflow and browser errors.
- Screenshots are in `.run-logs/discovery-redesign/`.
