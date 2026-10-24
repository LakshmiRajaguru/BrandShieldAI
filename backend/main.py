
import re
from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# --------------------------------------------------
# 1. APPLICATION SETUP
# --------------------------------------------------

app = FastAPI(
    title="BrandShield AI",
    description="A brand governance API for auditing and rewriting content.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://brandshieldai-frontend.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 2. DEFAULT BRAND GUIDELINES
# --------------------------------------------------

DEFAULT_PROHIBITED_PHRASES = [
    "best in the world",
    "guaranteed results",
    "100% guaranteed",
    "instant success",
    "number one",
]

DEFAULT_REQUIRED_TERMS = [
    "BrandShield",
    "customer first",
]


# --------------------------------------------------
# 3. REQUEST MODELS
# --------------------------------------------------

class Guidelines(BaseModel):
    prohibitedPhrases: list[str] = Field(
        default_factory=lambda: DEFAULT_PROHIBITED_PHRASES.copy()
    )
    requiredTerms: list[str] = Field(
        default_factory=lambda: DEFAULT_REQUIRED_TERMS.copy()
    )


class ContentRequest(BaseModel):
    content: str = ""
    guidelines: Guidelines = Field(default_factory=Guidelines)


# --------------------------------------------------
# 4. REPLACEMENT SUGGESTIONS
# --------------------------------------------------

SUGGESTIONS = {
    "best in the world": "a trusted solution",
    "guaranteed results": "results designed to support your goals",
    "100% guaranteed": "designed to support your needs",
    "instant success": "a practical path toward your goals",
    "number one": "a solution focused on customer needs",
}


# --------------------------------------------------
# 5. HELPER FUNCTIONS
# --------------------------------------------------

def clean_phrase_list(phrases: list[str]) -> list[str]:
    """Remove empty phrases and duplicate entries."""
    cleaned = []
    seen = set()

    for phrase in phrases:
        phrase = phrase.strip()

        if not phrase:
            continue

        normalized = phrase.casefold()

        if normalized not in seen:
            cleaned.append(phrase)
            seen.add(normalized)

    return cleaned


def replace_phrase(text: str, phrase: str, replacement: str) -> str:
    """Replace a phrase without matching it inside larger words."""
    pattern = r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"

    return re.sub(
        pattern,
        lambda _: replacement,
        text,
        flags=re.IGNORECASE,
    )


def rewrite_guaranteed_results(text: str) -> str:
    """Handle common guarantee-related promotional claims."""
    replacements = {
        "guaranteed results": "results designed to support your goals",
        "100% guaranteed": "designed to support your needs",
    }

    for phrase, replacement in replacements.items():
        text = replace_phrase(text, phrase, replacement)

    return text


def rewrite_promotional_content(text: str) -> str:
    """Replace common exaggerated promotional language."""
    replacements = {
        "best in the world": "a trusted solution",
        "number one": "focused on customer needs",
        "instant success": "a practical path toward your goals",
    }

    for phrase, replacement in replacements.items():
        text = replace_phrase(text, phrase, replacement)

    return text


# --------------------------------------------------
# 6. CONTENT AUDIT
# --------------------------------------------------

def analyze_text(
    content: str,
    guidelines: Guidelines,
) -> list[dict]:
    """Find prohibited phrases and missing required terms."""
    findings = []

    prohibited_phrases = clean_phrase_list(
        guidelines.prohibitedPhrases
    )

    required_terms = clean_phrase_list(
        guidelines.requiredTerms
    )

    # Check prohibited phrases.
    for phrase in prohibited_phrases:
        pattern = r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"

        matches = list(
            re.finditer(pattern, content, flags=re.IGNORECASE)
        )

        for match in matches:
            findings.append({
                "type": "prohibited_phrase",
                "category": "Brand Guidelines",
                "phrase": phrase,
                "matched_text": match.group(0),
                "message": (
                    f'The phrase "{match.group(0)}" '
                    "is prohibited by your brand guidelines."
                ),
                "severity": "high",
                "suggestion": SUGGESTIONS.get(
                    phrase.casefold(),
                    "Replace this phrase with approved brand language.",
                ),
            })

    # Check required terms.
    for term in required_terms:
        pattern = r"(?<!\w)" + re.escape(term) + r"(?!\w)"

        if not re.search(pattern, content, flags=re.IGNORECASE):
            findings.append({
                "type": "missing_required_term",
                "category": "Brand Guidelines",
                "phrase": term,
                "matched_text": "",
                "message": (
                    f'The required term "{term}" is missing '
                    "from the content."
                ),
                "severity": "medium",
                "suggestion": f'Include "{term}" naturally in the content.',
            })

    return findings


# --------------------------------------------------
# 7. SMART REWRITE
# --------------------------------------------------

def rewrite_text(
    content: str,
    guidelines: Guidelines,
) -> tuple[str, list[dict]]:
    """Rewrite prohibited wording and add missing required terms."""
    rewritten = content.strip()

    if not rewritten:
        return "", analyze_text("", guidelines)

    # Apply context-aware replacements first.
    rewritten = rewrite_guaranteed_results(rewritten)
    rewritten = rewrite_promotional_content(rewritten)

    # Replace every configured prohibited phrase.
    for phrase in clean_phrase_list(
        guidelines.prohibitedPhrases
    ):
        replacement = SUGGESTIONS.get(
            phrase.casefold(),
            "a clear and supportable alternative",
        )

        rewritten = replace_phrase(
            rewritten,
            phrase,
            replacement,
        )

    # Add missing required terms more naturally.
    for term in clean_phrase_list(guidelines.requiredTerms):
        pattern = r"(?<!\w)" + re.escape(term) + r"(?!\w)"

        if re.search(pattern, rewritten, flags=re.IGNORECASE):
            continue

        normalized_term = term.casefold()
        base = rewritten.rstrip().rstrip(".!?").strip()

        if normalized_term == "brandshield":
            if base:
                rewritten = f"BrandShield: {base}"
            else:
                rewritten = "BrandShield"

        elif normalized_term == "customer first":
            if base:
                rewritten = (
                    f"{base}. We take a customer first approach."
                )
            else:
                rewritten = "We take a customer first approach."

        else:
            if base:
                rewritten = f"{base}. We also highlight {term}."
            else:
                rewritten = f"We highlight {term}."

    # Clean repeated spaces and spaces before punctuation.
    rewritten = re.sub(r"[ \t]{2,}", " ", rewritten)
    rewritten = re.sub(r"\s+([,.;!?])", r"\1", rewritten)
    rewritten = rewritten.strip()

    # Recheck against the active guidelines.
    remaining_findings = analyze_text(
        rewritten,
        guidelines,
    )

    return rewritten, remaining_findings


# --------------------------------------------------
# 8. API ROUTES
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "BrandShield AI API is running",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "BrandShield AI",
    }


