import { useEffect, useRef, useState } from "react";

// ─── Date urgency helpers ─────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

// ─── PDF HTML builder — used ONLY for Download PDF ───────────────────────

function buildDocumentHTML(report) {
  const { contract, riskReport, complianceReport, analysis } = report;
  const isBidding = analysis?.contractType === "bidding";
  const riskColor = { HIGH: "#b2483a", MEDIUM: "#c47d22", LOW: "#2e7d52" }[riskReport?.overallRiskLevel] || "#2e7d52";
  const esc = (s) => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const clauseRows = (analysis?.clauses || []).map((c) => `<div class="item"><span class="tag">${esc(c.category?.toUpperCase())}</span><strong>${esc(c.title)}</strong><p>${esc(c.text)}</p></div>`).join("");
  const riskRows = (riskReport?.risks || []).map((r) => `<div class="item risk-item"><span class="tag sev-${r.severity?.toLowerCase()}">${esc(r.severity)}</span><strong>${esc(r.title)}</strong><p>${esc(r.description)}</p></div>`).join("");
  const complianceRows = (complianceReport?.issues || []).map((i) => `<div class="item"><strong>${esc(i.title)}</strong><p>${esc(i.description)}</p>${i.regulationReference ? `<code>${esc(i.regulationReference)}</code>` : ""}</div>`).join("");
  const lawRows = (analysis?.corporateLaws || []).map((l) => `<div class="item"><strong>${esc(l.lawName)}</strong><p>${esc(l.description)}</p></div>`).join("");
  const biddingLawRows = (analysis?.biddingLaws || []).map((l) => `<div class="item"><strong>${esc(l.lawName)}</strong><p>${esc(l.description)}</p></div>`).join("");
  const biddingReqRows = (analysis?.biddingRequirements || []).map((r) => `<div class="item"><strong>${esc(r.title)}</strong><p>${esc(r.description)}</p></div>`).join("");
  const now = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${esc(contract.fileName)}</title><style>*,*::before,*::after{box-sizing:border-box;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a202c;background:#fff;margin:0;padding:0;font-size:12.5px;line-height:1.65;}.page{max-width:800px;margin:0 auto;padding:52px 56px;}.doc-header{border-bottom:3px solid #B8863B;padding-bottom:22px;margin-bottom:30px;}h1{font-family:Georgia,serif;font-size:24px;color:#0f172a;margin:0 0 6px;}.header-sub{font-size:12px;color:#64748b;margin:0 0 12px;font-family:monospace;}.meta-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}.meta-pill{font-family:monospace;font-size:10px;background:#f8fafc;border:1px solid #e2e8f0;padding:3px 10px;border-radius:3px;color:#475569;}.risk-badge{display:inline-block;padding:5px 16px;border-radius:4px;font-family:monospace;font-size:11px;font-weight:700;color:#fff;background:${riskColor};}h2{font-family:Georgia,serif;font-size:16px;color:#0f172a;border-bottom:1.5px solid #e5e7eb;padding-bottom:5px;margin:30px 0 14px;}.item{border-left:3px solid #B8863B;padding:8px 0 8px 14px;margin-bottom:10px;}.item strong{display:block;color:#0f172a;font-size:13px;margin:2px 0 3px;}.item p{margin:0;color:#4b5563;font-size:11.5px;}.tag{display:inline-block;font-size:9.5px;font-family:monospace;padding:2px 8px;border-radius:3px;margin-bottom:5px;background:#fef3c7;color:#92400e;}.risk-item{border-left-color:#dc2626;}.sev-high{background:#fee2e2;color:#991b1b;}.sev-medium{background:#fef3c7;color:#92400e;}.sev-low{background:#dcfce7;color:#166534;}code{display:block;font-family:monospace;font-size:10px;color:#475569;margin-top:4px;background:#f8fafc;padding:3px 8px;border-radius:3px;}.compliance-status{display:inline-block;font-family:monospace;font-size:11px;padding:4px 14px;border-radius:3px;margin-bottom:14px;font-weight:600;}.compliant{background:#dcfce7;color:#166534;}.non-compliant{background:#fee2e2;color:#991b1b;}.summary-text{font-size:13.5px;line-height:1.8;color:#374151;white-space:pre-wrap;}.footer{margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:10px;color:#94a3b8;font-family:monospace;display:flex;justify-content:space-between;}</style></head><body><div class="page"><div class="doc-header"><h1>${esc(contract.fileName)}</h1><p class="header-sub">Legal Analysis Report · Docketwise AI Platform</p><div class="meta-row"><span class="meta-pill">User: ${esc(contract.userCountry)}</span><span class="meta-pill">Employer: ${esc(contract.employerCountry)}</span>${contract.clientCountry ? `<span class="meta-pill">Client: ${esc(contract.clientCountry)}</span>` : ""}<span class="meta-pill">Type: ${esc(analysis?.contractType || "Standard")}</span><span class="meta-pill">Generated: ${esc(now)}</span></div><div style="margin-top:12px;"><span class="risk-badge">RISK: ${esc(riskReport?.overallRiskLevel || "LOW")}</span></div></div><h2>Executive Summary</h2><p class="summary-text">${esc(analysis?.summary || "No summary available.")}</p>${clauseRows ? `<h2>Contract Clauses</h2>${clauseRows}` : ""}<h2>Risk Assessment</h2><div style="margin-bottom:12px;"><span class="risk-badge">Overall: ${esc(riskReport?.overallRiskLevel || "LOW")}</span></div>${riskRows || "<p style='color:#94a3b8;font-style:italic;'>No risks flagged.</p>"}<h2>Compliance</h2><div class="compliance-status ${complianceReport?.isCompliant !== false ? "compliant" : "non-compliant"}">${complianceReport?.isCompliant !== false ? "COMPLIANT" : "COMPLIANCE ISSUES DETECTED"}</div>${complianceRows || "<p style='color:#94a3b8;font-style:italic;'>No compliance issues.</p>"}${lawRows ? `<h2>Corporate Laws</h2>${lawRows}` : ""}${isBidding ? `<h2>Bidding Laws</h2>${biddingLawRows || "<p>None.</p>"}<h3>Requirements</h3>${biddingReqRows || "<p>None.</p>"}` : ""}<div class="footer"><span>Docketwise AI Legal Platform</span><span>Generated ${esc(now)}</span></div></div></body></html>`;
}

// ─── Shared style constants ───────────────────────────────────────────────
const FONT  = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO  = "'Courier New',Courier,monospace";
const SERIF = "Georgia,'Times New Roman',serif";

// ─── Native React document — renders instantly, zero iframe delay ─────────

function DocSection({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: MONO, fontSize: 9.5, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: "#e5e7eb" }} />
      </div>
      {children}
    </div>
  );
}

