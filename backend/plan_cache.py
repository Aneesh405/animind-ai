"""Small, session-scoped RAM cache of validated initial plans. No disk writes."""

from collections import OrderedDict
from concurrent.futures import Future
from hashlib import sha256
import json
from threading import Lock
from time import monotonic


def plan_key(session_id, context, model, credential, instruction, schema):
    # Credentials and private context never appear in diagnostics or cache keys.
    payload = [str(session_id), context, model, credential, instruction, schema]
    return sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).digest()


class PlanCache:
    def __init__(self, capacity=64, ttl=300, clock=monotonic):
        self.capacity, self.ttl, self.clock = capacity, ttl, clock
        self.entries = OrderedDict()
        self.pending = {}
        self.lock = Lock()

    def get_or_create(self, key, loader):
        with self.lock:
            now = self.clock()
            for expired in [key for key, (until, _) in self.entries.items() if until <= now]:
                del self.entries[expired]
            if key in self.entries:
                self.entries.move_to_end(key)
                return self.entries[key][1].model_copy(deep=True), True
            pending = self.pending.get(key)
            owner = pending is None
            if owner:
                pending = self.pending[key] = Future()
        if not owner:
            return pending.result(timeout=60).model_copy(deep=True), True
        try:
            plan = loader()  # Caller returns only a schema-validated plan.
            with self.lock:
                self.entries[key] = (self.clock() + self.ttl, plan.model_copy(deep=True))
                while len(self.entries) > self.capacity:
                    self.entries.popitem(last=False)
            pending.set_result(plan.model_copy(deep=True))
            return plan, False
        except Exception as error:
            pending.set_exception(error)
            raise
        finally:
            with self.lock:
                self.pending.pop(key, None)
