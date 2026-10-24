import { useEffect, useMemo, useState } from "react";
import BrandGuidelines, {
  loadGuidelines,
} from "./components/BrandGuidelines.jsx";
import AuditReport from "./components/AuditReport.jsx";
import "./index.css";

// Use the Render backend in production and the local backend in development.
const API_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const HISTORY_KEY = "brandshield-audit-history-v1";

const EXAMPLES = [
  {
    id: "marketing",
    title: "Marketing claim",
    description: "Review an exaggerated marketing claim.",
    content:
      "Our product is the best in the world! We guarantee results for every customer, and it is 100% risk-free. Buy today!",
  },
  {
    id: "promotional",
    title: "Promotional messaging",
    description: "Improve promotional wording and remove risky phrases.",
    content:
      "BrandShield is our customer first solution. Get it today with our limited time offer!",
  },
  {
    id: "clean",
    title: "Clean brand messaging",
    description: "Try a message that follows the default guidelines.",
    content:
      "BrandShield helps teams review marketing content and maintain consistent brand messaging.",
  },
];

const NAVIGATION = [
  { label: "Overview", icon: "◫" },
  { label: "Content Audit", icon: "⌕" },
  { label: "Smart Rewrite", icon: "✦" },
  { label: "Audit Report", icon: "▤" },
  { label: "Brand Guidelines", icon: "⚙" },
];

function readHistory() {
  try {
    const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Could not save audit history:", error);
  }
}

function getFindings(data) {
  if (Array.isArray(data?.findings)) return data.findings;
  if (Array.isArray(data?.issues)) return data.issues;
  return [];
}

function getSeverity(finding) {
  const value = String(
    finding?.severity || finding?.level || "medium"
  ).toLowerCase();

  if (value.includes("high") || value.includes("critical")) return "high";
  if (value.includes("low")) return "low";
  return "medium";
}

function getFindingMessage(finding) {
  return (
    finding?.message ||
    finding?.description ||
    finding?.issue ||
    finding?.phrase ||
    "A guideline issue was detected."
  );
}

function getRewrittenText(data) {
  return (
    data?.rewritten_content ||
    data?.rewritten_text ||
    data?.rewrittenContent ||
    data?.rewritten ||
    data?.content ||
    ""
  );
}

function formatDate(value) {
  if (!value) return "Just now";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return date.toLocaleString();
}

function normalizeAudit(data, content) {
  const auditFindings = getFindings(data);

  return {
    ...data,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content,
    findings: auditFindings,
    status: auditFindings.length === 0 ? "clean" : "needs-review",
    timestamp: new Date().toISOString(),
  };
}

