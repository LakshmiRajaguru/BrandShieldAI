
from __future__ import annotations

import re
from typing import List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="BrandShield AI",
    description="Brand governance API for auditing and improving marketing content.",
    version="2.0.0",
)

# Allow requests from the local development frontend and deployed Vercel app.
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


DEFAULT_PROHIBITED = [
    "best in the world",
    "guaranteed results",
    "100% risk-free",
    "limited time offer",
]

DEFAULT_REQUIRED = ["BrandShield", "customer first"]

SUGGESTIONS = {
    "best in the world": "a trusted choice for your needs",
    "guaranteed results": "designed to help you achieve your goals",
    "100% risk-free": "designed with safety in mind",
    "limited time offer": "our offer",
}


class Guidelines(BaseModel):
    prohibitedPhrases: List[str] = Field(
        default_factory=lambda: DEFAULT_PROHIBITED.copy()
    )
    requiredTerms: List[str] = Field(
        default_factory=lambda: DEFAULT_REQUIRED.copy()
    )


class ContentRequest(BaseModel):
    content: str = Field(min_length=1, max_length=10000)
    guidelines: Guidelines = Field(default_factory=Guidelines)


def clean_phrase_list(phrases: List[str]) -> List[str]:
    """Remove blank and duplicate phrases while preserving order."""
    result = []
    seen = set()

    for phrase in phrases:
        phrase = phrase.strip()
        key = phrase.casefold()

        if phrase and key not in seen:
            result.append(phrase)
            seen.add(key)

    return result


def analyze_text(content: str, guidelines: Guidelines) -> list[dict]:
    """Check content against configured brand guidelines."""
    findings = []

    for phrase in clean_phrase_list(guidelines.prohibitedPhrases):
        if re.search(re.escape(phrase), content, re.IGNORECASE):
            findings.append(
                {
                    "type": "prohibited_phrase",
                    "severity": "high",
                    "matched_text": phrase,
                    "explanation": (
                        f'The content contains the prohibited phrase "{phrase}".'
                    ),
                    "suggestion": SUGGESTIONS.get(
                        phrase.casefold(),
                        "Replace this wording with a clear, supportable statement.",
                    ),
                }
            )

    for term in clean_phrase_list(guidelines.requiredTerms):
        if not re.search(re.escape(term), content, re.IGNORECASE):
            findings.append(
                {
                    "type": "missing_required_term",
                    "severity": "medium",
                    "matched_text": term,
                    "explanation": f'The required brand term "{term}" is missing.',
                    "suggestion": f'Include "{term}" naturally where appropriate.',
                }
            )

    return findings


def replace_phrase(text: str, phrase: str, replacement: str) -> str:
    """Replace a phrase without case-sensitive matching."""
    return re.sub(
        re.escape(phrase),
        lambda match: replacement,
        text,
        flags=re.IGNORECASE,
    )


def rewrite_guaranteed_results(text: str) -> str:
    """Handle common sentences with prohibited guarantee claims."""
    patterns = [
        (
            r"\bBrandShield\s+delivers\s+guaranteed results"
            r"\s+for every customer\.?",
            "BrandShield is designed to help every customer achieve "
            "their goals.",
        ),
        (
            r"\bWe\s+guarantee\s+results\b",
            "We work to help you achieve your goals",
        ),
        (
            r"\bguaranteed results\s+for every customer\b",
            "support designed to help every customer reach their goals",
        ),
    ]

    for pattern, replacement in patterns:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)

    return text


def rewrite_promotional_content(text: str) -> str:
    """Make the common promotional example read naturally."""
    return re.sub(
        r"\bGet it today\s+with our\s+limited time offer\b",
        "Get it today to explore our offer",
        text,
        flags=re.IGNORECASE,
    )


def rewrite_text(
    content: str,
    guidelines: Guidelines,
) -> tuple[str, list[dict]]:
    """Rewrite prohibited wording and check the result again."""
    rewritten = content

    # Apply context-aware replacements before general phrase replacements.
    rewritten = rewrite_guaranteed_results(rewritten)
    rewritten = rewrite_promotional_content(rewritten)

    for phrase in clean_phrase_list(guidelines.prohibitedPhrases):
        replacement = SUGGESTIONS.get(
            phrase.casefold(),
            "a clear and supportable alternative",
        )
        rewritten = replace_phrase(rewritten, phrase, replacement)

    # Add required terms that are missing.
    for term in clean_phrase_list(guidelines.requiredTerms):
        if not re.search(re.escape(term), rewritten, re.IGNORECASE):
            if term.casefold() == "brandshield":
                rewritten = f"BrandShield: {rewritten.lstrip()}"
            elif term.casefold() == "customer first":
                rewritten = (
                    f"{rewritten.rstrip().rstrip('.')} "
                    "— with a customer first approach."
                )
            else:
                rewritten = f"{rewritten.rstrip().rstrip('.')} {term}."

    # Tidy spacing and punctuation.
    rewritten = re.sub(r"[ \t]{2,}", " ", rewritten)
    rewritten = re.sub(r"\s+([,.;!?])", r"\1", rewritten)
    rewritten = rewritten.strip()

    remaining_findings = analyze_text(rewritten, guidelines)

    return rewritten, remaining_findings


@app.get("/")
def root():
    return {
        "project": "BrandShield AI",
        "message": "Brand governance API is running.",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "project": "BrandShield AI",
    }


@app.post("/analyze")
def analyze(request: ContentRequest):
    findings = analyze_text(request.content, request.guidelines)

    return {
        "project": "BrandShield AI",
        "character_count": len(request.content),
        "findings_count": len(findings),
        "findings": findings,
        "status": "clean" if not findings else "issues_found",
        "notice": (
            "No configured violations detected."
            if not findings
            else "Review the findings before publishing."
        ),
    }


@app.post("/rewrite")
def rewrite(request: ContentRequest):
    rewritten, remaining_findings = rewrite_text(
        request.content,
        request.guidelines,
    )

    return {
        "project": "BrandShield AI",
        "original_content": request.content,
        "rewritten_content": rewritten,
        "character_count": len(rewritten),
        "findings_count": len(remaining_findings),
        "findings": remaining_findings,
        "status": "clean" if not remaining_findings else "issues_found",
        "notice": (
            "Rewrite generated. Review it before publishing."
            if not remaining_findings
            else "The rewrite still has findings. Review and edit it "
            "before publishing."
        ),
    }
