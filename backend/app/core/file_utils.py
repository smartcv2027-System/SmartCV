import os
import re
import uuid
import hashlib
from typing import Optional, Dict, Any
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings
from app.ai.parser import parse_document
from app.ai.validator import verify_cv_structure, verify_job_structure

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}
MAX_FILE_SIZE_KB = 5 * 1024  # 5 MiB (5,120 KB)

def sanitize_filename(filename: str) -> str:
    """Sanitize a filename by removing unsafe characters."""
    base = os.path.basename(filename)
    # Remove path traversal characters and replace non-alphanumeric (except dots, underscores, dashes)
    clean = re.sub(r'[^a-zA-Z0-9_.-]', '_', base)
    return clean or "unnamed_file.txt"

def get_file_extension(filename: str) -> str:
    """Extract lowercase file extension without dot."""
    ext = os.path.splitext(filename)[1].lower().lstrip(".")
    return ext

async def validate_and_read_upload(
    file: UploadFile, 
    expected_document_type: Optional[str] = None
) -> Dict[str, Any]:
    """
    Validates uploaded file against extension whitelist and maximum size.
    Extracts text, verifies document structure (if expected_document_type is 'cv' or 'job'),
    and computes SHA-256 checksum.
    
    Returns:
        Dict containing:
            - file_bytes (bytes)
            - filename (str, original name)
            - file_type (str: 'pdf', 'docx', or 'txt')
            - mime_type (str)
            - size_kb (int)
            - checksum (str: SHA-256 hex digest)
            - storage_name (str: sanitized, collision-free UUID storage name)
            - extracted_text (str)
            - structure_score (int: 0 - 100)
            - structure_metadata (dict)
    
    Raises:
        HTTPException (400) on validation, parsing, or structural failure.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must have a valid filename."
        )

    ext = get_file_extension(file.filename)
    if ext not in ALLOWED_EXTENSIONS:
        allowed_list = ", ".join(f".{e}" for e in sorted(ALLOWED_EXTENSIONS))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type '.{ext}'. Allowed file formats: {allowed_list}."
        )

    # Read bytes
    file_bytes = await file.read()
    if not file_bytes or len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty (0 bytes)."
        )

    size_kb = max(1, len(file_bytes) // 1024)
    if size_kb > MAX_FILE_SIZE_KB:
        max_mb = MAX_FILE_SIZE_KB // 1024
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({size_kb} KB) exceeds the maximum allowed limit of {max_mb} MiB ({MAX_FILE_SIZE_KB} KB)."
        )

    # Compute checksum
    checksum = hashlib.sha256(file_bytes).hexdigest()

    # Parse text from document for structural verification
    extracted_text, doc_type, _, _ = parse_document(file.filename, file_bytes)
    clean_text = (extracted_text or "").strip()
    structure_score = 100
    structure_meta = {}

    if expected_document_type == "cv":
        is_valid, structure_score, missing, structure_meta = verify_cv_structure(clean_text)
        if not is_valid:
            missing_str = ", ".join(missing) if missing else "essential sections"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded document does not follow standard CV/resume structure (ATS score: {structure_score}%). Missing components: {missing_str}. Please upload a valid resume with standard Education, Skills, and Contact details."
            )
    elif expected_document_type == "job":
        is_valid, structure_score, missing, structure_meta = verify_job_structure(clean_text)
        if not is_valid:
            missing_str = ", ".join(missing) if missing else "essential sections"
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Uploaded document does not follow standard Job Description structure (Completeness score: {structure_score}%). Missing components: {missing_str}. Please upload a valid job description with responsibilities and requirements."
            )

    # Generate collision-free storage name
    safe_name = sanitize_filename(file.filename)
    storage_name = f"{uuid.uuid4().hex[:12]}_{safe_name}"

    mime_type = file.content_type or f"application/{ext}"

    return {
        "file_bytes": file_bytes,
        "filename": file.filename,
        "file_type": ext,
        "mime_type": mime_type,
        "size_kb": size_kb,
        "checksum": checksum,
        "storage_name": storage_name,
        "extracted_text": clean_text,
        "structure_score": structure_score,
        "structure_metadata": structure_meta
    }

def save_file_to_disk(storage_name: str, file_bytes: bytes) -> str:
    """Saves file bytes to the configured UPLOAD_DIR and returns the absolute storage path."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    storage_path = os.path.join(settings.UPLOAD_DIR, storage_name)
    with open(storage_path, "wb") as f:
        f.write(file_bytes)
    return storage_path

def delete_file_from_disk(storage_path: Optional[str]) -> bool:
    """Safely removes a physical file from disk. Returns True if removed, False otherwise."""
    if not storage_path:
        return False
    try:
        if os.path.exists(storage_path) and os.path.isfile(storage_path):
            os.remove(storage_path)
            return True
    except Exception as e:
        # Non-fatal log
        print(f"Warning: Failed to delete physical file {storage_path}: {e}")
    return False
