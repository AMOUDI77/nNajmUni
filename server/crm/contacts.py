"""Contact context, explicit CRM links and private staff notes."""

import re
from decimal import Decimal, InvalidOperation

from flask import Blueprint, g, jsonify, request
from sqlalchemy import delete, or_, select, update
from werkzeug.exceptions import BadRequest, NotFound

from .auth import require_staff
from .common import audit, body, engine, now, output, page_limit, query_id, string
from .schema_v1 import (
    campaigns,
    contact_labels,
    contacts,
    conversations,
    identities,
    labels,
    memory,
    metadata,
    notes,
    staff_users,
    touchpoints,
)
from .search import CONTACT_SEARCH, IDENTITY_SEARCH, text_matches

api = Blueprint("crm_contacts", __name__, url_prefix="/api/crm")
EDIT = ("OWNER", "ADMIN", "COUNSELOR")
FIELDS = (
    "display_name",
    "preferred_language",
    "nationality",
    "country",
    "email",
    "phone",
    "degree_level",
    "program_interests",
    "target_intake",
    "budget_currency",
    "english_status",
    "university_interests",
    "main_concerns",
)
STAGES = (
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "COUNSELING",
    "DOCUMENTS",
    "APPLICATION",
    "OFFER",
    "VISA",
    "ENROLLED",
    "LOST",
)


def get_contact(conn, cid, lock=False):
    query = select(contacts).where(contacts.c.id == cid)
    row = conn.execute(query.with_for_update() if lock else query).mappings().first()
    if row is None:
        raise NotFound("Contact not found")
    return dict(row)


def contact_values(data):
    values = {
        k: string(data, k, 2000 if k == "main_concerns" else 500, k == "display_name")
        for k in FIELDS
        if k in data
    }
    if "stage" in data:
        if data["stage"] not in STAGES:
            raise BadRequest("Invalid CRM stage")
        values["stage"] = data["stage"]
    if "budget_amount" in data:
        try:
            val = (
                Decimal(str(data["budget_amount"]))
                if data["budget_amount"] is not None
                else None
            )
            if val is not None and (
                not val.is_finite() or not 0 <= val < Decimal("1000000000000")
            ):
                raise ValueError()
            values["budget_amount"] = val
        except (InvalidOperation, ValueError):
            raise BadRequest("Invalid budget")
    return values


