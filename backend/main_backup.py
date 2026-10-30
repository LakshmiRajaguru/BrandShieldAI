
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="BrandShield AI",
    description="An evidence-driven brand-governance platform",
    version="1.0.0",
)

# Allow the local React frontend to access this API.
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

BANNED_PHRASES = [
    "best in the world",
    "guaranteed results",
    "100% risk-free",
]

SUGGESTIONS = {
    "best in the world": "a trusted choice for your needs",
    "guaranteed results": "designed to help you achieve your goals",
    "100% risk-free": "designed with safety in mind",
}

REQUIRED_TERMS = ["BrandShield"]


class ContentRequest(BaseModel):
    content: str


@app.get("/")
def home():
    return {
        "message": "Welcome to BrandShield AI!",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/analyze")
def analyze_content(request: ContentRequest):
    content = request.content
    content_lower = content.lower()
    findings = []

    for phrase in BANNED_PHRASES:
        if phrase in content_lower:
            findings.append({
                "type": "prohibited_phrase",
                "severity": "high",
                "matched_text": phrase,
                "explanation": (
                    f"'{phrase}' is prohibited by the demo "
                    "brand guidelines."
                ),
                "suggestion": SUGGESTIONS[phrase],
            })

    for term in REQUIRED_TERMS:
        if term.lower() not in content_lower:
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

    return {
        "project": "BrandShield AI",
        "character_count": len(content),
        "findings_count": len(findings),
        "findings": findings,
        "status": (
            "review_required"
            if findings
            else "no_rule_violations_detected"
        ),
        "notice": (
            "Demo rule checks only. No findings does not "
            "guarantee compliance."
        ),
    }
