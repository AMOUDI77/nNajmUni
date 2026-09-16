from sqlalchemy import func, literal_column

from .schema_v1 import CONTACT_SEARCH, IDENTITY_SEARCH, MESSAGE_SEARCH

__all__ = ["CONTACT_SEARCH", "IDENTITY_SEARCH", "MESSAGE_SEARCH", "text_matches"]


def text_matches(expression, query):
    return expression.op("@@")(func.plainto_tsquery(literal_column("'simple'"), query))
