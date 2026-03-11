"""Centralized auth event logging with Prometheus counter integration."""

import logging

from order_service.metrics import auth_events_total

logger = logging.getLogger("order_service.auth")


def log_auth_event(
    event_type: str,
    user_id: str | None = None,
    client_ip: str | None = None,
    result: str = "success",
    **extra_fields: object,
) -> None:
    """Log an auth event as structured JSON and increment Prometheus counter.

    Args:
        event_type: Dotted event name (e.g. auth.login.success).
        user_id: Authenticated user identifier, or None for anonymous.
        client_ip: Request client IP address.
        result: Outcome -- "success", "failure", "denied", "blocked".
        **extra_fields: Additional key-value pairs to include in the log record.
    """
    auth_events_total.labels(event_type=event_type, result=result).inc()

    logger.info(
        "Auth event: %s",
        event_type,
        extra={
            "event_type": event_type,
            "user_id": user_id or "anonymous",
            "client_ip": client_ip or "unknown",
            "action": event_type.rsplit(".", maxsplit=1)[-1],
            "result": result,
            **extra_fields,
        },
    )
