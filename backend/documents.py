"""Bounded, text-only PDF extraction. Original PDF bytes are never persisted."""

import re
from pathlib import PurePosixPath
from uuid import UUID, uuid4

import pymupdf
from fastapi import HTTPException, UploadFile

from physics import TOPICS, detect_topic
from schemas import PDFResponse, SourceReference, TopicId
from store import Store

MAX_PDF_BYTES = 10 * 1024 * 1024
MAX_PAGES = 100
MAX_TEXT = 250000


def extract_pdf(file: UploadFile, session_id: UUID, store: Store) -> PDFResponse:
    filename = PurePosixPath((file.filename or "document.pdf").replace("\\", "/")).name[:160]
    if not filename.lower().endswith(".pdf") or file.content_type not in {"application/pdf", "application/octet-stream"}:
        raise HTTPException(415, "Upload a PDF file. Text-based PDFs up to 10 MB are supported.")
    data = file.file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(413, "The PDF is larger than 10 MB. Upload a smaller document.")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(422, "The uploaded file is not a readable PDF.")
    try:
        with pymupdf.open(stream=data, filetype="pdf") as document:
            if document.needs_pass:
                raise HTTPException(422, "Password-protected PDFs are unsupported. Upload an unlocked copy.")
            if document.page_count > MAX_PAGES:
                raise HTTPException(422, "Upload a PDF with at most 100 pages.")
            title = str(document.metadata.get("title") or filename)[:160]
            pages = []
            count = 0
            for index, page in enumerate(document):
                text = page.get_text("text", sort=True).strip()
                count += len(text)
                if count > MAX_TEXT:
                    raise HTTPException(422, "This document contains too much text. Upload a shorter section of the notes.")
                if text:
                    pages.append({"page": index + 1, "text": text})
            page_count = document.page_count
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "This PDF could not be read. Try a different text-based PDF.") from None
    if sum(len(page["text"]) for page in pages) < 20:
        raise HTTPException(422, "No usable text was found. This MVP supports text-based PDFs. Scanned pages need OCR before upload.")
    found: set[TopicId] = set()
    for page in pages:
        # A page can contain both supported concepts and other course material.
        for paragraph in re.split(r"\n\s*\n|(?<=[.!?])\s+", page["text"]):
            try:
                topic = detect_topic(paragraph)
                found.add(topic)
                if re.search(r"\b(projectile|trajectory|trajectories|ballistic)\b", paragraph, flags=re.IGNORECASE):
                    found.add("projectile_motion")
                if re.search(r"\b(angle|angles|range)\b", paragraph, flags=re.IGNORECASE):
                    found.add("launch_angles")
            except HTTPException:
                continue
    topics = [topic for topic in TOPICS if topic.id in found]
    document_id = uuid4()
    store.save_document(document_id, session_id, {"filename": filename, "title": title, "pages": pages, "topics": list(found)})
    references = relevant_sources({"filename": filename, "pages": pages}, topics[0].id if topics else "projectile_motion")
    return PDFResponse(
        id=document_id, filename=filename, title=title, page_count=page_count,
        topics=topics, references=references,
        notice="Extracted locally from a text-based PDF. Only selected excerpts are sent to Gemini in Gemini mode. Extracted text expires after 24 hours. Lesson source excerpts remain in local lesson history.",
    )


def relevant_sources(document: dict, topic: TopicId) -> list[SourceReference]:
    keywords = {
        "projectile_motion": r"projectile|trajector|launch|ballistic",
        "launch_angles": r"angle|range|degrees|projectile",
        "velocity_components": r"components?|horizontal|vertical|velocity",
    }
    matches = []
    for page in document["pages"]:
        match = re.search(keywords[topic], page["text"], flags=re.IGNORECASE)
        if match:
            start = max(0, match.start() - 180)
            matches.append(SourceReference(filename=document["filename"], page=page["page"], excerpt=page["text"][start:start + 1200]))
        if len(matches) == 3:
            break
    return matches