function RiskBadge({ level }) {
  const colors = { HIGH: ["#fee2e2","#991b1b"], MEDIUM: ["#fef3c7","#92400e"], LOW: ["#dcfce7","#166534"] };
  const [bg, fg] = colors[level] || colors.LOW;
  return (
    <span style={{ display: "inline-block", fontFamily: MONO, fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 4, background: bg, color: fg }}>
      RISK: {level || "LOW"}
    </span>
  );
}

function ItemCard({ accentColor = "#B8863B", tag, tagBg, tagFg, title, body, footer }) {
  return (
    <div style={{ borderLeft: `3px solid ${accentColor}`, paddingLeft: 12, marginBottom: 10 }}>
      {tag && (
        <span style={{ display: "inline-block", fontFamily: MONO, fontSize: 9.5, padding: "2px 8px", borderRadius: 3, background: tagBg || "#fef3c7", color: tagFg || "#92400e", marginBottom: 4 }}>{tag}</span>
      )}
      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: 13, marginBottom: 3 }}>{title}</div>
      {body && <p style={{ margin: 0, color: "#4b5563", fontSize: 11.5 }}>{body}</p>}
      {footer && <code style={{ display: "block", fontFamily: MONO, fontSize: 10, color: "#475569", marginTop: 4, background: "#f8fafc", padding: "2px 8px", borderRadius: 3 }}>{footer}</code>}
    </div>
  );
}

