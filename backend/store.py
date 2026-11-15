"""Small local SQLite store with session ownership and optimistic updates."""

import json
import sqlite3
from pathlib import Path
from uuid import UUID

from fastapi import HTTPException

from schemas import Lesson, LessonSummary


class Store:
    def __init__(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with self.connect() as connection:
            connection.executescript("""
                CREATE TABLE IF NOT EXISTS lessons (
                    id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
                    revision INTEGER NOT NULL, created_at TEXT NOT NULL, payload TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS lessons_by_session ON lessons(session_id, created_at);
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, payload TEXT NOT NULL
                );
            """)

    def connect(self):
        return sqlite3.connect(self.path, timeout=10)

    def create_lesson(self, lesson: Lesson) -> Lesson:
        with self.connect() as connection:
            connection.execute(
                "INSERT INTO lessons VALUES (?, ?, ?, ?, ?)",
                (str(lesson.id), str(lesson.session_id), lesson.revision, lesson.created_at, lesson.model_dump_json()),
            )
        return lesson

    def get_lesson(self, lesson_id: UUID, session_id: UUID, revision: int | None = None) -> Lesson:
        with self.connect() as connection:
            row = connection.execute("SELECT payload FROM lessons WHERE id = ? AND session_id = ?", (str(lesson_id), str(session_id))).fetchone()
        if row is None:
            raise HTTPException(404, "This lesson is unavailable in this browser session. Generate a new lesson.")
        lesson = Lesson.model_validate_json(row[0])
        if revision is not None and lesson.revision != revision:
            raise HTTPException(409, "This lesson changed in another request. Reopen it from Recent lessons and try again.")
        return lesson

    def update_lesson(self, lesson: Lesson) -> Lesson:
        previous_revision = lesson.revision
        updated = lesson.model_copy(update={"revision": previous_revision + 1})
        with self.connect() as connection:
            result = connection.execute(
                "UPDATE lessons SET revision = ?, payload = ? WHERE id = ? AND session_id = ? AND revision = ?",
                (updated.revision, updated.model_dump_json(), str(lesson.id), str(lesson.session_id), previous_revision),
            )
            if result.rowcount != 1:
                raise HTTPException(409, "This lesson changed in another request. Reopen it from Recent lessons and try again.")
        return updated

    def list_lessons(self, session_id: UUID) -> list[LessonSummary]:
        with self.connect() as connection:
            rows = connection.execute("SELECT payload FROM lessons WHERE session_id = ? ORDER BY created_at DESC LIMIT 15", (str(session_id),)).fetchall()
        return [LessonSummary.model_validate({key: value for key, value in json.loads(row[0]).items() if key in LessonSummary.model_fields}) for row in rows]

    def save_document(self, document_id: UUID, session_id: UUID, data: dict) -> None:
        with self.connect() as connection:
            connection.execute("DELETE FROM documents WHERE created_at < datetime('now', '-1 day')")
            connection.execute("INSERT INTO documents(id, session_id, payload) VALUES (?, ?, ?)", (str(document_id), str(session_id), json.dumps(data)))

    def get_document(self, document_id: UUID, session_id: UUID) -> dict:
        with self.connect() as connection:
            row = connection.execute("SELECT payload FROM documents WHERE id = ? AND session_id = ? AND created_at >= datetime('now', '-1 day')", (str(document_id), str(session_id))).fetchone()
        if row is None:
            raise HTTPException(404, "This document has expired or belongs to another browser session. Upload it again.")
        return json.loads(row[0])
