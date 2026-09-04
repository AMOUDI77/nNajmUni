import hmac, sqlite3, os, re, time, smtplib
from email.message import EmailMessage
from functools import wraps
from flask import Flask, jsonify, request, g, send_from_directory
from flask_cors import CORS
import anthropic
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = int(os.environ.get('MAX_CONTENT_LENGTH', 1024 * 1024))

_HERE      = os.path.dirname(os.path.abspath(__file__))
if load_dotenv:
    load_dotenv(os.path.join(_HERE, '..', '.env'))
else:
    env_path = os.path.join(_HERE, '..', '.env')
    if os.path.isfile(env_path):
        with open(env_path, encoding='utf-8') as env_file:
            for line in env_file:
                line = line.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))

_origins = [o.strip() for o in os.environ.get('ALLOWED_ORIGINS', 'http://localhost:5173,http://localhost:4173').split(',') if o.strip()]
CORS(app, resources={r"/api/*": {"origins": _origins}})

DB_PATH    = os.environ.get('DB_PATH', os.path.join(_HERE, '..', 'data', 'najmuni.db'))
if not os.path.isabs(DB_PATH):
    DB_PATH = os.path.abspath(os.path.join(_HERE, DB_PATH))
_DIST      = os.path.join(_HERE, '..', 'client', 'dist')
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)