function NativeDocument({ report }) {
  const { contract, riskReport, complianceReport, analysis } = report;
  const isBidding = analysis?.contractType === "bidding";
  const risk      = riskReport?.overallRiskLevel || "LOW";
  const now       = new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" });

  const deadlines = [
    ...(analysis?.bidOpeningDate ? [{ title: "Bid Opening Date", date: analysis.bidOpeningDate, isBidOpening: true }] : []),
    ...(analysis?.biddingDeadlines || []),
  ];

  return (
    <div style={{ fontFamily: FONT, color: "#1a202c", fontSize: 13, lineHeight: 1.65 }}>

      {/* ── Header */}
      <div style={{ borderBottom: "3px solid #B8863B", paddingBottom: 20, marginBottom: 28 }}>
        <h1 style={{ fontFamily: SERIF, fontSize: 22, color: "#0f172a", margin: "0 0 4px" }}>{contract.fileName}</h1>
        <p style={{ fontFamily: MONO, fontSize: 11, color: "#64748b", margin: "0 0 12px" }}>Legal Analysis Report · Docketwise AI Platform</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
          {[["User", contract.userCountry], ["Employer", contract.employerCountry], contract.clientCountry ? ["Client", contract.clientCountry] : null, ["Type", analysis?.contractType || "Standard"]].filter(Boolean).map(([k, v]) => (
            <span key={k} style={{ fontFamily: MONO, fontSize: 10, background: "#f8fafc", border: "1px solid #e2e8f0", padding: "2px 10px", borderRadius: 3, color: "#475569" }}>{k}: {v}</span>
          ))}
        </div>
        <RiskBadge level={risk} />
      </div>

      {/* ── Executive Summary */}
      <DocSection icon="📄" title="Executive Summary">
        <p style={{ fontSize: 13.5, lineHeight: 1.8, color: "#374151", whiteSpace: "pre-wrap", margin: 0 }}>
          {analysis?.summary || "No summary available."}
        </p>
      </DocSection>

      {/* ── Key Dates */}
      {deadlines.length > 0 && (
        <DocSection icon="⏰" title="Key Dates & Deadlines">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 8 }}>
            {deadlines.map((d, i) => {
              const days = daysUntil(d.date);
              const urgent = days !== null && days <= 7;
              const soon   = days !== null && days <= 30;
              return (
                <div key={i} style={{ padding: 10, borderRadius: 6, border: `1px solid ${urgent ? "#fca5a5" : soon ? "#fcd34d" : "#fde68a"}`, background: urgent ? "#fff1f2" : "#fffbeb", display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{d.isBidOpening ? "🔓" : "⏰"}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 11, color: "#374151" }}>{d.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#b45309" }}>{d.date || "TBD"}</div>
                    {days !== null && <span style={{ fontFamily: MONO, fontSize: 10, padding: "1px 6px", borderRadius: 3, background: urgent ? "#fee2e2" : "#f1f5f9", color: urgent ? "#991b1b" : "#64748b" }}>{days <= 0 ? "OVERDUE" : `${days}d left`}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </DocSection>
      )}

      {/* ── Clauses */}
      {analysis?.clauses?.length > 0 && (
        <DocSection icon="⚖️" title="Contract Clauses & Laws">
          {analysis.clauses.map((c, i) => <ItemCard key={i} tag={c.category?.toUpperCase()} title={c.title} body={c.text} />)}
        </DocSection>
      )}

      {/* ── Risk */}
      <DocSection icon="🔴" title="Risk Assessment">
        <div style={{ marginBottom: 12 }}><RiskBadge level={risk} /></div>
        {riskReport?.risks?.length > 0
          ? riskReport.risks.map((r, i) => {
              const sevBg = { HIGH: "#fee2e2", MEDIUM: "#fef3c7", LOW: "#dcfce7" };
              const sevFg = { HIGH: "#991b1b", MEDIUM: "#92400e", LOW: "#166534" };
              return <ItemCard key={i} accentColor="#dc2626" tag={r.severity} tagBg={sevBg[r.severity]} tagFg={sevFg[r.severity]} title={r.title} body={r.description} />;
            })
          : <p style={{ color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No risks flagged.</p>
        }
      </DocSection>

      {/* ── Compliance */}
      <DocSection icon="✅" title="Compliance">
        <div style={{ marginBottom: 12 }}>
          <span style={{ display: "inline-block", fontFamily: MONO, fontSize: 11, fontWeight: 600, padding: "4px 14px", borderRadius: 3, background: complianceReport?.isCompliant !== false ? "#dcfce7" : "#fee2e2", color: complianceReport?.isCompliant !== false ? "#166534" : "#991b1b" }}>
            {complianceReport?.isCompliant !== false ? "✓ COMPLIANT" : "⚠ COMPLIANCE ISSUES DETECTED"}
          </span>
        </div>
        {complianceReport?.issues?.length > 0
          ? complianceReport.issues.map((issue, i) => <ItemCard key={i} accentColor="#dc2626" title={issue.title} body={issue.description} footer={issue.regulationReference} />)
          : <p style={{ color: "#94a3b8", fontStyle: "italic", margin: 0 }}>No compliance issues.</p>
        }
      </DocSection>

      {/* ── Corporate Laws */}
      {analysis?.corporateLaws?.length > 0 && (
        <DocSection icon="🏛️" title={`Corporate Laws — ${contract.employerCountry || contract.userCountry}`}>
          {analysis.corporateLaws.map((law, i) => <ItemCard key={i} title={law.lawName} body={law.description} />)}
        </DocSection>
      )}

      {/* ── Bidding */}
      {isBidding && analysis?.biddingLaws?.length > 0 && (
        <DocSection icon="📜" title="Bidding Laws & Regulations">
          {analysis.biddingLaws.map((law, i) => <ItemCard key={i} title={law.lawName} body={law.description} />)}
        </DocSection>
      )}
      {isBidding && analysis?.biddingRequirements?.length > 0 && (
        <DocSection icon="📋" title="Requirements to Participate in Bidding">
          {analysis.biddingRequirements.map((req, i) => <ItemCard key={i} title={req.title} body={req.description} />)}
        </DocSection>
      )}

      {/* ── Footer */}
      <div style={{ marginTop: 36, paddingTop: 12, borderTop: "1px solid #e5e7eb", fontSize: 10, color: "#94a3b8", fontFamily: MONO, display: "flex", justifyContent: "space-between" }}>
        <span>Docketwise AI Legal Platform — Confidential Document</span>
        <span>Generated {now}</span>
      </div>
    </div>
  );
}

// ─── Main Panel ──────────────────────────────────────────────────────────────

export default function DocumentSummaryPanel({ open, onClose, report }) {
  const previewRef  = useRef(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  if (!report) return null;

  const { contract, riskReport, complianceReport, analysis } = report;
  const isBidding = analysis?.contractType === "bidding";

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const el = previewRef.current;
      if (!el) return;
      // Capture the already-rendered visible white paper div — html2canvas
      // cannot capture elements positioned off-screen (top:-9999px), so we
      // use the live DOM node directly for a pixel-perfect PDF.
      await html2pdf()
        .set({
          margin:      [10, 14, 10, 14],
          filename:    `${contract.fileName?.replace(/\.[^.]+$/, "") || "summary"}-report.pdf`,
          html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
          jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak:   { mode: ["avoid-all", "css"] },
        })
        .from(el)
        .save();
    } finally {
      setDownloading(false);
    }
  };



  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/30 z-30 backdrop-blur-[1px]" onClick={onClose} />
      )}

      <div
        className="fixed top-0 right-0 h-screen z-40 flex flex-col bg-[#0d1117] border-l border-ink-border shadow-2xl"
        style={{
          width: "min(900px, 92vw)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border bg-ink-raised shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <div className="text-[10px] font-mono text-muted tracking-widest uppercase">Document Summary</div>
              <div className="font-display text-paper text-sm truncate max-w-[320px] mt-0.5">{contract?.fileName}</div>
            </div>
            {analysis?.detectedLanguage && analysis.detectedLanguage !== "English" && (
              <span className="text-[10px] font-mono bg-blue-900/30 text-blue-400 border border-blue-500/30 px-2 py-1 rounded-sm shrink-0">
                📄 {analysis.detectedLanguage}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-seal/15 hover:bg-seal/30 text-seal-bright border border-seal/30 rounded-sm transition-all disabled:opacity-50"
            >
              {downloading ? <span className="animate-pulse">Generating…</span> : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download PDF
                </>
              )}
            </button>
            <button onClick={onClose} className="text-muted hover:text-paper w-7 h-7 flex items-center justify-center rounded-sm hover:bg-ink-border/50 transition-colors text-lg">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* Sidebar */}
          <div className="w-52 shrink-0 border-r border-ink-border overflow-y-auto px-3 py-4 space-y-1 bg-ink/30" style={{ scrollbarWidth: "thin" }}>
            <div className="text-[9px] font-mono text-muted/60 tracking-widest uppercase mb-3 px-2">Contents</div>
            {[
              { icon: "📄", label: "Executive Summary" },
              (isBidding && (analysis?.biddingDeadlines?.length || analysis?.bidOpeningDate)) ? { icon: "⏰", label: "Key Dates" } : null,
              analysis?.clauses?.length ? { icon: "⚖️", label: "Clauses" } : null,
              { icon: "🔴", label: "Risk Assessment" },
              { icon: "✅", label: "Compliance" },
              analysis?.corporateLaws?.length ? { icon: "🏛️", label: "Corporate Laws" } : null,
              (isBidding && analysis?.biddingLaws?.length) ? { icon: "📜", label: "Bidding Laws" } : null,
              (isBidding && analysis?.biddingRequirements?.length) ? { icon: "📋", label: "Requirements" } : null,
            ].filter(Boolean).map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-xs text-muted hover:text-paper hover:bg-ink-border/30 cursor-default transition-colors">
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="font-mono text-[10px] leading-tight">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Document — renders instantly as native React, no iframe */}
          <div className="flex-1 overflow-y-auto bg-[#1a1f29] px-6 py-6" style={{ scrollbarWidth: "thin" }}>
            <div
              ref={previewRef}
              className="bg-white rounded shadow-2xl mx-auto"
              style={{ maxWidth: 680, padding: "40px 48px" }}
            >
              <NativeDocument report={report} />
            </div>
            <p className="text-center text-[10px] font-mono text-muted/50 mt-4">
              Docketwise AI · Auto-generated summary · Not legal advice
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
