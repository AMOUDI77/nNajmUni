from flask import Blueprint
from sqlalchemy import case, func, select

from .auth import require_staff
from .common import engine, output
from .schema_v1 import (
    campaigns,
    contacts,
    conversations,
    staff_users,
    suggestions,
    touchpoints,
)

api = Blueprint("crm_analytics", __name__, url_prefix="/api/crm")


@api.get("/analytics")
@require_staff()
def analytics():
    with engine().connect() as conn:
        count = lambda table, *where: conn.execute(
            select(func.count()).select_from(table).where(*where)
        ).scalar_one()
        cards = {
            "conversations": count(conversations),
            "unread": count(conversations, conversations.c.unread.is_(True)),
            "linked_leads": count(contacts, contacts.c.lead_id.is_not(None)),
            "qualified": count(contacts, contacts.c.stage == "QUALIFIED"),
            "ai_used": count(
                suggestions, suggestions.c.feedback.in_(["ACCEPTED", "EDITED"])
            ),
        }
        if conn.dialect.name == "postgresql":
            response_time = func.extract(
                "epoch", conversations.c.first_response_at - conversations.c.created_at
            )
        else:
            response_time = (
                func.julianday(conversations.c.first_response_at)
                - func.julianday(conversations.c.created_at)
            ) * 86400
        cards["average_first_response_seconds"] = conn.execute(
            select(func.avg(response_time)).where(
                conversations.c.first_response_at.is_not(None)
            )
        ).scalar_one()
        daily = (
            conn.execute(
                select(
                    func.date(conversations.c.created_at).label("day"),
                    func.count().label("count"),
                )
                .group_by(func.date(conversations.c.created_at))
                .order_by(func.date(conversations.c.created_at).desc())
                .limit(30)
            )
            .mappings()
            .all()
        )
        funnel = (
            conn.execute(
                select(contacts.c.stage, func.count().label("count")).group_by(
                    contacts.c.stage
                )
            )
            .mappings()
            .all()
        )
        workload = (
            conn.execute(
                select(
                    staff_users.c.full_name,
                    func.count(conversations.c.id).label("count"),
                )
                .outerjoin(
                    conversations,
                    (conversations.c.assigned_to == staff_users.c.id)
                    & (conversations.c.status == "OPEN"),
                )
                .group_by(staff_users.c.id, staff_users.c.full_name)
            )
            .mappings()
            .all()
        )
        sources = (
            conn.execute(
                select(
                    campaigns.c.id,
                    campaigns.c.campaign_name,
                    campaigns.c.media_id,
                    func.count(func.distinct(touchpoints.c.contact_id)).label(
                        "contacts"
                    ),
                    func.count(
                        func.distinct(
                            case((contacts.c.lead_id.is_not(None), contacts.c.id))
                        )
                    ).label("leads"),
                    func.count(
                        func.distinct(
                            case((contacts.c.stage == "QUALIFIED", contacts.c.id))
                        )
                    ).label("qualified"),
                )
                .outerjoin(
                    touchpoints, touchpoints.c.campaign_source_id == campaigns.c.id
                )
                .outerjoin(contacts, contacts.c.id == touchpoints.c.contact_id)
                .group_by(
                    campaigns.c.id, campaigns.c.campaign_name, campaigns.c.media_id
                )
                .limit(100)
            )
            .mappings()
            .all()
        )
    return output(
        {
            "cards": cards,
            "daily": list(reversed(daily)),
            "funnel": funnel,
            "workload": workload,
            "sources": sources,
            "attribution_note": "Multi-touch: a contact can appear in more than one source. Enrollment is a CRM stage, not a verified academic outcome.",
        }
    )
