
import { useState } from "react";

export const DEFAULT_GUIDELINES = {
  prohibitedPhrases: [
    "best in the world",
    "guaranteed results",
    "100% risk-free",
  ],
  requiredTerms: ["BrandShield"],
};

export const STORAGE_KEY = "brandshield-guidelines-v1";

export function loadGuidelines() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed = JSON.parse(saved);

      if (
        Array.isArray(parsed.prohibitedPhrases) &&
        Array.isArray(parsed.requiredTerms)
      ) {
        return parsed;
      }
    }
  } catch (error) {
    console.error("Unable to load guidelines:", error);
  }

  return {
    prohibitedPhrases: [...DEFAULT_GUIDELINES.prohibitedPhrases],
    requiredTerms: [...DEFAULT_GUIDELINES.requiredTerms],
  };
}

export default function BrandGuidelines({
  guidelines,
  onGuidelinesChange,
}) {
  const [phraseInput, setPhraseInput] = useState("");
  const [termInput, setTermInput] = useState("");
  const [message, setMessage] = useState("");

  function updateGuidelines(next) {
    onGuidelinesChange(next);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setMessage("Guidelines saved in this browser.");
    } catch (error) {
      console.error("Unable to save guidelines:", error);
      setMessage("Could not save guidelines in this browser.");
    }
  }

  function addEntry(field, input, clearInput) {
    const value = input.trim();

    if (!value) {
      setMessage("Enter a phrase or term first.");
      return;
    }

    if (value.length > 200) {
      setMessage("Entries must be 200 characters or fewer.");
      return;
    }

    const entries = guidelines[field];

    if (entries.some((entry) => entry.toLowerCase() === value.toLowerCase())) {
      setMessage("That entry already exists.");
      return;
    }

    if (entries.length >= 100) {
      setMessage("A maximum of 100 entries is allowed per category.");
      return;
    }

    updateGuidelines({
      ...guidelines,
      [field]: [...entries, value],
    });

    clearInput("");
  }

  function removeEntry(field, value) {
    updateGuidelines({
      ...guidelines,
      [field]: guidelines[field].filter((entry) => entry !== value),
    });
  }

  function restoreDefaults() {
    updateGuidelines({
      prohibitedPhrases: [...DEFAULT_GUIDELINES.prohibitedPhrases],
      requiredTerms: [...DEFAULT_GUIDELINES.requiredTerms],
    });
    setPhraseInput("");
    setTermInput("");
    setMessage("Default guidelines restored.");
  }

  function renderEntries(field) {
    const entries = guidelines[field];

    return (
      <div className="guideline-list">
        {entries.map((entry) => (
          <div className="guideline-list-item" key={entry}>
            <span
              className={`guideline-dot ${
                field === "prohibitedPhrases"
                  ? "prohibited-dot"
                  : "required-dot"
              }`}
            />
            <span className="guideline-entry">{entry}</span>
            <button
              type="button"
              className="remove-rule-button"
              onClick={() => removeEntry(field, entry)}
              aria-label={`Remove ${entry}`}
            >
              Remove
            </button>
          </div>
        ))}

        {entries.length === 0 && (
          <p className="muted-text">No entries configured yet.</p>
        )}
      </div>
    );
  }

  return (
    <section className="page-section">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BRAND GOVERNANCE</p>
          <h1>Brand guidelines</h1>
          <p className="muted-text">
            Configure the phrases to avoid and the terms your content
            should include. Your audit will use these rules.
          </p>
        </div>

        <button
          className="secondary-button"
          type="button"
          onClick={restoreDefaults}
        >
          Restore defaults
        </button>
      </div>

      {message && (
        <p className="notice-message" role="status">
          {message}
        </p>
      )}

      <div className="guidelines-grid">
        <article className="panel guideline-panel">
          <div className="panel-heading">
            <span className="rule-symbol danger-symbol">!</span>
            <div>
              <h2>Prohibited phrases</h2>
              <p className="muted-text">
                Content containing these phrases receives a high-severity
                finding.
              </p>
            </div>
          </div>

          <form
            className="add-rule-form"
            onSubmit={(event) => {
              event.preventDefault();
              addEntry(
                "prohibitedPhrases",
                phraseInput,
                setPhraseInput
              );
            }}
          >
            <input
              value={phraseInput}
              onChange={(event) => setPhraseInput(event.target.value)}
              placeholder="e.g. guaranteed success"
              maxLength={200}
              aria-label="New prohibited phrase"
            />
            <button type="submit" className="primary-button">
              Add phrase
            </button>
          </form>

          {renderEntries("prohibitedPhrases")}

          <p className="list-count">
            {guidelines.prohibitedPhrases.length} configured phrases
          </p>
        </article>

        <article className="panel guideline-panel">
          <div className="panel-heading">
            <span className="rule-symbol success-symbol">✓</span>
            <div>
              <h2>Required terms</h2>
              <p className="muted-text">
                Content that omits these terms receives a medium-severity
                finding.
              </p>
            </div>
          </div>

          <form
            className="add-rule-form"
            onSubmit={(event) => {
              event.preventDefault();
              addEntry("requiredTerms", termInput, setTermInput);
            }}
          >
            <input
              value={termInput}
              onChange={(event) => setTermInput(event.target.value)}
              placeholder="e.g. trusted by design"
              maxLength={200}
              aria-label="New required term"
            />
            <button type="submit" className="primary-button">
              Add term
            </button>
          </form>

          {renderEntries("requiredTerms")}

          <p className="list-count">
            {guidelines.requiredTerms.length} configured terms
          </p>
        </article>
      </div>

      <div className="panel guidelines-help">
        <h2>How these rules work</h2>
        <p className="muted-text">
          Changes are saved in this browser and sent to the backend whenever
          you run an audit. Matching is case-insensitive. A required term
          passes when that text appears anywhere in the submitted content.
        </p>
      </div>
    </section>
  );
}
