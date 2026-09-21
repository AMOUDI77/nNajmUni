"""Explicit first-owner bootstrap. Password is read through a hidden prompt."""

import getpass

from sqlalchemy import select

from .auth import hasher, valid_email, valid_password
from .common import audit
from .schema_v1 import staff_users


def main():
    from app import DATABASE_ENGINE

    email = valid_email(input("Owner email: "))
    name = input("Full name: ").strip()
    if not name or len(name) > 120:
        raise SystemExit("A name of 1–120 characters is required")
    password = valid_password(getpass.getpass("Password (12+ characters): "))
    if getpass.getpass("Confirm password: ") != password:
        raise SystemExit("Passwords do not match")
    with DATABASE_ENGINE.begin() as conn:
        if conn.dialect.name == "postgresql":
            conn.exec_driver_sql("LOCK TABLE staff_users IN EXCLUSIVE MODE")
        if conn.execute(
            select(staff_users.c.id).where(staff_users.c.role == "OWNER")
        ).first():
            raise SystemExit("An owner already exists. Use CRM Team settings")
        uid = conn.execute(
            staff_users.insert().values(
                full_name=name,
                email=email,
                password_hash=hasher.hash(password),
                role="OWNER",
            )
        ).inserted_primary_key[0]
        audit(conn, uid, "auth.owner_bootstrapped", "staff", uid)
    print("Owner created. Sign in at /crm/login")


if __name__ == "__main__":
    main()
