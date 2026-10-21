
import React from "react";

function getSeverity(finding) {
  const severity = String(finding?.severity || "").toLowerCase();

  if (severity === "high" || severity === "critical") {
    return "High";
  }

  if (severity === "low" || severity === "info" || severity === "informational") {
    return "Low";
  }

  return "Medium";
}

function getFindingText(finding) {
  return (
    finding?.matched_text ||
    finding?.matchedText ||
    finding?.message ||
    finding?.type ||
    "Unspecified issue"
  );
}

function getRecommendation(finding) {
  return (
    finding?.suggestion ||
    finding?.recommendation ||
    "Review this issue and update the content before publishing."
  );
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function AuditReport({ report }) {
  if (!report) {
    return null;
  }

  const findings = Array.isArray(report.findings)
    ? report.findings
    : [];

  const content =
    report.content ||
    report.original_content ||
    report.originalContent ||
    "";

  const dateValue =
    report.timestamp ||
    report.created_at ||
    report.createdAt ||
    report.date;

  const auditDate = dateValue
    ? new Date(dateValue).toLocaleString()
    : "Date not available";

  const highCount = findings.filter(
    (finding) => getSeverity(finding) === "High"
  ).length;

  const mediumCount = findings.filter(
    (finding) => getSeverity(finding) === "Medium"
  ).length;

  const lowCount = findings.filter(
    (finding) => getSeverity(finding) === "Low"
  ).length;

  const isClean =
    findings.length === 0 &&
    report.status !== "issues_found";

  const summary = isClean
    ? "No configured violations were detected. Review the content and confirm it meets your publication requirements."
    : `${findings.length} finding(s) require review before publication. Resolve the identified issues and run another audit.`;

  const recommendations = findings.length
    ? [
        ...new Set(
          findings.map((finding) => getRecommendation(finding))
        ),
      ]
    : [
        "No configured violations were detected.",
        "Review factual accuracy and ensure all claims are supported.",
        "Confirm that the content matches the intended audience and brand voice.",
      ];

  const reportData = {
    project: "BrandShield AI",
    report_type: "Brand Governance Audit",
    audit_date: dateValue || null,
    status: isClean ? "clean" : "issues_found",
    summary,
    statistics: {
      total_findings: findings.length,
      high_severity: highCount,
      medium_severity: mediumCount,
      low_severity: lowCount,
    },
    original_content: content,
    findings: findings.map((finding) => ({
      type: finding.type || "brand_guideline",
      severity: getSeverity(finding),
      matched_text: getFindingText(finding),
      explanation: finding.explanation || "Review this finding.",
      recommendation: getRecommendation(finding),
    })),
    recommendations,
    notice: report.notice || "",
    guidelines: report.guidelines || {},
  };

  function downloadTextReport() {
    const lines = [
      "BRANDSHIELD AI",
      "PROFESSIONAL BRAND GOVERNANCE AUDIT",
      "=".repeat(45),
      "",
      `Audit date: ${auditDate}`,
      `Result: ${isClean ? "CLEAN" : "ISSUES FOUND"}`,
      "",
      "EXECUTIVE SUMMARY",
      "-".repeat(25),
      summary,
      "",
      "RISK BREAKDOWN",
      "-".repeat(25),
      `Total findings: ${findings.length}`,
      `High severity: ${highCount}`,
      `Medium severity: ${mediumCount}`,
      `Low severity: ${lowCount}`,
      "",
      "AUDITED CONTENT",
      "-".repeat(25),
      content || "Content not available",
      "",
      "FINDINGS AND RECOMMENDATIONS",
      "-".repeat(35),
    ];

    if (findings.length === 0) {
      lines.push("No configured violations detected.");
    } else {
      findings.forEach((finding, index) => {
        lines.push(
          "",
          `${index + 1}. ${getFindingText(finding)}`,
          `Severity: ${getSeverity(finding)}`,
          `Explanation: ${finding.explanation || "Review this finding."}`,
          `Recommendation: ${getRecommendation(finding)}`
        );
      });
    }

    lines.push(
      "",
      "RECOMMENDED NEXT STEPS",
      "-".repeat(25),
      ...recommendations.map((item, index) => `${index + 1}. ${item}`),
      "",
      "Note: Automated checks support human review; they do not guarantee"
        + " that content is factually accurate or legally compliant."
    );

    downloadFile(
      `brandshield-audit-${Date.now()}.txt`,
      lines.join("\n"),
      "text/plain;charset=utf-8"
    );
  }

  function downloadJsonReport() {
    downloadFile(
      `brandshield-audit-${Date.now()}.json`,
      JSON.stringify(reportData, null, 2),
      "application/json;charset=utf-8"
    );
  }

  const cardStyle = {
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "16px",
    background: "#ffffff",
    color: "#172033",
  };

  const buttonStyle = {
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "10px 14px",
    background: "#ffffff",
    color: "#172033",
    cursor: "pointer",
    fontWeight: 600,
  };

  return (
    <section
      style={{
        display: "grid",
        gap: "18px",
        marginTop: "20px",
        color: "#172033",
      }}
    >
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 6px",
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "1px",
                color: "#64748b",
              }}
            >
              BRAND GOVERNANCE REPORT
            </p>
            <h2 style={{ margin: "0 0 8px" }}>
              Audit report
            </h2>
            <p style={{ margin: 0, color: "#64748b" }}>
              Generated by BrandShield AI
            </p>
          </div>

          <span
            style={{
              borderRadius: "20px",
              padding: "8px 12px",
              fontSize: "13px",
              fontWeight: 700,
              background: isClean ? "#dcfce7" : "#fee2e2",
              color: isClean ? "#166534" : "#991b1b",
            }}
          >
            {isClean ? "CLEAN" : "ISSUES FOUND"}
          </span>
        </div>

        <p
          style={{
            marginTop: "18px",
            marginBottom: "6px",
            fontWeight: 700,
          }}
        >
          Executive summary
        </p>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {summary}
        </p>
        <p
          style={{
            color: "#64748b",
            fontSize: "13px",
            marginBottom: 0,
          }}
        >
          Audit date: {auditDate}
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "12px",
        }}
      >
        {[
          {
            label: "Total findings",
            value: findings.length,
            color: "#172033",
          },
          {
            label: "High severity",
            value: highCount,
            color: "#b91c1c",
          },
          {
            label: "Medium severity",
            value: mediumCount,
            color: "#b45309",
          },
          {
            label: "Low severity",
            value: lowCount,
            color: "#047857",
          },
        ].map((item) => (
          <div key={item.label} style={cardStyle}>
            <p
              style={{
                margin: "0 0 8px",
                color: "#64748b",
                fontSize: "13px",
              }}
            >
              {item.label}
            </p>
            <strong
              style={{
                fontSize: "28px",
                color: item.color,
              }}
            >
              {item.value}
            </strong>
          </div>
        ))}
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Audited content</h3>
        <p
          style={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            lineHeight: 1.7,
            marginBottom: 0,
          }}
        >
          {content || "Original content is not available for this audit."}
        </p>
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Findings and recommendations</h3>

        {findings.length === 0 ? (
          <p>
            No configured violations were detected. Continue with a
            human review before publishing.
          </p>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {findings.map((finding, index) => (
              <div
                key={`${getFindingText(finding)}-${index}`}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "9px",
                  padding: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <strong>
                    {index + 1}. {getFindingText(finding)}
                  </strong>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    {getSeverity(finding)} severity
                  </span>
                </div>

                <p style={{ lineHeight: 1.5 }}>
                  {finding.explanation || "Review this finding."}
                </p>

                <p style={{ marginBottom: 0, lineHeight: 1.5 }}>
                  <strong>Recommendation:</strong>{" "}
                  {getRecommendation(finding)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Recommended next steps</h3>
        <ol style={{ paddingLeft: "22px", lineHeight: 1.8 }}>
          {recommendations.map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ol>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <button
          type="button"
          style={buttonStyle}
          onClick={downloadTextReport}
        >
          Download professional TXT
        </button>

        <button
          type="button"
          style={{
            ...buttonStyle,
            background: "#172033",
            color: "#ffffff",
            borderColor: "#172033",
          }}
          onClick={downloadJsonReport}
        >
          Download professional JSON
        </button>
      </div>

      <p style={{ fontSize: "12px", color: "#64748b", lineHeight: 1.6 }}>
        BrandShield AI provides automated guidance, not a guarantee of
        factual accuracy, legal compliance, or publication readiness.
        A human reviewer should make the final decision.
      </p>
    </section>
  );
}