@app.after_request
def add_security_headers(response):
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'DENY')
    response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    response.headers.setdefault(
        'Content-Security-Policy',
        "default-src 'self'; "
        "script-src 'self'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: https:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'"
    )
    if request.is_secure:
        response.headers.setdefault('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    return response


# ── Static file serving (production) ─────────────────────────────────────────

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path.startswith('api/'):
        return jsonify(error='Not found'), 404
    if os.path.isdir(_DIST):
        full = os.path.join(_DIST, path)
        if path and os.path.isfile(full):
            return send_from_directory(_DIST, path)
        return send_from_directory(_DIST, 'index.html')
    return jsonify(error='Frontend not built'), 404


# ── DB helpers ────────────────────────────────────────────────────────────────

def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db

@app.teardown_appcontext
def close_db(_):
    db = g.pop('db', None)
    if db: db.close()

def rows(cur): return [dict(r) for r in cur.fetchall()]


# ── Notifications ─────────────────────────────────────────────────────────────

def email_notifications_enabled():
    return all([
        os.environ.get('SMTP_HOST', '').strip(),
        os.environ.get('SMTP_USER', '').strip(),
        os.environ.get('SMTP_PASS', '').strip(),
        os.environ.get('NOTIFY_EMAIL_TO', '').strip(),
    ])

def send_email_notification(subject, fields):
    if not email_notifications_enabled():
        return

    host = os.environ.get('SMTP_HOST', '').strip()
    port = int(os.environ.get('SMTP_PORT', '587'))
    user = os.environ.get('SMTP_USER', '').strip()
    password = os.environ.get('SMTP_PASS', '').strip()
    sender = os.environ.get('SMTP_FROM', user).strip()
    recipients = [
        item.strip()
        for item in os.environ.get('NOTIFY_EMAIL_TO', '').split(',')
        if item.strip()
    ]
    if not recipients:
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = sender
    msg['To'] = ', '.join(recipients)
    msg.set_content('\n'.join(f'{label}: {value or "-"}' for label, value in fields))

    try:
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.send_message(msg)
    except Exception as exc:
        app.logger.warning('Email notification failed: %s', exc)


# Lightweight in-memory throttling for public forms and access-key checks.
# It resets when the process restarts, which is fine for this single-server MVP.
_RATE_LIMITS = {}

def client_ip():
    forwarded = request.headers.get('X-Forwarded-For', '')
    if forwarded:
        return forwarded.split(',', 1)[0].strip()
    return request.remote_addr or 'unknown'

def rate_limit(bucket, limit=30, window=300):
    now = time.time()
    key = (bucket, client_ip())
    hits = [ts for ts in _RATE_LIMITS.get(key, []) if now - ts < window]
    if len(hits) >= limit:
        _RATE_LIMITS[key] = hits
        return jsonify(error='Too many requests. Please try again later.'), 429
    hits.append(now)
    _RATE_LIMITS[key] = hits
    return None


# ── Universities ──────────────────────────────────────────────────────────────

@app.get('/api/universities')
def list_universities():
    db   = get_db()
    q    = request.args.get('q', '')
    kind = request.args.get('type', '')
    sql  = 'SELECT * FROM universities WHERE 1=1'
    params = []
    if kind: sql += ' AND type=?';                                              params.append(kind)
    if q:    sql += ' AND (name LIKE ? OR abbr LIKE ? OR description LIKE ?)'; params += [f'%{q}%']*3
    sql += ' ORDER BY COALESCE(qs_ranking,9999), name'
    data  = rows(db.execute(sql, params))
    total = db.execute('SELECT COUNT(*) FROM universities').fetchone()[0]
    return jsonify(data=data, total=total)

@app.get('/api/universities/<int:uid>')
def get_university(uid):
    db = get_db()
    data = rows(db.execute('SELECT * FROM universities WHERE id=?', [uid]))
    if not data: return jsonify(error='Not found'), 404
    progs = rows(db.execute('SELECT * FROM programs WHERE university_id=? ORDER BY level,name', [uid]))
    return jsonify(**data[0], programs=progs)


@app.get('/api/institutes')
def list_institutes():
    db = get_db()
    q = request.args.get('q', '')
    kind = request.args.get('type', '')
    sql = 'SELECT * FROM institutes WHERE 1=1'
    params = []
    if kind:
        sql += ' AND type=?'
        params.append(kind)
    if q:
        sql += ' AND (name LIKE ? OR abbr LIKE ? OR description LIKE ?)'
        params += [f'%{q}%'] * 3
    sql += ' ORDER BY name'
    data = rows(db.execute(sql, params))
    total = db.execute('SELECT COUNT(*) FROM institutes').fetchone()[0]
    return jsonify(data=data, total=total)


# ── Programs ──────────────────────────────────────────────────────────────────

@app.get('/api/programs')
def list_programs():
    db    = get_db()
    field = request.args.get('field', '')
    level = request.args.get('level', '')
    uid   = request.args.get('university_id', '')
    q     = request.args.get('q', '')
    sql   = '''SELECT p.*, u.name AS university_name, u.abbr AS university_abbr,
                      u.location AS university_location
               FROM programs p JOIN universities u ON p.university_id=u.id WHERE 1=1'''
    params = []
    if field: sql += ' AND p.field=?';         params.append(field)
    if level: sql += ' AND p.level=?';         params.append(level)
    if uid:   sql += ' AND p.university_id=?'; params.append(int(uid))
    if q:     sql += ' AND (p.name LIKE ? OR p.description LIKE ?)'; params += [f'%{q}%']*2
    sql  += ' ORDER BY p.tuition_per_year'
    data   = rows(db.execute(sql, params))
    fields = [r[0] for r in db.execute('SELECT DISTINCT field FROM programs ORDER BY field')]
    return jsonify(data=data, fields=fields)


# ── Leads ─────────────────────────────────────────────────────────────────────

@app.post('/api/leads')
def create_lead():
    limited = rate_limit('leads', limit=8, window=300)
    if limited: return limited
    body   = request.get_json(silent=True) or {}
    phone  = body.get('phone', '').strip()
    name   = str(body.get('name', '')).strip()[:120]
    source = str(body.get('source', 'landing')).strip()[:80]
    normalized_phone = re.sub(r'[^\d+]', '', phone)
    if not normalized_phone or not re.match(r'^\+?\d{7,15}$', normalized_phone):
        return jsonify(error='Valid phone number required'), 400
    fields = {
        key: str(body.get(key, '')).strip()[:160]
        for key in ('nationality', 'study_level', 'specialization', 'qualification',
                    'grade', 'english_level', 'preferred_start', 'passport_ready',
                    'financial_readiness', 'preferred_university')
    }
    score = 10
    score += {'في أقرب وقت ممكن': 25, 'خلال 3–6 أشهر': 18, 'خلال 6–12 شهرًا': 8}.get(fields['preferred_start'], 0)
    score += {'نعم': 20, 'قيد التجهيز': 10}.get(fields['passport_ready'], 0)
    score += {'جاهز ماليًا لبدء الإجراءات': 30, 'أحتاج معرفة التكاليف أولًا': 12}.get(fields['financial_readiness'], 0)
    score += min(15, sum(bool(fields[key]) for key in ('nationality', 'study_level', 'specialization', 'qualification', 'english_level')) * 3)
    priority = 'high' if score >= 70 else 'medium' if score >= 40 else 'low'
    category = 'ready' if priority == 'high' else 'follow_up' if priority == 'medium' else 'inquiry'
    db = get_db()
    existing = db.execute('SELECT id FROM leads WHERE phone=?', [normalized_phone]).fetchone()
    values = [name or None, source, *fields.values(), score, priority, category]
    if existing:
        db.execute('''UPDATE leads SET name=?, source=?, nationality=?, study_level=?, specialization=?,
                   qualification=?, grade=?, english_level=?, preferred_start=?, passport_ready=?,
                   financial_readiness=?, preferred_university=?, score=?, priority=?, category=?, status='new', created_at=datetime('now')
                   WHERE id=?''', [*values, existing[0]])
    else:
        db.execute('''INSERT INTO leads
                   (phone,name,source,nationality,study_level,specialization,qualification,grade,
                    english_level,preferred_start,passport_ready,financial_readiness,preferred_university,score,priority,category)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                   [normalized_phone, name or None, source, *fields.values(), score, priority, category])
    db.commit()
    send_email_notification('New NajmUni lead', [
        ('Type', 'Lead'),
        ('Name', name),
        ('Phone', phone),
        ('Source', source),
        ('Priority', priority),
        ('Score', score),
        ('Study level', fields['study_level']),
        ('Specialization', fields['specialization']),
        ('Preferred university', fields['preferred_university']),
        ('Start', fields['preferred_start']),
        ('Financial readiness', fields['financial_readiness']),
    ])
    return jsonify(ok=True, existing=bool(existing), score=score, priority=priority)

@app.get('/api/leads/count')
def leads_count():
    cnt = get_db().execute('SELECT COUNT(*) FROM leads').fetchone()[0]
    return jsonify(count=cnt)

@app.get('/api/health')
def health(): return jsonify(ok=True)


# ── AI Chat ───────────────────────────────────────────────────────────────────

def build_system_prompt(db):
    unis = db.execute(
        'SELECT abbr, name, type, location, qs_ranking, tuition_min, tuition_max, description FROM universities ORDER BY name'
    ).fetchall()
    progs = db.execute(
        'SELECT p.name, p.field, p.level, p.tuition_per_year, p.duration_years, u.abbr FROM programs p JOIN universities u ON p.university_id=u.id'
    ).fetchall()

    uni_text = '\n'.join(
        f"- {r[0]} ({r[1]}) | {r[2]} | {r[3]} | QS:{r[4] or 'N/A'} | RM{r[5]:,}–{r[6]:,}/yr | {r[7][:80]}"
        for r in unis
    )
    prog_text = '\n'.join(
        f"- {r[5]}: {r[0]} | {r[1]} | {r[2]} | RM{r[3]:,}/yr | {r[4]}yrs"
        for r in progs
    )

    return f"""You are Najm AI, an expert Malaysian university admissions assistant for NajmUni - a platform helping international students study in Malaysia.

ABOUT NAJMUNI:
- Free service: admissions guidance, visa support, accommodation, scholarships
- Partner universities: 26 universities across Malaysia
- Response time: 24 hours

UNIVERSITY DATA (abbr | name | type | city | QS rank | tuition/yr | description):
{uni_text}

PROGRAMME DATA (university | programme | field | fee/yr | duration):
{prog_text}

INSTRUCTIONS:
- Be warm, helpful, and concise. Use short paragraphs, not walls of text.
- When recommending universities, always mention tuition range and location.
- For visa questions: mention offer letter, passport, medical exam, bank statement, 4-8 week processing.
- For application: 4-6 weeks, offer letter -> student pass -> arrive.
- Always end responses with a relevant question or offer to help further.
- Keep responses under 200 words unless detailed info is requested.
- You may use simple formatting: bullet points with *, bold with **, line breaks.
- If asked about something unrelated to Malaysian university admissions, politely redirect.
- Currency is Malaysian Ringgit (RM). Fees shown are per year.
- Suggest booking a free consultation for complex questions."""

@app.post('/api/chat')
def chat():
    limited = rate_limit('chat', limit=20, window=300)
    if limited: return limited
    body     = request.get_json(silent=True) or {}
    messages = body.get('messages', [])
    if not messages:
        return jsonify(error='No messages'), 400

    api_key = os.environ.get('ANTHROPIC_API_KEY', '')
    if not api_key:
        return jsonify(error='AI not configured'), 503

    try:
        db     = get_db()
        system = build_system_prompt(db)
        client = anthropic.Anthropic(api_key=api_key)
        resp   = client.messages.create(
            model='claude-haiku-4-5-20251001',
            max_tokens=350,
            system=system,
            messages=messages[-12:],  # keep last 12 turns for context
        )
        return jsonify(text=resp.content[0].text)
    except anthropic.APIError as e:
        return jsonify(error=str(e)), 502
    except Exception as e:
        return jsonify(error='AI error'), 500


# ── Admin auth ────────────────────────────────────────────────────────────────

ADMIN_KEY = os.environ.get('ADMIN_KEY', '').strip()
STUDENT_KEY = os.environ.get('STUDENT_KEY', '').strip()
VALID_STUDENT_STATUSES = {
    'new', 'counselling', 'application', 'documents',
    'visa', 'admitted', 'enrolled', 'rejected'
}
VALID_QUEUE_STATUSES = {'new', 'handled'}

def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        limited = rate_limit('admin-auth', limit=60, window=300)
        if limited: return limited
        if not ADMIN_KEY:
            return jsonify(error='ADMIN_KEY is not configured'), 503
        key = request.headers.get('X-Admin-Key', '')
        if not hmac.compare_digest(key, ADMIN_KEY):
            return jsonify(error='Unauthorized'), 401
        return f(*args, **kwargs)
    return decorated

def require_student_access(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        limited = rate_limit('student-auth', limit=60, window=300)
        if limited: return limited
        key = request.headers.get('X-Admin-Key', '')
        valid_admin = bool(ADMIN_KEY) and hmac.compare_digest(key, ADMIN_KEY)
        valid_student = bool(STUDENT_KEY) and hmac.compare_digest(key, STUDENT_KEY)
        if not ADMIN_KEY and not STUDENT_KEY:
            return jsonify(error='Access key is not configured'), 503
        if not (valid_admin or valid_student):
            return jsonify(error='Unauthorized'), 401
        return f(*args, **kwargs)
    return decorated


# ── Admin: stats ──────────────────────────────────────────────────────────────

@app.get('/api/admin/stats')
@require_admin
def admin_stats():
    db = get_db()
    unis  = db.execute('SELECT COUNT(*) FROM universities').fetchone()[0]
    institutes = db.execute('SELECT COUNT(*) FROM institutes').fetchone()[0]
    progs = db.execute('SELECT COUNT(*) FROM programs').fetchone()[0]
    leads = db.execute('SELECT COUNT(*) FROM leads').fetchone()[0]
    students = db.execute('SELECT COUNT(*) FROM students').fetchone()[0]
    new_today = db.execute(
        "SELECT COUNT(*) FROM leads WHERE date(created_at)=date('now')"
    ).fetchone()[0]
    pending = db.execute(
        "SELECT COUNT(*) FROM leads WHERE status='new'"
    ).fetchone()[0]
    return jsonify(universities=unis, institutes=institutes, programs=progs, leads=leads,
                   students=students, new_today=new_today, pending=pending)


# ── Admin: leads ──────────────────────────────────────────────────────────────

@app.get('/api/admin/leads')
@require_admin
def admin_list_leads():
    db = get_db()
    data = rows(db.execute(
        'SELECT * FROM leads ORDER BY created_at DESC'
    ))
    return jsonify(data=data)

@app.patch('/api/admin/leads/<int:lid>')
@require_admin
def admin_update_lead(lid):
    body   = request.get_json(silent=True) or {}
    status = body.get('status', 'handled')
    if status not in VALID_QUEUE_STATUSES:
        return jsonify(error='Invalid status'), 400
    db = get_db()
    db.execute('UPDATE leads SET status=? WHERE id=?', [status, lid])
    db.commit()
    return jsonify(ok=True)

@app.delete('/api/admin/leads/<int:lid>')
@require_admin
def admin_delete_lead(lid):
    db = get_db()
    db.execute('DELETE FROM leads WHERE id=?', [lid])
    db.commit()
    return jsonify(ok=True)


# ── Admin: universities ───────────────────────────────────────────────────────

@app.get('/api/admin/universities')
@require_admin
def admin_list_unis():
    db = get_db()
    data = rows(db.execute(
        '''SELECT u.*,
                  COUNT(p.id) AS programs_count
           FROM universities u
           LEFT JOIN programs p ON p.university_id=u.id
           GROUP BY u.id
           ORDER BY u.name'''
    ))
    return jsonify(data=data)

UNIVERSITY_TYPES = {'public', 'private', 'foreign_branch'}
UNIVERSITY_FIELDS = {
    'abbr', 'name', 'type', 'location', 'qs_ranking', 'color', 'description',
    'website', 'domain', 'tuition_min', 'tuition_max', 'established',
    'students_count'
}
UNIVERSITY_INT_FIELDS = {'qs_ranking', 'tuition_min', 'tuition_max', 'established', 'students_count'}

def clean_int(value):
    if value in (None, ''):
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError('Expected a number')

def clean_university_payload(body, partial=False):
    payload = {k: body.get(k) for k in UNIVERSITY_FIELDS if k in body}
    if not partial:
        for field in ('abbr', 'name', 'type', 'location'):
            if not str(payload.get(field, '')).strip():
                raise ValueError(f'{field} is required')

    cleaned = {}
    for key, value in payload.items():
        if key in UNIVERSITY_INT_FIELDS:
            cleaned[key] = clean_int(value)
        else:
            cleaned[key] = (value or '').strip() if isinstance(value, str) else value

    if 'type' in cleaned and cleaned['type'] not in UNIVERSITY_TYPES:
        raise ValueError('Invalid university type')
    if 'tuition_min' in cleaned and cleaned['tuition_min'] is None:
        cleaned['tuition_min'] = 0
    if 'tuition_max' in cleaned and cleaned['tuition_max'] is None:
        cleaned['tuition_max'] = 0
    if cleaned.get('tuition_min') is not None and cleaned.get('tuition_max') is not None:
        if cleaned['tuition_max'] < cleaned['tuition_min']:
            raise ValueError('Max tuition must be greater than min tuition')
    return cleaned

def get_admin_university_row(uid):
    db = get_db()
    row = db.execute(
        '''SELECT u.*,
                  (SELECT COUNT(*) FROM programs p WHERE p.university_id=u.id) AS programs_count
           FROM universities u
           WHERE u.id=?''',
        [uid]
    ).fetchone()
    return dict(row) if row else None

@app.post('/api/admin/universities')
@require_admin
def admin_create_uni():
    body = request.get_json(silent=True) or {}
    try:
        data = clean_university_payload(body)
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    for key, fallback in {
        'color': '#6D28D9',
        'description': '',
        'website': '',
        'domain': '',
        'tuition_min': 0,
        'tuition_max': 0,
        'established': None,
        'students_count': 0,
        'qs_ranking': None,
    }.items():
        data.setdefault(key, fallback)

    cols = list(data.keys())
    placeholders = ','.join('?' for _ in cols)
    db = get_db()
    cur = db.execute(
        f'INSERT INTO universities ({",".join(cols)}) VALUES ({placeholders})',
        [data[c] for c in cols]
    )
    db.commit()
    return jsonify(ok=True, university=get_admin_university_row(cur.lastrowid)), 201

@app.patch('/api/admin/universities/<int:uid>')
@require_admin
def admin_update_uni(uid):
    body = request.get_json(silent=True) or {}
    try:
        updates = clean_university_payload(body, partial=True)
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    if not updates:
        return jsonify(error='No valid fields'), 400
    sets = ', '.join(f'{k}=?' for k in updates)
    db = get_db()
    db.execute(f'UPDATE universities SET {sets} WHERE id=?', list(updates.values()) + [uid])
    db.commit()
    row = get_admin_university_row(uid)
    if not row:
        return jsonify(error='Not found'), 404
    return jsonify(ok=True, university=row)

@app.delete('/api/admin/universities/<int:uid>')
@require_admin
def admin_delete_uni(uid):
    db = get_db()
    db.execute('DELETE FROM programs WHERE university_id=?', [uid])
    db.execute('DELETE FROM universities WHERE id=?', [uid])
    db.commit()
    return jsonify(ok=True)


@app.get('/api/admin/institutes')
@require_admin
def admin_list_institutes():
    db = get_db()
    data = rows(db.execute('SELECT * FROM institutes ORDER BY name'))
    return jsonify(data=data)

INSTITUTE_TYPES = {'language', 'pathway', 'training'}
INSTITUTE_FIELDS = {
    'abbr', 'name', 'type', 'location', 'color', 'description',
    'website', 'domain', 'tuition_min', 'tuition_max', 'established',
    'students_count'
}
INSTITUTE_INT_FIELDS = {'tuition_min', 'tuition_max', 'established', 'students_count'}

def clean_institute_payload(body, partial=False):
    payload = {k: body.get(k) for k in INSTITUTE_FIELDS if k in body}
    if not partial:
        for field in ('abbr', 'name', 'type', 'location'):
            if not str(payload.get(field, '')).strip():
                raise ValueError(f'{field} is required')

    cleaned = {}
    for key, value in payload.items():
        if key in INSTITUTE_INT_FIELDS:
            cleaned[key] = clean_int(value)
        else:
            cleaned[key] = (value or '').strip() if isinstance(value, str) else value

    if 'type' in cleaned and cleaned['type'] not in INSTITUTE_TYPES:
        raise ValueError('Invalid institute type')
    if 'tuition_min' in cleaned and cleaned['tuition_min'] is None:
        cleaned['tuition_min'] = 0
    if 'tuition_max' in cleaned and cleaned['tuition_max'] is None:
        cleaned['tuition_max'] = 0
    if cleaned.get('tuition_min') is not None and cleaned.get('tuition_max') is not None:
        if cleaned['tuition_max'] < cleaned['tuition_min']:
            raise ValueError('Max tuition must be greater than min tuition')
    return cleaned

def get_admin_institute_row(iid):
    db = get_db()
    row = db.execute('SELECT * FROM institutes WHERE id=?', [iid]).fetchone()
    return dict(row) if row else None

@app.post('/api/admin/institutes')
@require_admin
def admin_create_institute():
    body = request.get_json(silent=True) or {}
    try:
        data = clean_institute_payload(body)
    except ValueError as exc:
        return jsonify(error=str(exc)), 400

    for key, fallback in {
        'color': '#4F6BFF',
        'description': '',
        'website': '',
        'domain': '',
        'tuition_min': 0,
        'tuition_max': 0,
        'established': None,
        'students_count': 0,
    }.items():
        data.setdefault(key, fallback)

    cols = list(data.keys())
    placeholders = ','.join('?' for _ in cols)
    db = get_db()
    cur = db.execute(
        f'INSERT INTO institutes ({",".join(cols)}) VALUES ({placeholders})',
        [data[c] for c in cols]
    )
    db.commit()
    return jsonify(ok=True, institute=get_admin_institute_row(cur.lastrowid)), 201

@app.patch('/api/admin/institutes/<int:iid>')
@require_admin
def admin_update_institute(iid):
    body = request.get_json(silent=True) or {}
    try:
        updates = clean_institute_payload(body, partial=True)
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    if not updates:
        return jsonify(error='No valid fields'), 400
    sets = ', '.join(f'{k}=?' for k in updates)
    db = get_db()
    db.execute(f'UPDATE institutes SET {sets} WHERE id=?', list(updates.values()) + [iid])
    db.commit()
    row = get_admin_institute_row(iid)
    if not row:
        return jsonify(error='Not found'), 404
    return jsonify(ok=True, institute=row)

@app.delete('/api/admin/institutes/<int:iid>')
@require_admin
def admin_delete_institute(iid):
    db = get_db()
    db.execute('DELETE FROM institutes WHERE id=?', [iid])
    db.commit()
    return jsonify(ok=True)

PROGRAM_FIELDS = {
    'name', 'level', 'duration_years', 'tuition_per_year', 'field', 'description', 'intake'
}

def clean_program_payload(body, partial=False):
    payload = {k: body.get(k) for k in PROGRAM_FIELDS if k in body}
    if not partial:
        for field in ('name', 'level', 'duration_years', 'tuition_per_year', 'field'):
            if body.get(field) in (None, ''):
                raise ValueError(f'{field} is required')
    cleaned = {}
    for key, value in payload.items():
        if key == 'duration_years':
            cleaned[key] = float(value)
        elif key == 'tuition_per_year':
            cleaned[key] = clean_int(value) or 0
        else:
            cleaned[key] = (value or '').strip() if isinstance(value, str) else value
    return cleaned

@app.get('/api/admin/universities/<int:uid>/programs')
@require_admin
def admin_list_programs(uid):
    db = get_db()
    data = rows(db.execute(
        'SELECT * FROM programs WHERE university_id=? ORDER BY field, level, name',
        [uid]
    ))
    return jsonify(data=data)

@app.post('/api/admin/universities/<int:uid>/programs')
@require_admin
def admin_create_program(uid):
    body = request.get_json(silent=True) or {}
    try:
        data = clean_program_payload(body)
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    db = get_db()
    cur = db.execute(
        '''INSERT INTO programs
           (university_id,name,level,duration_years,tuition_per_year,field,description,intake)
           VALUES (?,?,?,?,?,?,?,?)''',
        [uid, data['name'], data['level'], data['duration_years'],
         data['tuition_per_year'], data['field'], data.get('description', ''),
         data.get('intake', '')]
    )
    db.commit()
    program = dict(db.execute('SELECT * FROM programs WHERE id=?', [cur.lastrowid]).fetchone())
    return jsonify(ok=True, program=program), 201

@app.patch('/api/admin/programs/<int:pid>')
@require_admin
def admin_update_program(pid):
    body = request.get_json(silent=True) or {}
    try:
        updates = clean_program_payload(body, partial=True)
    except ValueError as exc:
        return jsonify(error=str(exc)), 400
    if not updates:
        return jsonify(error='No valid fields'), 400
    db = get_db()
    db.execute(
        f'UPDATE programs SET {", ".join(f"{k}=?" for k in updates)} WHERE id=?',
        list(updates.values()) + [pid]
    )
    db.commit()
    row = db.execute('SELECT * FROM programs WHERE id=?', [pid]).fetchone()
    if not row:
        return jsonify(error='Not found'), 404
    return jsonify(ok=True, program=dict(row))

@app.delete('/api/admin/programs/<int:pid>')
@require_admin
def admin_delete_program(pid):
    db = get_db()
    db.execute('DELETE FROM programs WHERE id=?', [pid])
    db.commit()
    return jsonify(ok=True)

# ── Reservations (public) ─────────────────────────────────────────────────────

@app.post('/api/reservations')
def create_reservation():
    limited = rate_limit('reservations', limit=6, window=300)
    if limited: return limited
    body  = request.get_json(silent=True) or {}
    name  = (body.get('name') or '').strip()
    email = (body.get('email') or '').strip()
    phone = (body.get('phone') or '').strip()
    if not name or not email or not phone:
        return jsonify(error='Name, email and phone are required'), 400
    if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return jsonify(error='Valid email required'), 400
    db = get_db()
    db.execute(
        'INSERT INTO reservations (name,email,phone,university,field,preferred_date,notes) VALUES (?,?,?,?,?,?,?)',
        [name, email, phone,
         body.get('university', ''), body.get('field', ''),
         body.get('preferred_date', ''), body.get('notes', '')]
    )
    db.commit()
    send_email_notification('New NajmUni reservation', [
        ('Type', 'Reservation'),
        ('Name', name),
        ('Email', email),
        ('Phone', phone),
        ('University', body.get('university', '')),
        ('Field', body.get('field', '')),
        ('Preferred date', body.get('preferred_date', '')),
        ('Notes', body.get('notes', '')),
    ])
    return jsonify(ok=True)


# ── Admin: reservations ───────────────────────────────────────────────────────

@app.get('/api/admin/reservations')
@require_admin
def admin_list_reservations():
    db   = get_db()
    data = rows(db.execute('SELECT * FROM reservations ORDER BY created_at DESC'))
    return jsonify(data=data)

@app.patch('/api/admin/reservations/<int:rid>')
@require_admin
def admin_update_reservation(rid):
    body   = request.get_json(silent=True) or {}
    status = body.get('status', 'handled')
    if status not in VALID_QUEUE_STATUSES:
        return jsonify(error='Invalid status'), 400
    db = get_db()
    db.execute('UPDATE reservations SET status=? WHERE id=?', [status, rid])
    db.commit()
    return jsonify(ok=True)

@app.delete('/api/admin/reservations/<int:rid>')
@require_admin
def admin_delete_reservation(rid):
    db = get_db()
    db.execute('DELETE FROM reservations WHERE id=?', [rid])
    db.commit()
    return jsonify(ok=True)


# Students (admin only)

@app.get('/api/students')
@require_student_access
def list_students():
    db = get_db()
    q      = request.args.get('q', '').strip()
    status = request.args.get('status', '').strip()
    sql    = 'SELECT * FROM students WHERE 1=1'
    params = []
    if q:
        sql += ' AND (full_name LIKE ? OR email LIKE ? OR nationality LIKE ? OR field LIKE ? OR university LIKE ?)'
        like = f'%{q}%'
        params += [like, like, like, like, like]
    if status:
        sql += ' AND status=?'
        params.append(status)
    sql += ' ORDER BY created_at DESC'
    data = rows(db.execute(sql, params))
    total = db.execute('SELECT COUNT(*) FROM students').fetchone()[0]
    by_status = rows(db.execute(
        "SELECT status, COUNT(*) as count FROM students GROUP BY status"
    ))
    return jsonify(data=data, total=total, by_status=by_status)


@app.post('/api/students')
@require_student_access
def create_student():
    body = request.get_json(silent=True) or {}
    name = (body.get('full_name') or '').strip()
    if not name:
        return jsonify(error='full_name is required'), 400
    status = body.get('status', 'new')
    if status not in VALID_STUDENT_STATUSES:
        return jsonify(error='Invalid status'), 400
    db = get_db()
    cur = db.execute(
        'INSERT INTO students (full_name,email,phone,nationality,field,university,status,notes) VALUES (?,?,?,?,?,?,?,?)',
        [name,
         (body.get('email') or '').strip(),
         (body.get('phone') or '').strip(),
         (body.get('nationality') or '').strip(),
         (body.get('field') or '').strip(),
         (body.get('university') or '').strip(),
         status,
         (body.get('notes') or '').strip()]
    )
    db.commit()
    student = dict(db.execute('SELECT * FROM students WHERE id=?', [cur.lastrowid]).fetchone())
    return jsonify(ok=True, student=student), 201


@app.patch('/api/students/<int:sid>')
@require_student_access
def update_student(sid):
    body = request.get_json(silent=True) or {}
    allowed = {'full_name', 'email', 'phone', 'nationality', 'field', 'university', 'status', 'notes'}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        return jsonify(error='No valid fields'), 400
    if 'status' in updates and updates['status'] not in VALID_STUDENT_STATUSES:
        return jsonify(error='Invalid status'), 400
    sets   = ', '.join(f'{k}=?' for k in updates)
    sets  += ', updated_at=datetime(\'now\')'
    values = list(updates.values()) + [sid]
    db = get_db()
    db.execute(f'UPDATE students SET {sets} WHERE id=?', values)
    db.commit()
    row = db.execute('SELECT * FROM students WHERE id=?', [sid]).fetchone()
    if not row:
        return jsonify(error='Not found'), 404
    student = dict(row)
    return jsonify(ok=True, student=student)


@app.delete('/api/students/<int:sid>')
@require_student_access
def delete_student(sid):
    db = get_db()
    db.execute('DELETE FROM students WHERE id=?', [sid])
    db.commit()
    return jsonify(ok=True)


# ── Schema + Seed ─────────────────────────────────────────────────────────────

def init_db():
    db = sqlite3.connect(DB_PATH)
    db.executescript('''
        CREATE TABLE IF NOT EXISTS universities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            abbr TEXT, name TEXT, type TEXT, location TEXT,
            qs_ranking INTEGER, color TEXT DEFAULT '#6D28D9',
            description TEXT, website TEXT, domain TEXT,
            tuition_min INTEGER, tuition_max INTEGER,
            established INTEGER, students_count INTEGER
        );
        CREATE TABLE IF NOT EXISTS programs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            university_id INTEGER, name TEXT, level TEXT,
            duration_years REAL, tuition_per_year INTEGER,
            field TEXT, description TEXT, intake TEXT
        );
        CREATE TABLE IF NOT EXISTS institutes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            abbr TEXT, name TEXT, type TEXT DEFAULT 'language',
            location TEXT, color TEXT DEFAULT '#4F6BFF',
            description TEXT, website TEXT, domain TEXT,
            tuition_min INTEGER DEFAULT 0, tuition_max INTEGER DEFAULT 0,
            established INTEGER, students_count INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT, phone TEXT, name TEXT, source TEXT DEFAULT 'landing',
            status TEXT DEFAULT 'new',
            nationality TEXT DEFAULT '', study_level TEXT DEFAULT '',
            specialization TEXT DEFAULT '', qualification TEXT DEFAULT '', grade TEXT DEFAULT '',
            english_level TEXT DEFAULT '', preferred_start TEXT DEFAULT '', passport_ready TEXT DEFAULT '',
            financial_readiness TEXT DEFAULT '', score INTEGER DEFAULT 0,
            preferred_university TEXT DEFAULT '',
            priority TEXT DEFAULT 'low', category TEXT DEFAULT 'inquiry',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
            university TEXT DEFAULT '', field TEXT DEFAULT '',
            preferred_date TEXT DEFAULT '', notes TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            nationality TEXT DEFAULT '',
            field TEXT DEFAULT '',
            university TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    ''')
    db.executescript('''
        CREATE INDEX IF NOT EXISTS idx_leads_email      ON leads(email);
        CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status);
        CREATE INDEX IF NOT EXISTS idx_leads_created    ON leads(created_at);
        CREATE INDEX IF NOT EXISTS idx_res_status       ON reservations(status);
        CREATE INDEX IF NOT EXISTS idx_res_created      ON reservations(created_at);
        CREATE INDEX IF NOT EXISTS idx_students_status  ON students(status);
        CREATE INDEX IF NOT EXISTS idx_students_created ON students(created_at);
        CREATE INDEX IF NOT EXISTS idx_programs_uni     ON programs(university_id);
        CREATE INDEX IF NOT EXISTS idx_programs_field   ON programs(field);
        CREATE INDEX IF NOT EXISTS idx_unis_type        ON universities(type);
        CREATE INDEX IF NOT EXISTS idx_institutes_type  ON institutes(type);
    ''')

    # migrate: add status/phone columns to leads if not present
    cols = [r[1] for r in db.execute("PRAGMA table_info(leads)").fetchall()]
    if 'status' not in cols:
        db.execute("ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'new'")
        db.commit()
    if 'phone' not in cols:
        db.execute("ALTER TABLE leads ADD COLUMN phone TEXT")
        db.commit()
    lead_migrations = {
        'nationality': "ALTER TABLE leads ADD COLUMN nationality TEXT DEFAULT ''",
        'study_level': "ALTER TABLE leads ADD COLUMN study_level TEXT DEFAULT ''",
        'specialization': "ALTER TABLE leads ADD COLUMN specialization TEXT DEFAULT ''",
        'qualification': "ALTER TABLE leads ADD COLUMN qualification TEXT DEFAULT ''",
        'grade': "ALTER TABLE leads ADD COLUMN grade TEXT DEFAULT ''",
        'english_level': "ALTER TABLE leads ADD COLUMN english_level TEXT DEFAULT ''",
        'preferred_start': "ALTER TABLE leads ADD COLUMN preferred_start TEXT DEFAULT ''",
        'passport_ready': "ALTER TABLE leads ADD COLUMN passport_ready TEXT DEFAULT ''",
        'financial_readiness': "ALTER TABLE leads ADD COLUMN financial_readiness TEXT DEFAULT ''",
        'preferred_university': "ALTER TABLE leads ADD COLUMN preferred_university TEXT DEFAULT ''",
        'score': "ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0",
        'priority': "ALTER TABLE leads ADD COLUMN priority TEXT DEFAULT 'low'",
        'category': "ALTER TABLE leads ADD COLUMN category TEXT DEFAULT 'inquiry'",
    }
    for col, stmt in lead_migrations.items():
        if col not in cols:
            db.execute(stmt)
    db.execute("CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone)")
    db.commit()

    # migrate: keep older university databases compatible with the admin editor
    uni_cols = [r[1] for r in db.execute("PRAGMA table_info(universities)").fetchall()]
    uni_migrations = {
        'color': "ALTER TABLE universities ADD COLUMN color TEXT DEFAULT '#6D28D9'",
        'description': "ALTER TABLE universities ADD COLUMN description TEXT DEFAULT ''",
        'website': "ALTER TABLE universities ADD COLUMN website TEXT DEFAULT ''",
        'domain': "ALTER TABLE universities ADD COLUMN domain TEXT DEFAULT ''",
        'tuition_min': "ALTER TABLE universities ADD COLUMN tuition_min INTEGER DEFAULT 0",
        'tuition_max': "ALTER TABLE universities ADD COLUMN tuition_max INTEGER DEFAULT 0",
        'established': "ALTER TABLE universities ADD COLUMN established INTEGER",
        'students_count': "ALTER TABLE universities ADD COLUMN students_count INTEGER DEFAULT 0",
    }
    for col, stmt in uni_migrations.items():
        if col not in uni_cols:
            db.execute(stmt)
    db.commit()

    # migrate: create reservations table if added after initial seed
    db.execute('''
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
            university TEXT DEFAULT '', field TEXT DEFAULT '',
            preferred_date TEXT DEFAULT '', notes TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            created_at TEXT DEFAULT (datetime('now'))
        )
    ''')
    db.commit()

    # migrate: students table for existing databases
    db.execute('''
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            nationality TEXT DEFAULT '',
            field TEXT DEFAULT '',
            university TEXT DEFAULT '',
            status TEXT DEFAULT 'new',
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    ''')
    db.commit()

    if db.execute('SELECT COUNT(*) FROM universities').fetchone()[0] == 0:
        seed(db)
    seed_institutes(db)
    db.close()


# (abbr, name, type, location, qs_ranking, color, description, website, domain, tuition_min, tuition_max, established, students_count)
UNIVERSITIES = [
    # ── Public universities ────────────────────────────────────────────────────
    ('UM',       'Universiti Malaya',                  'public',         'Kuala Lumpur',            65,   '#003580',
     "Malaysia's oldest and most prestigious university, ranked #1 nationally with 309-acre campus and world-class research facilities.",
     'https://www.um.edu.my',       'um.edu.my',        20000, 55000, 1949, 22000),

    ('USM',      'Universiti Sains Malaysia',           'public',         'Penang',                  134,  '#00539C',
     "A leading research university on scenic Penang island, excelling in science, technology, and health sciences.",
     'https://www.usm.my',          'usm.my',           18000, 45000, 1969, 28000),

    ('UPM',      'Universiti Putra Malaysia',           'public',         'Serdang, Selangor',       130,  '#006633',
     "Globally recognised for agriculture, environmental sciences, and engineering — with a stunning 1,200-acre campus.",
     'https://www.upm.edu.my',      'upm.edu.my',       18000, 42000, 1971, 27000),

    ('UTM',      'Universiti Teknologi Malaysia',       'public',         'Johor Bahru',             189,  '#003087',
     "Malaysia's leading engineering and technology university with campuses in Johor Bahru and Kuala Lumpur.",
     'https://www.utm.my',          'utm.my',           17000, 40000, 1904, 27000),

    ('UKM',      'Universiti Kebangsaan Malaysia',      'public',         'Bangi, Selangor',         163,  '#800020',
     "Malaysia's national university, renowned for its medical faculty, law school, and broad research excellence.",
     'https://www.ukm.my',          'ukm.my',           18000, 50000, 1970, 27000),

    ('UITM',     'Universiti Teknologi MARA',           'public',         'Shah Alam, Selangor',     None, '#8B0000',
     "Malaysia's largest university with 35+ campuses nationwide, offering the widest range of professional programmes.",
     'https://www.uitm.edu.my',     'uitm.edu.my',      8000,  25000, 1956, 170000),

    ('UNITEN',   'Universiti Tenaga Nasional',          'public',         'Kajang, Selangor',        None, '#1A237E',
     "An energy-focused technical university backed by Tenaga Nasional Berhad (TNB), Malaysia's national utility company.",
     'https://www.uniten.edu.my',   'uniten.edu.my',    15000, 35000, 1994, 8000),

    ('UMPSA',    'Universiti Malaysia Pahang Al-Sultan Abdullah', 'public', 'Gambang, Pahang',       None, '#006400',
     "A technical university excelling in engineering, manufacturing, and automotive programmes in the heart of Pahang.",
     'https://www.ump.edu.my',      'ump.edu.my',       10000, 28000, 2002, 10000),

    # ── Private universities ───────────────────────────────────────────────────
    ('MMU',      'Multimedia University',               'private',        'Cyberjaya',               None, '#1A4FA0',
     "Malaysia's first private university, specialising in technology, engineering, and creative multimedia in the Multimedia Super Corridor.",
     'https://www.mmu.edu.my',      'mmu.edu.my',       22000, 38000, 1999, 14000),

    ('APU',      'Asia Pacific University',             'private',        'Bukit Jalil, Kuala Lumpur', None, '#C8102E',
     "A top private tech-focused university with UK-validated degrees and students from 130+ countries — strong industry partnerships.",
     'https://www.apu.edu.my',      'apu.edu.my',       24000, 42000, 1993, 14000),

    ('UTAR',     'Universiti Tunku Abdul Rahman',       'private',        'Kampar, Perak',           None, '#E31837',
     "A non-profit private university offering affordable, high-quality education — consistently ranked among Malaysia's top private institutions.",
     'https://www.utar.edu.my',     'utar.edu.my',      15000, 32000, 2002, 22000),

    ("TAYLOR'S", "Taylor's University",                 'private',        'Subang Jaya, Selangor',   None, '#1B3A6B',
     "Top 3 private university in Malaysia — renowned for hospitality, law, business, and the American Degree Transfer Program.",
     'https://www.taylors.edu.my',  'taylors.edu.my',   28000, 55000, 1969, 17000),

    ('SUNWAY',   'Sunway University',                   'private',        'Subang Jaya, Selangor',   None, '#E87722',
     "A leading private university affiliated with Lancaster University UK, with strong business, medicine, and arts programmes.",
     'https://www.sunway.edu.my',   'sunway.edu.my',    25000, 50000, 1987, 10000),

    ('UNITAR',   'UNITAR International University',     'private',        'Kelana Jaya, Selangor',   None, '#6D28D9',
     "Malaysia's first fully online university, offering flexible post-graduate and professional programmes for working adults.",
     'https://www.unitar.my',       'unitar.my',        12000, 28000, 1997, 8000),

    ('INTI',     'INTI International University',       'private',        'Nilai, Negeri Sembilan',  None, '#D32F2F',
     "Part of the Laureate International Universities network — dual-award degrees with partners in Australia, UK, and the US.",
     'https://www.newinti.edu.my',  'newinti.edu.my',   18000, 40000, 1986, 15000),

    ('HELP',     'HELP University',                     'private',        'Kuala Lumpur',            None, '#1565C0',
     "Pioneer in psychology and law education in Malaysia, with strong twinning programmes at prestigious global universities.",
     'https://www.help.edu.my',     'help.edu.my',      18000, 38000, 1986, 7000),

    ('LINCOLN',  'Lincoln University College',          'private',        'Petaling Jaya, Selangor', None, '#8B0000',
     "An innovative private university offering a wide range of professional programmes — known for strong medicine and health sciences.",
     'https://www.lincoln.edu.my',  'lincoln.edu.my',   15000, 35000, 2002, 8000),

    ('MAHSA',    'MAHSA University',                    'private',        'Bandar Saujana Putra, Selangor', None, '#0D47A1',
     "A health sciences-focused university with comprehensive medical, dental, pharmacy, and nursing programmes.",
     'https://www.mahsa.edu.my',    'mahsa.edu.my',     18000, 45000, 2005, 6000),

    ('CYBERJAYA','University of Cyberjaya',             'private',        'Cyberjaya, Selangor',     None, '#00796B',
     "A health and technology-focused university in the heart of Malaysia's Silicon Valley — Cyberjaya.",
     'https://www.unicyberjaya.edu.my','unicyberjaya.edu.my',15000,38000, 2005, 5000),

    ('IUKL',     'Infrastructure University Kuala Lumpur','private',      'Kajang, Selangor',        None, '#F57F17',
     "A specialised university focused on engineering, architecture, and infrastructure with strong industry-linked programmes.",
     'https://www.iukl.edu.my',     'iukl.edu.my',      14000, 30000, 1999, 5000),

    ('CITY',     'City University Malaysia',            'private',        'Petaling Jaya, Selangor', None, '#311B92',
     "A private university offering professional programmes in business, law, engineering, and creative arts.",
     'https://www.city.edu.my',     'city.edu.my',      13000, 28000, 1984, 5000),

    ('NILAI',    'Nilai University',                    'private',        'Nilai, Negeri Sembilan',  None, '#BF360C',
     "A comprehensive private university offering a diverse range of programmes from foundation to postgraduate level.",
     'https://www.nilai.edu.my',    'nilai.edu.my',     12000, 30000, 1997, 6000),

    ('SEGI',     'SEGi University',                     'private',        'Kota Damansara, Selangor', None,'#880E4F',
     "One of Malaysia's largest private universities with campuses nationwide — strong focus on medicine, dentistry, and business.",
     'https://www.segi.edu.my',     'segi.edu.my',      14000, 35000, 1977, 20000),

    ('UNICAM',   'University College of Aviation Malaysia','private',     'Subang, Selangor',        None, '#01579B',
     "Malaysia's premier aviation university — the only institution offering a fully integrated aviation degree with real flight training.",
     'https://www.unicam.edu.my',   'unicam.edu.my',    25000, 55000, 2007, 2000),

    ('GEOMATIKA','Geomatika University College',        'private',        'Kuala Lumpur',            None, '#2E7D32',
     "Specialised in geoinformation, surveying, urban planning, and environmental management — unique in Malaysia.",
     'https://www.geomatika.edu.my','geomatika.edu.my', 12000, 25000, 1997, 2000),

    # ── Foreign branch ─────────────────────────────────────────────────────────
    ('HWU',      'Heriot-Watt University Malaysia',     'foreign_branch', 'Putrajaya',               301,  '#7B1FA2',
     "The Malaysian campus of Scotland's prestigious Heriot-Watt University — earn a UK degree in Malaysia at a fraction of UK costs.",
     'https://www.hw.ac.uk/malaysia','hw.ac.uk',         35000, 60000, 2014, 4000),
]

# (uni_abbr, name, level, duration, fee/yr, field, description, intake)
PROGRAMS = [
    ('UM',      'Bachelor of Computer Science',              'bachelor', 3,   22000, 'Technology',    'Comprehensive CS covering AI, systems, networks and software engineering.',                              'Feb, Jul'),
    ('UM',      'Bachelor of Medicine (MBBS)',               'bachelor', 5,   52000, 'Medicine',      "One of Asia's most respected medical degrees, fully accredited by the Malaysian Medical Council.",      'Feb'),
    ('UM',      'Bachelor of Engineering (Electrical)',      'bachelor', 4,   25000, 'Engineering',   'Rigorous electrical engineering with strong industry partnerships.',                                     'Feb, Sep'),
    ('UM',      'Master of Business Administration',         'master',   1.5, 28000, 'Business',      'Full-time and part-time MBA for professionals accelerating their careers.',                              'Feb, Jul'),
    ('UM',      'Bachelor of Laws (LLB)',                    'bachelor', 3,   24000, 'Law',           'Internationally recognised law degree with mooting competitions and a strong alumni network.',           'Feb'),
    ('USM',     'Bachelor of Computer Science',              'bachelor', 3,   19000, 'Technology',    'Strong foundation with electives in AI, cybersecurity and data science.',                               'Feb, Jul'),
    ('USM',     'Bachelor of Pharmacy',                      'bachelor', 4,   26000, 'Medicine',      'Fully accredited pharmacy programme recognised across ASEAN and the Middle East.',                      'Feb'),
    ('USM',     'Bachelor of Engineering (Mechanical)',      'bachelor', 4,   21000, 'Engineering',   'Thermal, manufacturing, and materials streams with modern lab facilities.',                             'Feb, Jul'),
    ('UPM',     'Bachelor of Computer Science',              'bachelor', 4,   19000, 'Technology',    "Research-oriented CS degree with access to UPM's high-performance computing lab.",                     'Sep'),
    ('UPM',     'Bachelor of Agricultural Science',          'bachelor', 4,   18000, 'Science',       "World-class agri-science programme underpinned by UPM's 1,200-acre working farm.",                     'Sep'),
    ('UPM',     'Doctor of Veterinary Medicine',             'bachelor', 5,   30000, 'Medicine',      'One of only two veterinary programmes in Malaysia, with a dedicated teaching hospital.',                'Sep'),
    ('UTM',     'Bachelor of Electrical Engineering',        'bachelor', 4,   20000, 'Engineering',   'Power systems, electronics, and telecommunications in a fully equipped lab.',                           'Feb, Sep'),
    ('UTM',     'Bachelor of Civil Engineering',             'bachelor', 4,   20000, 'Engineering',   'Structures, geotechnics, and hydraulics — shaping the infrastructure of tomorrow.',                    'Feb, Sep'),
    ('UTM',     'Master of Science (Data Science)',          'master',   1.5, 22000, 'Technology',    "Industry-driven data science master's in machine learning, big data, and analytics.",                   'Feb, Sep'),
    ('UKM',     'Bachelor of Medicine (MBBS)',               'bachelor', 5,   48000, 'Medicine',      'UKM Medical Faculty is one of the most respected in Southeast Asia with an on-campus teaching hospital.','Feb'),
    ('UKM',     'Bachelor of Laws (LLB)',                    'bachelor', 3,   22000, 'Law',           'Nationally recognised law degree with a strong focus on Malaysian and Islamic law.',                   'Feb, Sep'),
    ('UNITEN',  'Bachelor of Electrical & Electronics Engineering','bachelor',4,20000,'Engineering',  'Industry-backed EEE programme with direct links to TNB and the national power sector.',                 'Feb, Sep'),
    ('UNITEN',  'Bachelor of Computer Science',              'bachelor', 4,   20000, 'Technology',    "Highly regarded CS programme recommended by APU and industry — strong graduate employability.",          'Feb, Sep'),
    ('UMPSA',   'Bachelor of Mechanical Engineering',        'bachelor', 4,   16000, 'Engineering',   "Specialised automotive and manufacturing streams — UMPSA is home to Malaysia's automotive research hub.",'Feb, Sep'),
    ('UMPSA',   'Bachelor of Chemical Engineering',          'bachelor', 4,   16000, 'Engineering',   'Focused on process, petroleum, and green chemistry engineering.',                                        'Feb, Sep'),
    ('MMU',     'Bachelor of Computer Science (AI)',         'bachelor', 3,   24000, 'Technology',    'Specialised AI curriculum with deep learning, computer vision, and NLP modules.',                       'Feb, Jul, Sep'),
    ('MMU',     'Bachelor of Multimedia Design',             'bachelor', 3,   23000, 'Arts & Design', 'Creative programme blending graphic design, motion graphics, UX, and digital storytelling.',            'Feb, Jul, Sep'),
    ('MMU',     'Bachelor of Game Development',              'bachelor', 3,   24000, 'Technology',    'End-to-end game development from concept to engine programming — Unity and Unreal.',                   'Feb, Jul'),
    ('APU',     'Bachelor of Software Engineering',          'bachelor', 3,   26000, 'Technology',    'UK-validated degree with agile methodology, DevOps, and enterprise software tracks.',                   'Feb, Jul, Sep'),
    ('APU',     'Bachelor of Cybersecurity',                 'bachelor', 3,   27000, 'Technology',    'Hands-on ethical hacking, network security, and digital forensics in purpose-built cyber labs.',        'Feb, Jul, Sep'),
    ('APU',     'Bachelor of Business Management',           'bachelor', 3,   24000, 'Business',      'International business management with a compulsory industry placement semester.',                       'Feb, Jul, Sep'),
    ('UTAR',    'Bachelor of Computer Science',              'bachelor', 3,   16000, 'Technology',    "Affordable, high-quality CS degree with a strong alumni network in Malaysia's tech industry.",          'Feb, Jun, Oct'),
    ('UTAR',    'Bachelor of Accounting',                    'bachelor', 3,   15000, 'Business',      'ACCA and ICAEW-exemption programme preparing students for global accounting careers.',                  'Feb, Jun, Oct'),
    ("TAYLOR'S",'Bachelor of Culinary Arts',                 'bachelor', 3,   36000, 'Hospitality',   "Asia's best culinary arts school with professional kitchens and international chef mentors.",           'Feb, Jul'),
    ("TAYLOR'S",'Bachelor of Laws (LLB)',                    'bachelor', 3,   34000, 'Law',           'Highly regarded law programme with mooting, internship placements and UK-validated recognition.',       'Feb, Jul'),
    ("TAYLOR'S",'American Degree Transfer Program',          'diploma',  2,   30000, 'Business',      'Transfer to top US universities (UCLA, Michigan, UT) after 2 years in Malaysia.',                      'Feb, Jul, Sep'),
    ('SUNWAY',  'Bachelor of Business (Accounting)',         'bachelor', 3,   28000, 'Business',      'Lancaster University-affiliated degree with strong ACCA-exemption pathways.',                           'Feb, Jul, Sep'),
    ('SUNWAY',  'Bachelor of Medicine (MBBS)',               'bachelor', 5,   48000, 'Medicine',      'A fully accredited medical programme with clinical training at Sunway Medical Centre.',                 'Feb'),
    ('INTI',    'Bachelor of Computer Science',              'bachelor', 3,   22000, 'Technology',    'Dual-award degree with Coventry University UK — two degrees for the price of one.',                     'Feb, Jul, Sep'),
    ('INTI',    'Bachelor of Business Administration',       'bachelor', 3,   20000, 'Business',      'Partnered with Coventry University for regional and international recognition.',                        'Feb, Jul, Sep'),
    ('HELP',    'Bachelor of Psychology',                    'bachelor', 3,   22000, 'Social Science',"HELP is Malaysia's pioneer in psychology education — accredited and industry-connected.",               'Feb, Jul, Sep'),
    ('HELP',    'Bachelor of Laws (LLB)',                    'bachelor', 3,   24000, 'Law',           'Twinning options with UK universities and a strong Bar exam pass rate.',                               'Feb, Jul'),
    ('LINCOLN', 'Bachelor of Medicine (MBBS)',               'bachelor', 5,   40000, 'Medicine',      'Fully accredited medical programme with comprehensive clinical training across partner hospitals.',      'Feb, Sep'),
    ('LINCOLN', 'Bachelor of Pharmacy',                      'bachelor', 4,   28000, 'Medicine',      'Pharmacy programme with industry placements at leading Malaysian pharmaceutical companies.',            'Feb, Sep'),
    ('MAHSA',   'Bachelor of Medicine (MBBS)',               'bachelor', 5,   45000, 'Medicine',      "MAHSA's flagship medical degree — comprehensive clinical training in their own teaching hospital.",     'Feb'),
    ('MAHSA',   'Bachelor of Dental Surgery',                'bachelor', 5,   48000, 'Medicine',      "One of Malaysia's most respected dental programmes with a fully equipped dental clinic.",               'Feb'),
    ('MAHSA',   'Bachelor of Nursing',                       'bachelor', 4,   22000, 'Medicine',      'Comprehensive nursing degree with clinical placements across major Malaysian hospitals.',               'Feb, Sep'),
    ('CYBERJAYA','Bachelor of Medicine (MBBS)',              'bachelor', 5,   42000, 'Medicine',      'A modern medical programme with a focus on community health and digital medicine.',                     'Feb'),
    ('CYBERJAYA','Bachelor of Computer Science',             'bachelor', 3,   20000, 'Technology',    'Technology-driven CS programme in the heart of Malaysia\'s tech hub, Cyberjaya.',                      'Feb, Sep'),
    ('IUKL',    'Bachelor of Civil Engineering',             'bachelor', 4,   18000, 'Engineering',   'Infrastructure-focused civil engineering with real project exposure from year one.',                    'Feb, Sep'),
    ('IUKL',    'Bachelor of Architecture',                  'bachelor', 5,   22000, 'Engineering',   'Accredited architecture degree with strong design studios and international exposure.',                 'Feb, Sep'),
    ('CITY',    'Bachelor of Business Administration',       'bachelor', 3,   15000, 'Business',      'Professional business degree with twinning options and strong industry mentorship.',                   'Feb, Jul, Sep'),
    ('CITY',    'Bachelor of Laws (LLB)',                    'bachelor', 3,   18000, 'Law',           'Recognised law degree with a strong focus on corporate and commercial law.',                           'Feb, Jul'),
    ('NILAI',   'Bachelor of Business Administration',       'bachelor', 3,   14000, 'Business',      'Affordable business degree with a wide range of specialisations and industry exposure.',               'Feb, Jul, Sep'),
    ('NILAI',   'Bachelor of Information Technology',        'bachelor', 3,   15000, 'Technology',    'Hands-on IT programme covering software development, networking, and cybersecurity.',                  'Feb, Jul, Sep'),
    ('SEGI',    'Bachelor of Medicine (MBBS)',               'bachelor', 5,   38000, 'Medicine',      "SEGi's flagship medical degree — taught at the SEGi University Medical School in partnership with UK institutions.", 'Feb'),
    ('SEGI',    'Bachelor of Dental Surgery',                'bachelor', 5,   40000, 'Medicine',      'Comprehensive dental programme with a fully equipped dental teaching hospital.',                        'Feb'),
    ('SEGI',    'Bachelor of Business Administration',       'bachelor', 3,   16000, 'Business',      'Professional business programme with a focus on entrepreneurship and digital marketing.',              'Feb, Jul, Sep'),
    ('UNICAM',  'Bachelor of Science (Aviation Management)', 'bachelor', 4,   35000, 'Engineering',   'The only programme in Malaysia combining aviation theory with actual pilot flight training hours.',      'Feb, Sep'),
    ('UNICAM',  'Bachelor of Engineering (Aeronautical)',    'bachelor', 4,   40000, 'Engineering',   'Aeronautical engineering with access to Malaysia\'s only university-owned aircraft fleet.',             'Feb, Sep'),
    ('HWU',     'Bachelor of Engineering (Petroleum)',       'bachelor', 4,   42000, 'Engineering',   'UK degree with strong ties to the oil & gas industry — PETRONAS and Shell partnerships.',              'Feb, Sep'),
    ('HWU',     'Bachelor of Business Management',          'bachelor', 4,   38000, 'Business',      "Same Heriot-Watt UK degree, earned in Malaysia for a fraction of Edinburgh's costs.",                  'Feb, Sep'),
]


# (abbr, name, type, location, color, description, website, domain, tuition_min, tuition_max, established, students_count)
INSTITUTES = [
    ('BIGBEN', 'Big Ben Education Group', 'language', 'Kuala Lumpur', '#1D4ED8',
     'English language, IELTS preparation, and education pathway support for students preparing to study in Malaysia.',
     'https://www.bigben.edu.my', 'bigben.edu.my', 0, 0, None, 0),
    ('BRIGHT', 'Bright Language Center', 'language', 'Kuala Lumpur', '#F59E0B',
     'English language centre in Malaysia offering practical English programmes for international learners.',
     'https://bright.edu.my', 'bright.edu.my', 0, 0, None, 0),
    ('EMS', 'EMS Language Centre', 'language', 'Kuala Lumpur', '#10B981',
     'English courses, placement support, and intensive language programmes for international learners.',
     'https://ems.edu.my', 'ems.edu.my', 0, 0, 2011, 0),
    ('ELEC', 'ELEC Language Center', 'language', 'Kuala Lumpur', '#2563EB',
     'English language school in Kuala Lumpur with intensive courses and student support services.',
     'https://elec.edu.my', 'elec.edu.my', 0, 0, None, 0),
    ('SHEFFIELD', 'Sheffield Academy', 'training', 'Kuala Lumpur', '#7C3AED',
     'Kuala Lumpur academy offering English programmes and training pathways for students and professionals.',
     'https://sheffield.edu.my', 'sheffield.edu.my', 0, 0, 2010, 0),
    ('British Council', 'British Council Malaysia', 'language', 'Kuala Lumpur', '#4F6BFF',
     'English language testing, IELTS preparation, and academic English support for international students.',
     'https://www.britishcouncil.my', 'britishcouncil.org', 0, 0, 1948, 0),
    ('ELS', 'ELS Language Centres Malaysia', 'language', 'Kuala Lumpur', '#7B61FF',
     'English pathway programmes and language preparation for students planning to study in Malaysia.',
     'https://www.els.edu.my', 'els.edu.my', 0, 0, 1990, 0),
]


def seed(db):
    uni_map = {}
    for row in UNIVERSITIES:
        cur = db.execute(
            'INSERT INTO universities (abbr,name,type,location,qs_ranking,color,description,website,domain,tuition_min,tuition_max,established,students_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
            row
        )
        uni_map[row[0]] = cur.lastrowid

    for prog in PROGRAMS:
        abbr, name, level, dur, fee, field, desc, intake = prog
        uid = uni_map.get(abbr)
        if uid:
            db.execute(
                'INSERT INTO programs (university_id,name,level,duration_years,tuition_per_year,field,description,intake) VALUES (?,?,?,?,?,?,?,?)',
                [uid, name, level, dur, fee, field, desc, intake]
            )
    db.commit()
    print(f'Seeded {len(UNIVERSITIES)} universities and {len(PROGRAMS)} programs')


def seed_institutes(db):
    for row in INSTITUTES:
        existing = db.execute(
            'SELECT id FROM institutes WHERE lower(abbr)=lower(?) OR lower(name)=lower(?)',
            [row[0], row[1]]
        ).fetchone()
        if existing:
            db.execute(
                '''UPDATE institutes
                   SET abbr=?, name=?, type=?, location=?, color=?, description=?, website=?, domain=?,
                       tuition_min=?, tuition_max=?, established=?, students_count=?
                   WHERE id=?''',
                [*row, existing[0]]
            )
        else:
            db.execute(
                'INSERT INTO institutes (abbr,name,type,location,color,description,website,domain,tuition_min,tuition_max,established,students_count) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
                row
            )
    db.commit()
    print(f'Ensured {len(INSTITUTES)} institutes')


init_db()  # runs on every startup (gunicorn + dev)

if __name__ == '__main__':
    port  = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    print(f'NajmUni Flask API running at http://0.0.0.0:{port}')
    app.run(host='0.0.0.0', port=port, debug=debug)