export default function App() {
  const [page, setPage] = useState("Overview");
  const [guidelines, setGuidelines] = useState(() => loadGuidelines());

  const [auditText, setAuditText] = useState("");
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteResult, setRewriteResult] = useState("");
  const [rewriteValidation, setRewriteValidation] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");

  const [result, setResult] = useState(null);
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [history, setHistory] = useState(() => readHistory());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rewriteError, setRewriteError] = useState("");

  const findings = useMemo(() => getFindings(result), [result]);

  const highCount = findings.filter(
    (finding) => getSeverity(finding) === "high"
  ).length;

  const mediumCount = findings.filter(
    (finding) => getSeverity(finding) === "medium"
  ).length;

  const lowCount = findings.filter(
    (finding) => getSeverity(finding) === "low"
  ).length;

  const cleanCount = history.filter(
    (item) => item.status === "clean"
  ).length;

  const totalFindings = history.reduce(
    (total, item) => total + (item.findings?.length || 0),
    0
  );

  const cleanRate = history.length
    ? Math.round((cleanCount / history.length) * 100)
    : 0;

  useEffect(() => {
    saveHistory(history);
  }, [history]);

  function updateGuidelines(nextGuidelines) {
    setGuidelines(nextGuidelines);
    setResult(null);
    setError("");
  }

  function startNewAudit() {
    setAuditText("");
    setResult(null);
    setSelectedAudit(null);
    setError("");
    setPage("Content Audit");
  }

  function tryExample(example) {
    setRewriteText(example.content);
    setRewriteResult("");
    setRewriteValidation(null);
    setCopyMessage("");
    setRewriteError("");

    setAuditText(example.content);
    setResult(null);
    setSelectedAudit(null);
    setError("");

    setPage("Smart Rewrite");
  }

  async function runAudit(textToAudit = auditText) {
    const content = String(textToAudit || "").trim();

    if (!content) {
      setError("Enter some content before running an audit.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          content,
          guidelines,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Audit failed with status ${response.status}.`
        );
      }

      const audit = normalizeAudit(data, content);

      setResult(audit);
      setSelectedAudit(audit);
      setAuditText(content);
      setHistory((previous) => [audit, ...previous].slice(0, 100));
    } catch (requestError) {
      setError(
        `${requestError.message} Check that the backend is available at ${API_URL}.`
      );
    } finally {
      setLoading(false);
    }
  }

  async function runRewrite() {
    const content = rewriteText.trim();

    if (!content) {
      setRewriteError("Enter marketing copy before using Smart Rewrite.");
      return;
    }

    setLoading(true);
    setRewriteError("");
    setRewriteResult("");
    setRewriteValidation(null);
    setCopyMessage("");

    try {
      const response = await fetch(`${API_URL}/rewrite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          content,
          guidelines,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            `Rewrite failed with status ${response.status}.`
        );
      }

      const rewritten = getRewrittenText(data);

      if (!rewritten) {
        throw new Error(
          "The backend did not return rewritten text. Check the /rewrite endpoint in backend/main.py."
        );
      }

      setRewriteResult(rewritten);

      const remainingFindings = Array.isArray(data.remaining_findings)
        ? data.remaining_findings
        : Array.isArray(data.findings)
          ? data.findings
          : [];

      setRewriteValidation({
        findings: remainingFindings,
        count: remainingFindings.length,
        manualReview:
          typeof data.manual_review === "boolean"
            ? data.manual_review
            : remainingFindings.length > 0,
      });

      setCopyMessage("");
    } catch (requestError) {
      setRewriteError(
        `${requestError.message} Check that the backend is available at ${API_URL}.`
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyRewrittenText() {
    if (!rewriteResult.trim()) return;

    try {
      await navigator.clipboard.writeText(rewriteResult);
      setCopyMessage("Rewritten text copied successfully.");
    } catch {
      setCopyMessage(
        "Copy was unavailable. Select the rewritten text and copy it manually."
      );
    }
  }

  function useRewrittenText() {
    if (!rewriteResult.trim()) return;

    setAuditText(rewriteResult);
    setResult(null);
    setSelectedAudit(null);
    setError("");
    setPage("Content Audit");
  }

  function openAudit(audit) {
    setSelectedAudit(audit);
    setResult(audit);
    setAuditText(audit.content || "");
    setPage("Audit Report");
  }

  function downloadHistory() {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "brandshield-audit-history.json";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="brand-lockup"
          onClick={() => setPage("Overview")}
          aria-label="Go to Overview"
        >
          <span className="brand-mark">B</span>
          <span>
            <strong>BrandShield</strong>
            <small>AI GOVERNANCE WORKSPACE</small>
          </span>
        </button>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-nav">
          {NAVIGATION.map((item) => (
            <button
              key={item.label}
              className={`nav-item ${
                page === item.label ? "active" : ""
              }`}
              onClick={() => setPage(item.label)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>

              {item.label === "Audit Report" && history.length > 0 && (
                <span className="nav-count">{history.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="status-dot" />
          <span>Governance checks enabled</span>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>BrandShield</span>
            <span>/</span>
            <strong>{page}</strong>
          </div>

          <button
            className="button button-primary"
            onClick={startNewAudit}
          >
            + New audit
          </button>
        </header>

        <div className="page-content">
          {page === "Overview" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">BRAND GOVERNANCE</div>
                  <h1>Overview</h1>
                  <p>
                    Protect your brand identity with consistent, trustworthy
                    content.
                  </p>
                </div>
              </section>

              <section className="stats-grid">
                <article className="stat-card">
                  <span className="stat-label">Total audits</span>
                  <strong className="stat-value">{history.length}</strong>
                  <span className="stat-note">Audits in this browser</span>
                </article>

                <article className="stat-card">
                  <span className="stat-label">Clean audits</span>
                  <strong className="stat-value">{cleanCount}</strong>
                  <span className="stat-note">No guideline findings</span>
                </article>

                <article className="stat-card">
                  <span className="stat-label">Findings detected</span>
                  <strong className="stat-value">{totalFindings}</strong>
                  <span className="stat-note">Across saved audits</span>
                </article>

                <article className="stat-card">
                  <span className="stat-label">Clean rate</span>
                  <strong className="stat-value">{cleanRate}%</strong>
                  <span className="stat-note">Of saved audits</span>
                </article>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <h2>Quick start</h2>
                    <p>
                      Choose an example to open Smart Rewrite with the selected
                      text already filled in.
                    </p>
                  </div>
                </div>

                <div className="example-grid">
                  {EXAMPLES.map((example) => (
                    <article className="example-card" key={example.id}>
                      <div className="example-icon">
                        {example.id === "marketing"
                          ? "⚠"
                          : example.id === "promotional"
                            ? "✦"
                            : "✓"}
                      </div>

                      <h3>{example.title}</h3>
                      <p>{example.description}</p>

                      <div className="example-preview">
                        {example.content}
                      </div>

                      <button
                        className="button button-secondary"
                        onClick={() => tryExample(example)}
                      >
                        Rewrite this example →
                      </button>
                    </article>
                  ))}
                </div>
              </section>

              <section className="section-block">
                <div className="section-heading">
                  <div>
                    <h2>Recent audits</h2>
                    <p>Review your latest content checks.</p>
                  </div>

                  {history.length > 0 && (
                    <button
                      className="button button-secondary"
                      onClick={downloadHistory}
                    >
                      Export history
                    </button>
                  )}
                </div>

                {history.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">▤</div>
                    <h3>No audits yet</h3>
                    <p>
                      Start with a marketing example or create a new audit.
                    </p>

                    <button
                      className="button button-primary"
                      onClick={startNewAudit}
                    >
                      Start your first audit
                    </button>
                  </div>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Content</th>
                          <th>Date</th>
                          <th>Findings</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>

                      <tbody>
                        {history.slice(0, 8).map((audit) => (
                          <tr key={audit.id}>
                            <td className="content-cell">
                              {(audit.content || "").slice(0, 65)}
                              {(audit.content || "").length > 65 ? "…" : ""}
                            </td>
                            <td>{formatDate(audit.timestamp)}</td>
                            <td>{audit.findings?.length || 0}</td>
                            <td>
                              <span
                                className={`status-badge ${
                                  audit.status === "clean"
                                    ? "status-clean"
                                    : "status-warning"
                                }`}
                              >
                                {audit.status === "clean"
                                  ? "Clean"
                                  : "Needs review"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="text-button"
                                onClick={() => openAudit(audit)}
                              >
                                View report
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}

          {page === "Content Audit" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">CONTENT GOVERNANCE</div>
                  <h1>Content audit</h1>
                  <p>
                    Check your content against your current brand guidelines.
                  </p>
                </div>
              </section>

              <section className="workspace-card">
                <div className="section-heading">
                  <div>
                    <h2>Content to audit</h2>
                    <p>Paste the text you want BrandShield to review.</p>
                  </div>

                  <span className="small-muted">
                    {auditText.length} characters
                  </span>
                </div>

                <textarea
                  className="content-textarea"
                  value={auditText}
                  onChange={(event) => setAuditText(event.target.value)}
                  placeholder="Paste your marketing copy here..."
                  rows={9}
                />

                <div className="editor-footer">
                  <span className="small-muted">
                    Your configured brand guidelines will be applied.
                  </span>

                  <button
                    className="button button-primary"
                    onClick={() => runAudit()}
                    disabled={loading}
                  >
                    {loading ? "Checking..." : "Run content audit →"}
                  </button>
                </div>

                {error && <div className="error-message">{error}</div>}
              </section>

              {result && (
                <section className="workspace-card result-card">
                  <div className="section-heading">
                    <div>
                      <div className="eyebrow">AUDIT RESULTS</div>
                      <h2>
                        {findings.length === 0
                          ? "No guideline issues detected"
                          : "Review recommended"}
                      </h2>
                    </div>

                    <span
                      className={`status-badge ${
                        findings.length === 0
                          ? "status-clean"
                          : "status-warning"
                      }`}
                    >
                      {findings.length === 0 ? "Clean" : "Needs review"}
                    </span>
                  </div>

                  <div className="stats-grid compact-stats">
                    <article className="stat-card">
                      <span className="stat-label">Total findings</span>
                      <strong className="stat-value">{findings.length}</strong>
                    </article>

                    <article className="stat-card">
                      <span className="stat-label">High severity</span>
                      <strong className="stat-value">{highCount}</strong>
                    </article>

                    <article className="stat-card">
                      <span className="stat-label">Medium severity</span>
                      <strong className="stat-value">{mediumCount}</strong>
                    </article>

                    <article className="stat-card">
                      <span className="stat-label">Low severity</span>
                      <strong className="stat-value">{lowCount}</strong>
                    </article>
                  </div>

                  {findings.length === 0 ? (
                    <div className="success-message">
                      Your content passed the configured checks. Continue to
                      review factual accuracy and context before publishing.
                    </div>
                  ) : (
                    <div className="findings-list">
                      {findings.map((finding, index) => (
                        <article
                          className="finding-item"
                          key={`${getFindingMessage(finding)}-${index}`}
                        >
                          <span
                            className={`severity-badge severity-${getSeverity(
                              finding
                            )}`}
                          >
                            {getSeverity(finding)}
                          </span>

                          <div>
                            <strong>{getFindingMessage(finding)}</strong>

                            {finding.suggestion && (
                              <p>Suggestion: {finding.suggestion}</p>
                            )}

                            {finding.recommendation && (
                              <p>
                                Recommendation: {finding.recommendation}
                              </p>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}

                  <div className="editor-footer">
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setRewriteText(auditText);
                        setRewriteResult("");
                        setRewriteError("");
                        setPage("Smart Rewrite");
                      }}
                    >
                      Improve with Smart Rewrite →
                    </button>

                    <button
                      className="button button-primary"
                      onClick={() => {
                        setSelectedAudit(result);
                        setPage("Audit Report");
                      }}
                    >
                      View full report →
                    </button>
                  </div>
                </section>
              )}
            </>
          )}

          {page === "Smart Rewrite" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">AI-ASSISTED CONTENT</div>
                  <h1>Smart Rewrite</h1>
                  <p>
                    Improve wording while applying your configured brand
                    guidelines.
                  </p>
                </div>
              </section>

              <section className="rewrite-grid">
                <article className="workspace-card">
                  <div className="section-heading">
                    <div>
                      <h2>Original content</h2>
                      <p>Enter or edit your marketing copy.</p>
                    </div>
                  </div>

                  <textarea
                    className="content-textarea"
                    value={rewriteText}
                    onChange={(event) => {
                      setRewriteText(event.target.value);
                      setRewriteResult("");
                      setRewriteValidation(null);
                      setCopyMessage("");
                      setRewriteError("");
                    }}
                    placeholder="Paste any marketing copy here..."
                    rows={12}
                  />

                  <div className="editor-footer">
                    <span className="small-muted">
                      {rewriteText.length} characters
                    </span>

                    <button
                      className="button button-primary"
                      onClick={runRewrite}
                      disabled={loading}
                    >
                      {loading ? "Rewriting..." : "Rewrite content ✦"}
                    </button>
                  </div>

                  {rewriteError && (
                    <div className="error-message">{rewriteError}</div>
                  )}
                </article>

                <article className="workspace-card">
                  <div className="section-heading">
                    <div>
                      <h2>Suggested rewrite</h2>
                      <p>Review the revised version before using it.</p>
                    </div>
                  </div>

                  {rewriteResult ? (
                    <>
                      <textarea
                        className="content-textarea"
                        value={rewriteResult}
                        onChange={(event) =>
                          setRewriteResult(event.target.value)
                        }
                        rows={12}
                      />

                      {rewriteValidation && (
                        <section className="rewrite-validation">
                          <div className="section-heading">
                            <div>
                              <h3>Guideline validation</h3>
                              <p>
                                The rewritten content was checked against your
                                active brand guidelines.
                              </p>
                            </div>

                            <span
                              className={`status-badge ${
                                rewriteValidation.count === 0
                                  ? "status-clean"
                                  : "status-warning"
                              }`}
                            >
                              {rewriteValidation.count === 0
                                ? "No rule violations"
                                : "Review required"}
                            </span>
                          </div>

                          <p>
                            Remaining findings:{" "}
                            <strong>{rewriteValidation.count}</strong>
                          </p>

                          {rewriteValidation.count === 0 ? (
                            <div className="success-message">
                              No configured guideline violations were
                              detected. Review the meaning and factual accuracy
                              before publishing.
                            </div>
                          ) : (
                            <div className="findings-list">
                              {rewriteValidation.findings.map(
                                (finding, index) => (
                                  <article
                                    className="finding-item"
                                    key={`${getFindingMessage(finding)}-${index}`}
                                  >
                                    <span
                                      className={`severity-badge severity-${getSeverity(
                                        finding
                                      )}`}
                                    >
                                      {getSeverity(finding)}
                                    </span>

                                    <div>
                                      <strong>
                                        {getFindingMessage(finding)}
                                      </strong>

                                      {finding.suggestion && (
                                        <p>
                                          Suggestion: {finding.suggestion}
                                        </p>
                                      )}
                                    </div>
                                  </article>
                                )
                              )}
                            </div>
                          )}

                          {rewriteValidation.manualReview && (
                            <p className="small-muted">
                              Manual review is recommended before publishing.
                            </p>
                          )}
                        </section>
                      )}

                      <div className="editor-footer">
                        <button
                          className="button button-secondary"
                          onClick={() => {
                            setAuditText(rewriteResult);
                            setResult(null);
                            setSelectedAudit(null);
                            setError("");
                            setPage("Content Audit");
                          }}
                        >
                          Audit rewritten copy
                        </button>

                        <button
                          className="button button-secondary"
                          onClick={copyRewrittenText}
                        >
                          Copy rewritten text
                        </button>

                        <button
                          className="button button-primary"
                          onClick={useRewrittenText}
                        >
                          Use rewritten copy →
                        </button>
                      </div>

                      {copyMessage && (
                        <p className="small-muted" role="status">
                          {copyMessage}
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="rewrite-placeholder">
                      <div className="empty-icon">✦</div>
                      <h3>Your rewrite will appear here</h3>
                      <p>
                        Enter your copy on the left and select Rewrite content
                        to generate a suggestion.
                      </p>
                    </div>
                  )}
                </article>
              </section>

              <section className="workspace-card">
                <h2>Active guideline checks</h2>

                <div className="guideline-summary">
                  <div>
                    <strong>
                      {guidelines.prohibitedPhrases?.length || 0}
                    </strong>
                    <span>Prohibited phrases</span>
                  </div>

                  <div>
                    <strong>{guidelines.requiredTerms?.length || 0}</strong>
                    <span>Required terms</span>
                  </div>

                  <button
                    className="button button-secondary"
                    onClick={() => setPage("Brand Guidelines")}
                  >
                    Edit guidelines
                  </button>
                </div>
              </section>
            </>
          )}

          {page === "Audit Report" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">AUDIT DETAILS</div>
                  <h1>Audit report</h1>
                  <p>
                    Review findings and recommendations for audited content.
                  </p>
                </div>

                <button
                  className="button button-secondary"
                  onClick={downloadHistory}
                  disabled={history.length === 0}
                >
                  Export history
                </button>
              </section>

              {selectedAudit || result ? (
                <AuditReport report={selectedAudit || result} />
              ) : history.length > 0 ? (
                <section className="workspace-card">
                  <h2>Select an audit</h2>
                  <p>Choose a previous audit to view its report.</p>

                  <div className="history-list">
                    {history.map((audit) => (
                      <button
                        className="history-item"
                        key={audit.id}
                        onClick={() => openAudit(audit)}
                      >
                        <span>
                          <strong>
                            {(audit.content || "Untitled audit").slice(0, 90)}
                          </strong>
                          <small>{formatDate(audit.timestamp)}</small>
                        </span>

                        <span className="text-button">View report →</span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">▤</div>
                  <h3>No audit reports yet</h3>
                  <p>Run an audit to generate your first report.</p>

                  <button
                    className="button button-primary"
                    onClick={startNewAudit}
                  >
                    Start an audit
                  </button>
                </div>
              )}
            </>
          )}

          {page === "Brand Guidelines" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">CONFIGURATION</div>
                  <h1>Brand Guidelines</h1>
                  <p>
                    Configure prohibited phrases and required terms for your
                    brand.
                  </p>
                </div>
              </section>

              <BrandGuidelines
                guidelines={guidelines}
                onGuidelinesChange={updateGuidelines}
              />
            </>
          )}
        </div>

        <footer className="app-footer">
          BrandShield AI · Responsible brand governance · Always review
          generated content before publishing.
        </footer>
      </main>
    </div>
  );
}