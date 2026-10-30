
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# --------------------------------------------------
# 1. DEFAULT BRAND GUIDELINES
# --------------------------------------------------

DEFAULT_PROHIBITED = [
    "best in the world",
    "guaranteed results",
    "100% risk-free",
    "limited time offer",
]

DEFAULT_REQUIRED = [
    "BrandShield",
    "customer first",
]

SUGGESTIONS = {
    "best in the world": "a trusted choice for your needs",
    "guaranteed results": "designed to help you achieve your goals",
    "100% risk-free": "designed with safety in mind",
    "limited time offer": "our offer",
}


# --------------------------------------------------
# 2. REQUEST MODELS
# --------------------------------------------------

class Guidelines(BaseModel):
    prohibitedPhrases: list[str] = Field(
        default_factory=lambda: DEFAULT_PROHIBITED.copy(),
        max_length=100,
    )
    requiredTerms: list[str] = Field(
        default_factory=lambda: DEFAULT_REQUIRED.copy(),
        max_length=100,
    )


class ContentRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    guidelines: Guidelines = Field(default_factory=Guidelines)


# --------------------------------------------------
# 3. FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="BrandShield AI",
    description="AI Governance Workspace - Brand Content Audit",
    version="1.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# 4. HOME AND HEALTH ENDPOINTS
# --------------------------------------------------

@app.get("/")
def root():
    return {
        "message": "Welcome to BrandShield AI",
        "status": "running",
        "version": "1.2.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "project": "BrandShield AI",
    }


# --------------------------------------------------
# 5. CONTENT ANALYSIS ENGINE
# --------------------------------------------------

def analyze_text(content: str, guidelines: Guidelines) -> list[dict]:
    findings = []

    # Check prohibited phrases.
    for phrase in guidelines.prohibitedPhrases:
        phrase = phrase.strip()

        if not phrase:
            continue

        pattern = re.compile(re.escape(phrase), re.IGNORECASE)

        if pattern.search(content):
            suggestion = SUGGESTIONS.get(
                phrase.casefold(),
                "Review and replace this phrase with approved brand wording.",
            )

            findings.append({
                "type": "prohibited_phrase",
                "severity": "high",
                "matched_text": phrase,
                "explanation": (
                    f"The prohibited phrase '{phrase}' appears "
                    "in the submitted content."
                ),
                "suggestion": (
                    f"Consider replacing '{phrase}' with '{suggestion}'."
                ),
            })

    # Check required terms.
    for term in guidelines.requiredTerms:
        term = term.strip()

        if not term:
            continue

        if term.casefold() not in content.casefold():
            findings.append({
                "type": "missing_required_term",
                "severity": "medium",
                "matched_text": term,
                "explanation": (
                    f"The required term '{term}' is missing "
                    "from the submitted content."
                ),
                "suggestion": (
                    f"Consider including '{term}' where appropriate."
                ),
            })

    return findings


# --------------------------------------------------
# 6. ANALYZE ENDPOINT
# --------------------------------------------------

@app.post("/analyze")
def analyze_content(request: ContentRequest):
    content = request.content.strip()
    findings = analyze_text(content, request.guidelines)

    return {
        "project": "BrandShield AI",
        "character_count": len(content),
        "findings_count": len(findings),
        "findings": findings,
        "status": "clean" if not findings else "issues_found",
        "notice": (
            "Rule-based checks only. A clean result does not "
            "guarantee complete brand compliance."
        ),
    }


# --------------------------------------------------
# 7. SMART REWRITE ENGINE
# --------------------------------------------------

def rewrite_text(content: str, guidelines: Guidelines) -> dict:
    original = content
    rewritten = content

    applied_changes = []
    manual_review = []

    # STEP A: Replace prohibited phrases.
    for phrase in guidelines.prohibitedPhrases:
        phrase = phrase.strip()

        if not phrase:
            continue

        pattern = re.compile(re.escape(phrase), re.IGNORECASE)

        if not pattern.search(rewritten):
            continue

        alternative = SUGGESTIONS.get(phrase.casefold())

        if alternative is None:
            # Do not guess how to replace unknown custom phrases.
            manual_review.append({
                "phrase": phrase,
                "reason": (
                    "No predefined replacement is available. "
                    "Please review this phrase manually."
                ),
            })
            continue

        before = rewritten

        if phrase.casefold() == "limited time offer":
            contextual_pattern = re.compile(
                r"\bwith\s+(?:our\s+)?limited time offer\b",
                re.IGNORECASE,
            )

            rewritten = contextual_pattern.sub(
                "to explore our offer",
                rewritten,
            )

            # Fallback if the full contextual phrase was not found.
            if rewritten == before:
                rewritten = pattern.sub("offer", rewritten)
        else:
            rewritten = pattern.sub(alternative, rewritten)

        if rewritten != before:
            applied_changes.append({
                "type": "prohibited_phrase",
                "original": phrase,
                "replacement": alternative,
                "reason": (
                    f"Replaced the prohibited phrase '{phrase}'."
                ),
            })

    # STEP B: Automatically add missing required terms.
    for term in guidelines.requiredTerms:
        term = term.strip()

        if not term:
            continue

        # Check the current rewritten text, not just the original.
        if term.casefold() in rewritten.casefold():
            continue

        # Use a natural sentence for the default customer-first rule.
        if term.casefold() == "customer first":
            addition = " We put the customer first."
        elif term.casefold() == "brandshield":
            addition = " BrandShield supports consistent brand messaging."
        else:
            # Generic fallback for custom required terms.
            addition = f" We also focus on {term}."

        rewritten = rewritten.rstrip() + addition

        applied_changes.append({
            "type": "required_term",
            "original": "",
            "replacement": term,
            "reason": (
                f"Automatically added the missing required term '{term}'."
            ),
        })

    # STEP C: Recheck the complete proposed content.
    remaining_findings = analyze_text(
        rewritten,
        guidelines,
    )

    return {
        "original_content": original,
        "rewritten_content": rewritten,
        "changes_count": len(applied_changes),
        "applied_changes": applied_changes,
        "manual_review": manual_review,
        "remaining_findings": remaining_findings,
        "notice": (
            "Review the proposed text before publication. "
            "Automatic rewriting does not guarantee full compliance."
        ),
    }


# --------------------------------------------------
# 8. REWRITE ENDPOINT
# --------------------------------------------------

@app.post("/rewrite")
def rewrite_content(request: ContentRequest):
    content = request.content.strip()

    return rewrite_text(
        content,
        request.guidelines,
    )
