"""Opt-in local diagnostics: fixed phase names and durations, never request data."""

from contextlib import contextmanager
from contextvars import ContextVar
from time import perf_counter

measurements: ContextVar[dict[str, float] | None] = ContextVar("measurements", default=None)


@contextmanager
def span(name: str):
    values = measurements.get()
    started = perf_counter()
    try:
        yield
    finally:
        if values is not None:
            values[name] = values.get(name, 0) + (perf_counter() - started) * 1000
