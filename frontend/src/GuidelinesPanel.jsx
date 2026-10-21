
import { useEffect, useState } from "react";

const API_URL = "http://127.0.0.1:8000";

const panelStyle = {
  background: "var(--panel, #ffffff)",
  border: "1px solid var(--border, #e5e7eb)",
  borderRadius: "14px",
  padding: "22px",
  marginTop: "16px",
};

const textareaStyle = {
  width: "100%",
  minHeight: "120px",
  boxSizing: "border-box",
  padding: "12px",
  marginTop: "8px",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  font: "inherit",
  resize: "vertical",
};

export default function GuidelinesPanel() {
  const [prohibitedText, setProhibitedText] = useState("");
  const [requiredText, setRequiredText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGuidelines() {
      try {
        const response = await fetch(`${API_URL}/guidelines`);

        if (!response.ok) {
          throw new Error("Could not load brand guidelines.");
        }

        const data = await response.json();

        setProhibitedText(
          (data.prohibited_phrases || []).join("\n")
        );
        setRequiredText(
          (data.required_terms || []).join("\n")
        );
      } catch (err) {
        setError(
          `${err.message} Make sure the FastAPI backend is running.`
        );
      } finally {
        setLoading(false);
      }
    }

    loadGuidelines();
  }, []);

  async function saveGuidelines(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const toList = (value) =>
      value
        .split("\n")
        .map((term) => term.trim())
        .filter(Boolean);

    try {
      const response = await fetch(`${API_URL}/guidelines`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prohibited_phrases: toList(prohibitedText),
          required_terms: toList(requiredText),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not save brand guidelines."
        );
      }

      setProhibitedText(
        data.guidelines.prohibited_phrases.join("\n")
      );
      setRequiredText(
        data.guidelines.required_terms.join("\n")
      );
      setMessage("Brand guidelines saved successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={panelStyle}>Loading brand guidelines...</div>;
  }

  return (
    <section id="guidelines" style={panelStyle}>
      <div style={{ marginBottom: "22px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "1px" }}>
          BRAND CONFIGURATION
        </p>
        <h2 style={{ margin: "8px 0" }}>Brand guidelines</h2>
        <p>
          Customize the rules used by your content audit. Enter one
          phrase or term per line.
        </p>
      </div>

      <form onSubmit={saveGuidelines}>
        <div style={{ marginBottom: "24px" }}>
          <label htmlFor="prohibited-phrases">
            <strong>Prohibited phrases</strong>
          </label>
          <p style={{ fontSize: "14px" }}>
            Content containing these phrases receives a high-severity
            finding.
          </p>
          <textarea
            id="prohibited-phrases"
            style={textareaStyle}
            value={prohibitedText}
            onChange={(event) => setProhibitedText(event.target.value)}
            placeholder={"best in the world\nguaranteed results\n100% risk-free"}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label htmlFor="required-terms">
            <strong>Required terms</strong>
          </label>
          <p style={{ fontSize: "14px" }}>
            Every required term must appear in the content for it to
            pass this particular rule check.
          </p>
          <textarea
            id="required-terms"
            style={textareaStyle}
            value={requiredText}
            onChange={(event) => setRequiredText(event.target.value)}
            placeholder={"BrandShield\ncustomer support"}
          />
        </div>

        {message && (
          <p role="status" style={{ color: "green" }}>
            {message}
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: "#b91c1c" }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save brand guidelines"}
        </button>
      </form>
    </section>
  );
}
