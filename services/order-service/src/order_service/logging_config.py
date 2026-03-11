"""Structured JSON logging configuration with OpenTelemetry trace context injection."""

import logging
import os

from opentelemetry import trace


class OTelContextFilter(logging.Filter):
    """Inject OpenTelemetry trace_id and span_id into log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        span = trace.get_current_span()
        ctx = span.get_span_context()

        if ctx and ctx.trace_id:
            record.trace_id = format(ctx.trace_id, "032x")
            record.span_id = format(ctx.span_id, "016x")
        else:
            record.trace_id = "0" * 32
            record.span_id = "0" * 16

        record.service = "order-service"
        return True


def configure_logging() -> None:
    """Configure root logger based on LOG_FORMAT and LOG_LEVEL env vars.

    LOG_FORMAT=json  -> structured JSON output with OTel context (production/K8s)
    LOG_FORMAT=text  -> human-readable colored output (local development, default)
    """
    log_format = os.environ.get("LOG_FORMAT", "text").lower()
    log_level = os.environ.get("LOG_LEVEL", "INFO").upper()

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Remove existing handlers to avoid duplicate output
    root_logger.handlers.clear()

    if log_format == "json":
        from pythonjsonlogger.json import JsonFormatter

        handler = logging.StreamHandler()
        formatter = JsonFormatter(
            fmt="%(timestamp)s %(level)s %(service)s %(message)s %(trace_id)s %(span_id)s %(name)s",
            rename_fields={
                "levelname": "level",
                "name": "logger",
                "created": "timestamp",
            },
        )
        handler.setFormatter(formatter)
        handler.addFilter(OTelContextFilter())
        root_logger.addHandler(handler)
    else:
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s %(levelname)-8s [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        handler.setFormatter(formatter)
        root_logger.addHandler(handler)
