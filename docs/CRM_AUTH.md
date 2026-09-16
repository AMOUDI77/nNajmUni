# CRM staff authentication

CRM uses separate staff identities. Existing `/admin` and `/students` access keys retain their existing scope.

Run explicit Alembic migrations against an isolated development database before testing. After the reviewed production migration, create the first owner with `python -m crm.create_owner` from `server/`. It prompts for the name/email and reads the password through a hidden prompt. It refuses to bootstrap a second owner. No password is seeded or hardcoded.

Passwords use Argon2id. Sessions are opaque random tokens held in an HttpOnly cookie; only SHA-256 token hashes are stored in PostgreSQL. Sessions expire after 12 hours, rotate on login and revoke on logout, staff deactivation, role changes or password reset. Production cookies are Secure, SameSite=Lax, host-only, with the `__Host-` prefix. Local development requires `CRM_ENV=development`; Render always uses production cookie behavior.

`POST /api/crm/auth/login`, `GET /api/crm/auth/me` and `POST /api/crm/auth/logout` provide the session lifecycle. The CSRF token returned by login/me belongs in the `X-CSRF-Token` header of subsequent writes. Keep it in React memory. The browser sends the session cookie with `credentials: include`. Cross-origin CRM clients must be explicitly listed in `CRM_ALLOWED_ORIGINS`; wildcard origins are refused. Deploy frontend and API on the same site (for example najmuni.com and api.najmuni.com), since SameSite=Lax does not permit cross-site fetch cookies.

Roles are OWNER, ADMIN, COUNSELOR and VIEWER. All active staff can read the single NajmUni workspace. Counselors can edit contact/inbox data; viewers cannot write. Owners and admins manage labels/team; only owners manage administrative accounts. Team changes revoke affected sessions. Staff cannot deactivate or demote themselves. A database-backed 15-minute login limit applies per normalized email and direct remote IP. Forwarded IP headers are not trusted; proxy traffic may share the IP ceiling. Security events record action metadata without passwords or tokens.

There is no public registration or email password-reset flow. An owner can set a temporary password through Team management, using a secure channel to give it to the staff member. MFA is not implemented in this foundation.
