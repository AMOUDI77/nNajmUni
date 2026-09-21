"""NajmUni CRM. Registration performs no schema or data writes."""


def register_crm(app, engine_provider):
    app.extensions["crm_engine"] = engine_provider
    from .auth import auth

    app.register_blueprint(auth)
    from .contacts import api as contacts_api

    app.register_blueprint(contacts_api)
    from .conversations import api as conversations_api

    app.register_blueprint(conversations_api)
    from .inbox import api as inbox_api

    app.register_blueprint(inbox_api)
    from .automations import api as automations_api

    app.register_blueprint(automations_api)
    from .ai import api as ai_api

    app.register_blueprint(ai_api)
    from .analytics import api as analytics_api
    from .settings import api as settings_api

    app.register_blueprint(settings_api)
    app.register_blueprint(analytics_api)
    from integrations.instagram.webhooks import webhooks

    app.register_blueprint(webhooks)
    from integrations.instagram.oauth import api as oauth_api

    app.register_blueprint(oauth_api)
    from flask import jsonify, request
    from sqlalchemy.exc import IntegrityError
    from werkzeug.exceptions import HTTPException

    @app.errorhandler(HTTPException)
    def crm_http_error(error):
        if request.path.startswith("/api/crm") or request.path.startswith(
            "/api/webhooks/"
        ):
            return jsonify(error=error.description), error.code
        return error

    @app.errorhandler(IntegrityError)
    def crm_conflict(error):
        if request.path.startswith("/api/crm"):
            return jsonify(error="This record conflicts with an existing record"), 409
        raise error

    @app.after_request
    def crm_headers(response):
        if request.path.startswith("/api/crm"):
            response.headers["Cache-Control"] = "no-store"
        return response
