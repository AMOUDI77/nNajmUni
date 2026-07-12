# NajmUni

NajmUni is a React/Vite frontend with a Flask API and SQLite database. It helps international students explore Malaysian universities, institutes, study fields, and submit consultation or reservation requests.

## Current Stack

- Frontend: React, TypeScript, Vite
- Backend: Flask
- Local database: SQLite
- Production host: Render
- Main website: `https://najmuni.com`
- API domain: `https://api.najmuni.com`

## Local Setup

1. Install frontend dependencies:

```bash
npm run install:all
```

2. Install backend dependencies:

```bash
pip install -r server/requirements.txt
```

3. Configure environment variables:

```bash
copy .env.example .env
```

Set `ADMIN_KEY` and `STUDENT_KEY` to long private passwords before using `/admin` or `/students`.

4. Run the app:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to Flask on `http://localhost:5000`.

## Important Pages

- `/` public website
- `/universities` universities list
- `/universities/:id` university details
- `/institutes` institutes list
- `/programs` study fields
- `/admin` admin dashboard
- `/students` student CRM

## Production Build

Build the frontend:

```bash
npm run build
```

The Flask app serves `client/dist` in production. The included `Procfile` runs:

```bash
cd server && gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 60
```

Required production environment variables:

- `ADMIN_KEY`
- `STUDENT_KEY`
- `ALLOWED_ORIGINS`
- `ANTHROPIC_API_KEY` if the AI chat should be enabled
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `NOTIFY_EMAIL_TO` if email notifications should be enabled
- `DB_PATH` if using SQLite
- `DATABASE_URL` after migrating to PostgreSQL

For production, `ALLOWED_ORIGINS` should include:

```text
https://najmuni.com,https://www.najmuni.com
```

## Render Notes

The current Render service is on the Free plan. Free web services can spin down after inactivity, which may delay the first request by 50 seconds or more.

SQLite on Render Free is not safe for important leads or reservations because the filesystem is not persistent. Data can disappear after restarts, redeploys, or instance changes.

Short-term options:

- Upgrade the backend service to Render Starter.
- Add a Persistent Disk.
- Set `DB_PATH=/var/data/najmuni.db`.

Recommended long-term option:

- Move from SQLite to PostgreSQL.
- Add `DATABASE_URL` to Render.
- Update the Flask database layer to use PostgreSQL.
- Keep leads, reservations, students, universities, institutes, and programs in PostgreSQL.

## Email Notifications

The backend can send an email whenever a visitor submits a lead or reservation form. Email notifications are optional: if SMTP variables are missing or email sending fails, the form still saves to the database.

Set these variables on the backend Render service:

```text
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=NajmUni <no-reply@example.com>
NOTIFY_EMAIL_TO=admin@example.com
```

`NOTIFY_EMAIL_TO` can contain more than one email, separated by commas.

## Handoff Checklist

Before giving the project to another developer:

1. Push the latest code changes to GitHub.
2. Do not commit `.env`.
3. Do not commit local SQLite database files unless the data is safe to share.
4. Share `.env.example`, not real secrets.
5. Tell the developer that production currently needs persistent storage or PostgreSQL.
6. Confirm Render build/start commands match the Flask backend, not the old Node backend.

## Git Safety

Do not commit:

- `.env`
- `node_modules`
- `client/dist`
- local database files in `data/*.db`
- `.run-logs`

These are already covered by `.gitignore`.

## Next Planned Infrastructure Work

The next important backend task is to replace SQLite with PostgreSQL for production reliability. Until then, use Render Starter + Persistent Disk if you need stable production data.