@api.get("/contacts")
@require_staff()
def list_contacts():
    query = select(contacts)
    q = request.args.get("q", "").strip()[:200]
    if q:
        pattern = (
            "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        )
        identity_match = select(identities.c.contact_id).where(
            identities.c.username.ilike(pattern, escape="\\")
        )
        if engine().dialect.name == "postgresql":
            query = query.where(
                or_(
                    text_matches(CONTACT_SEARCH, q),
                    contacts.c.id.in_(
                        select(identities.c.contact_id).where(
                            text_matches(IDENTITY_SEARCH, q)
                        )
                    ),
                )
            )
        else:
            query = query.where(
                or_(
                    *[
                        contacts.c[k].ilike(pattern, escape="\\")
                        for k in ("display_name", "email", "phone")
                    ],
                    contacts.c.id.in_(identity_match),
                )
            )
    for key in ("stage", "country", "assigned_to"):
        if request.args.get(key):
            query = query.where(
                contacts.c[key]
                == (query_id(key) if key == "assigned_to" else request.args[key])
            )
    if request.args.get("program"):
        query = query.where(
            contacts.c.program_interests.ilike(
                "%" + request.args["program"][:100] + "%"
            )
        )
    if request.args.get("label"):
        query = query.where(
            contacts.c.id.in_(
                select(contact_labels.c.contact_id).where(
                    contact_labels.c.label_id == query_id("label")
                )
            )
        )
    if request.args.get("source"):
        query = query.where(
            contacts.c.id.in_(
                select(touchpoints.c.contact_id).where(
                    touchpoints.c.campaign_source_id == query_id("source")
                )
            )
        )
    try:
        before = int(request.args.get("before", "0"))
    except ValueError:
        raise BadRequest("Invalid cursor")
    if before:
        query = query.where(contacts.c.id < before)
    limit = page_limit()
    with engine().connect() as conn:
        rows = (
            conn.execute(query.order_by(contacts.c.id.desc()).limit(limit + 1))
            .mappings()
            .all()
        )
    return output(
        {
            "items": rows[:limit],
            "next_cursor": rows[limit - 1]["id"] if len(rows) > limit else None,
        }
    )


@api.get("/sources")
@require_staff()
def list_sources():
    with engine().connect() as conn:
        return output(
            conn.execute(
                select(campaigns.c.id, campaigns.c.campaign_name)
                .order_by(campaigns.c.id.desc())
                .limit(200)
            )
            .mappings()
            .all()
        )


@api.post("/contacts")
@require_staff(*EDIT)
def create_contact():
    data = body()
    values = contact_values(data)
    if not values.get("display_name"):
        raise BadRequest("Display name is required")
    with engine().begin() as conn:
        cid = conn.execute(
            contacts.insert().values(**values, updated_at=now())
        ).inserted_primary_key[0]
        audit(conn, g.staff["id"], "contact.created", "contact", cid)
    return output({"id": cid}, 201)


@api.get("/contacts/<int:cid>")
@require_staff()
def contact_detail(cid):
    with engine().connect() as conn:
        result = get_contact(conn, cid)
        result["identities"] = (
            conn.execute(select(identities).where(identities.c.contact_id == cid))
            .mappings()
            .all()
        )
        result["labels"] = (
            conn.execute(
                select(labels)
                .join(contact_labels, labels.c.id == contact_labels.c.label_id)
                .where(contact_labels.c.contact_id == cid)
            )
            .mappings()
            .all()
        )
        result["conversations"] = (
            conn.execute(
                select(conversations)
                .where(conversations.c.contact_id == cid)
                .order_by(conversations.c.id.desc())
                .limit(50)
            )
            .mappings()
            .all()
        )
        result["notes"] = (
            conn.execute(
                select(notes, staff_users.c.full_name.label("author_name"))
                .join(staff_users, notes.c.author_id == staff_users.c.id)
                .where(notes.c.contact_id == cid, notes.c.deleted_at.is_(None))
                .order_by(notes.c.id.desc())
                .limit(50)
            )
            .mappings()
            .all()
        )
        result["touchpoints"] = (
            conn.execute(
                select(touchpoints, campaigns.c.campaign_name, campaigns.c.media_id)
                .outerjoin(
                    campaigns, touchpoints.c.campaign_source_id == campaigns.c.id
                )
                .where(touchpoints.c.contact_id == cid)
                .order_by(touchpoints.c.id.desc())
                .limit(50)
            )
            .mappings()
            .all()
        )
        result["memory"] = (
            conn.execute(
                select(memory)
                .where(memory.c.contact_id == cid)
                .order_by(memory.c.id.desc())
                .limit(50)
            )
            .mappings()
            .all()
        )
        for kind in ("lead", "student"):
            table = metadata.tables[kind + "s"]
            result[kind] = (
                conn.execute(select(table).where(table.c.id == result[kind + "_id"]))
                .mappings()
                .first()
                if result[kind + "_id"]
                else None
            )
    return output(result)


@api.patch("/contacts/<int:cid>")
@require_staff(*EDIT)
def edit_contact(cid):
    values = contact_values(body())
    with engine().begin() as conn:
        existing = get_contact(conn, cid, True)
        conn.execute(
            update(contacts)
            .where(contacts.c.id == cid)
            .values(**values, updated_at=now())
        )
        audit(
            conn, g.staff["id"], "contact.updated", "contact", cid, fields=list(values)
        )
        tracked = {
            "degree_level": "Degree Level",
            "program_interests": "Program",
            "target_intake": "Intake",
            "country": "Country",
        }
        vid = conn.execute(
            select(conversations.c.id)
            .where(conversations.c.contact_id == cid)
            .order_by(conversations.c.last_message_at.desc(), conversations.c.id.desc())
            .limit(1)
        ).scalar_one_or_none()
        if vid:
            from .inbox import add_event

            for field, label in tracked.items():
                if field in values and values[field] and values[field] != existing[field]:
                    add_event(
                        conn,
                        vid,
                        "contact_field_saved",
                        f"{label} saved as {values[field]}",
                        g.staff["id"],
                        field=field,
                    )
    return jsonify(ok=True)


def create_linked_lead(conn, cid, actor):
    contact = get_contact(conn, cid, True)
    if contact["lead_id"]:
        return contact["lead_id"]
    table = metadata.tables["leads"]
    lid = conn.execute(
        table.insert().values(
            name=contact["display_name"],
            email=contact["email"],
            phone=contact["phone"],
            source="crm",
            nationality=contact["nationality"] or "",
            study_level=contact["degree_level"] or "",
            specialization=contact["program_interests"] or "",
        )
    ).inserted_primary_key[0]
    conn.execute(
        update(contacts)
        .where(contacts.c.id == cid)
        .values(lead_id=lid, updated_at=now())
    )
    audit(conn, actor, "contact.lead_created", "contact", cid, lead_id=lid)
    return lid


@api.post("/contacts/<int:cid>/lead")
@require_staff(*EDIT)
def create_lead(cid):
    with engine().begin() as conn:
        lid = create_linked_lead(conn, cid, g.staff["id"])
    return output({"id": lid}, 201)


@api.put("/contacts/<int:cid>/links/<kind>")
@require_staff(*EDIT)
def link(cid, kind):
    if kind not in ("lead", "student"):
        raise NotFound("Unknown link type")
    target = body().get("id")
    if target is not None and (
        not isinstance(target, int) or isinstance(target, bool) or target < 1
    ):
        raise BadRequest("Invalid linked record")
    with engine().begin() as conn:
        old = get_contact(conn, cid, True)
        table = metadata.tables[kind + "s"]
        if (
            target
            and not conn.execute(select(table.c.id).where(table.c.id == target)).first()
        ):
            raise NotFound("Linked record not found")
        conn.execute(
            update(contacts)
            .where(contacts.c.id == cid)
            .values(**{kind + "_id": target}, updated_at=now())
        )
        audit(
            conn,
            g.staff["id"],
            "contact.link_changed",
            "contact",
            cid,
            kind=kind,
            previous=old[kind + "_id"],
            current=target,
        )
    return jsonify(ok=True)


@api.get("/links/<kind>")
@require_staff(*EDIT)
def search_links(kind):
    if kind not in ("leads", "students"):
        raise NotFound("Unknown link type")
    table = metadata.tables[kind]
    name = table.c.name if kind == "leads" else table.c.full_name
    q = request.args.get("q", "").strip()[:150]
    if len(q) < 2:
        return output([])
    with engine().connect() as conn:
        return output(
            conn.execute(
                select(table.c.id, name.label("name"), table.c.email, table.c.phone)
                .where(
                    or_(
                        name.ilike("%" + q + "%"),
                        table.c.email.ilike("%" + q + "%"),
                        table.c.phone.ilike("%" + q + "%"),
                    )
                )
                .limit(20)
            )
            .mappings()
            .all()
        )


@api.get("/labels")
@require_staff()
def list_labels():
    with engine().connect() as conn:
        return output(
            conn.execute(select(labels).order_by(labels.c.name)).mappings().all()
        )


def label_values(data):
    values = {}
    if "name" in data:
        values["name"] = string(data, "name", 60, True)
    if "color" in data:
        if not isinstance(data["color"], str) or not re.fullmatch(
            r"#[0-9a-fA-F]{6}", data["color"]
        ):
            raise BadRequest("Invalid label color")
        values["color"] = data["color"]
    if "archived" in data:
        if not isinstance(data["archived"], bool):
            raise BadRequest("Invalid archive status")
        values["archived"] = data["archived"]
    return values


@api.post("/labels")
@require_staff("OWNER", "ADMIN")
def create_label():
    values = label_values(body())
    if not values.get("name"):
        raise BadRequest("Label name is required")
    with engine().begin() as conn:
        lid = conn.execute(labels.insert().values(**values)).inserted_primary_key[0]
        audit(conn, g.staff["id"], "label.created", "label", lid)
    return output({"id": lid}, 201)


@api.patch("/labels/<int:lid>")
@require_staff("OWNER", "ADMIN")
def edit_label(lid):
    with engine().begin() as conn:
        if not conn.execute(
            update(labels).where(labels.c.id == lid).values(**label_values(body()))
        ).rowcount:
            raise NotFound("Label not found")
        audit(conn, g.staff["id"], "label.updated", "label", lid)
    return jsonify(ok=True)


@api.put("/contacts/<int:cid>/labels/<int:lid>")
@api.delete("/contacts/<int:cid>/labels/<int:lid>")
@require_staff(*EDIT)
def label_contact(cid, lid):
    with engine().begin() as conn:
        get_contact(conn, cid, True)
        if not conn.execute(
            select(labels).where(labels.c.id == lid, labels.c.archived.is_(False))
        ).first():
            raise NotFound("Active label not found")
        where = (contact_labels.c.contact_id == cid, contact_labels.c.label_id == lid)
        label_name = conn.execute(
            select(labels.c.name).where(labels.c.id == lid)
        ).scalar_one()
        changed = False
        if request.method == "DELETE":
            changed = bool(conn.execute(select(contact_labels).where(*where)).first())
            conn.execute(delete(contact_labels).where(*where))
        elif not conn.execute(select(contact_labels).where(*where)).first():
            conn.execute(contact_labels.insert().values(contact_id=cid, label_id=lid))
            changed = True
        if changed:
            vid = conn.execute(
                select(conversations.c.id)
                .where(conversations.c.contact_id == cid)
                .order_by(conversations.c.last_message_at.desc(), conversations.c.id.desc())
                .limit(1)
            ).scalar_one_or_none()
            if vid:
                from .inbox import add_event

                add_event(
                    conn,
                    vid,
                    "label_changed",
                    f'Label “{label_name}” {"removed" if request.method == "DELETE" else "added"}',
                    g.staff["id"],
                    label_id=lid,
                )
        audit(
            conn,
            g.staff["id"],
            "contact.label_changed",
            "contact",
            cid,
            label_id=lid,
            operation=request.method,
        )
    return jsonify(ok=True)


@api.post("/contacts/<int:cid>/notes")
@require_staff(*EDIT)
def add_note(cid):
    data = body()
    with engine().begin() as conn:
        get_contact(conn, cid)
        nid = conn.execute(
            notes.insert().values(
                contact_id=cid,
                author_id=g.staff["id"],
                text=string(data, "text", 10000, True),
            )
        ).inserted_primary_key[0]
        audit(conn, g.staff["id"], "note.created", "contact", cid, note_id=nid)
    return output({"id": nid}, 201)


@api.patch("/contacts/<int:cid>/notes/<int:nid>")
@api.delete("/contacts/<int:cid>/notes/<int:nid>")
@require_staff(*EDIT)
def edit_note(cid, nid):
    with engine().begin() as conn:
        row = (
            conn.execute(
                select(notes).where(
                    notes.c.id == nid,
                    notes.c.contact_id == cid,
                    notes.c.deleted_at.is_(None),
                )
            )
            .mappings()
            .first()
        )
        if not row:
            raise NotFound("Note not found")
        if row["author_id"] != g.staff["id"] and g.staff["role"] not in (
            "OWNER",
            "ADMIN",
        ):
            from werkzeug.exceptions import Forbidden

            raise Forbidden("Only the author or an administrator can edit this note")
        values = (
            {"deleted_at": now()}
            if request.method == "DELETE"
            else {"text": string(body(), "text", 10000, True), "updated_at": now()}
        )
        conn.execute(update(notes).where(notes.c.id == nid).values(**values))
        audit(
            conn,
            g.staff["id"],
            "note.changed",
            "contact",
            cid,
            note_id=nid,
            operation=request.method,
        )
    return jsonify(ok=True)