@app.post("/analyze")
def analyze(request: ContentRequest):
    """Audit content against the supplied brand guidelines."""
    findings = analyze_text(
        request.content,
        request.guidelines,
    )

    high_count = sum(
        1 for finding in findings
        if finding["severity"] == "high"
    )

    medium_count = sum(
        1 for finding in findings
        if finding["severity"] == "medium"
    )

    return {
        "content": request.content,
        "findings": findings,
        "findings_count": len(findings),
        "high_count": high_count,
        "medium_count": medium_count,
        "status": (
            "review_required"
            if findings
            else "no_rule_violations_detected"
        ),
        "notice": (
            "Rule-based demo checks only the supplied guidelines. "
            "A clean result does not guarantee factual accuracy "
            "or complete brand compliance."
        ),
    }


@app.post("/rewrite")
def rewrite(request: ContentRequest):
    """Rewrite content and report any remaining guideline violations."""
    rewritten, remaining_findings = rewrite_text(
        request.content,
        request.guidelines,
    )

    # Describe configured prohibited phrases found in the original
    # that no longer appear in the rewritten content.
    applied_changes = []

    for phrase in clean_phrase_list(
        request.guidelines.prohibitedPhrases
    ):
        original_pattern = (
            r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"
        )

        rewritten_pattern = (
            r"(?<!\w)" + re.escape(phrase) + r"(?!\w)"
        )

        if (
            re.search(
                original_pattern,
                request.content,
                flags=re.IGNORECASE,
            )
            and not re.search(
                rewritten_pattern,
                rewritten,
                flags=re.IGNORECASE,
            )
        ):
            applied_changes.append({
                "original": phrase,
                "replacement": SUGGESTIONS.get(
                    phrase.casefold(),
                    "a clear and supportable alternative",
                ),
                "reason": "Replaced prohibited brand wording.",
            })

    original_findings = analyze_text(
        request.content,
        request.guidelines,
    )

    return {
        "original_content": request.content,
        "rewritten_content": rewritten,
        "applied_changes": applied_changes,
        "manual_review": bool(remaining_findings),
        "findings_count": len(remaining_findings),
        "remaining_findings": remaining_findings,
        "findings": remaining_findings,
        "original_findings_count": len(original_findings),
        "notice": (
            "Smart Rewrite uses rule-based replacements. "
            "Review the rewritten text for meaning, tone, "
            "grammar, and factual accuracy before publishing."
        ),
    }
