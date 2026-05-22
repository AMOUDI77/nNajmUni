# NajmUni

NajmUni is a React/Vite frontend with a Flask API and SQLite database.

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

Set `ADMIN_KEY` to a long private password before using `/admin` or `/students`.

4. Run the app:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` and proxies API calls to Flask on `http://localhost:5000`.

## Production

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
- `ALLOWED_ORIGINS`
- `ANTHROPIC_API_KEY` if the AI chat should be enabled
- `DB_PATH` if the database path differs from `data/najmuni.db`

Do not commit `.env`, `node_modules`, `client/dist`, or local database files.
