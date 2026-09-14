import os
import hashlib
from typing import Tuple, Optional
import io

def compute_checksum(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()

def extract_text_from_pdf(file_bytes: bytes) -> str:
    text_content = []
    
    # Try pdfplumber first
    try:
        import pdfplumber
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page in pdf.pages:
                # Try layout mode for multi-column resumes, fallback to standard flow
                page_text = page.extract_text(layout=True)
                if not page_text or len(page_text.strip()) < 10:
                    page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
        if text_content:
            return "\n".join(text_content).strip()
    except Exception:
        pass

    # Fallback to pypdf
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(file_bytes))
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_content.append(page_text)
        if text_content:
            return "\n".join(text_content).strip()
    except Exception:
        pass

    return ""

def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_bytes))
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        for table in doc.tables:
            for row in table.rows:
                for cell in row.cells:
                    if cell.text.strip():
                        paragraphs.append(cell.text.strip())
        return "\n".join(paragraphs).strip()
    except Exception:
        return ""

def parse_document(file_name: str, file_bytes: bytes) -> Tuple[str, str, int, str]:
    """
    Parses document bytes based on file extension.
    Returns (extracted_text, file_type, file_size_kb, checksum)
    """
    file_size_kb = max(1, len(file_bytes) // 1024)
    checksum = compute_checksum(file_bytes)
    ext = os.path.splitext(file_name)[1].lower()

    extracted_text = ""
    file_type = "txt"

    if ext == ".pdf":
        file_type = "pdf"
        extracted_text = extract_text_from_pdf(file_bytes)
    elif ext in [".docx", ".doc"]:
        file_type = "docx"
        extracted_text = extract_text_from_docx(file_bytes)
    else:
        file_type = "txt"
        try:
            extracted_text = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            extracted_text = str(file_bytes)

    if not extracted_text.strip():
        # Fallback decode
        try:
            extracted_text = file_bytes.decode("latin-1", errors="ignore")
        except Exception:
            extracted_text = "Empty or unparseable document content."

    return extracted_text.strip(), file_type, file_size_kb, checksum
