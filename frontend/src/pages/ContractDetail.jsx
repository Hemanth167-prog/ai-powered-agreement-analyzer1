import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import client from "../api/client.js";
import Seal from "../components/Seal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import DocumentSummaryPanel from "../components/DocumentSummaryPanel.jsx";

const TABS = ["Summary", "Clauses", "Risk", "Compliance"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSummary(text) {
  if (!text) return "";
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
  return safe.replace(/\*\*(.*?)\*\*/g, '<strong class="text-seal-bright font-semibold">$1</strong>');
}

/** Parse days remaining until a date string */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const diff = target.getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Urgency styling for a deadline */
function deadlineStyle(days) {
  if (days === null) return { border: "border-ink-border", bg: "bg-ink/20", badge: null };
  if (days <= 0)  return { border: "border-red-500",    bg: "bg-red-900/10",  badge: { text: "OVERDUE",   cls: "bg-red-500 text-white animate-pulse" } };
  if (days <= 7)  return { border: "border-red-500/70", bg: "bg-red-900/8",   badge: { text: `${days}d`,   cls: "bg-red-500/90 text-white animate-pulse" } };
  if (days <= 30) return { border: "border-amber-500/60", bg: "bg-amber-900/8", badge: { text: `${days}d`, cls: "bg-amber-500/80 text-ink font-bold" } };
  return          { border: "border-ink-border",         bg: "bg-ink/20",      badge: { text: `${days}d`, cls: "bg-ink-border text-muted" } };
}

/** Try to extract date strings from a piece of text */
function extractDatesFromText(text) {
  if (!text) return [];
  const patterns = [
    /\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})\b/g,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})\b/gi,
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/gi,
  ];
  const found = new Set();
  patterns.forEach((p) => {
    let m;
    while ((m = p.exec(text)) !== null) found.add(m[1]);
  });
  return [...found];
}

// ─── Deadline Section ─────────────────────────────────────────────────────────

function DeadlinesSection({ analysis, contract }) {
  const explicit  = analysis?.biddingDeadlines || [];
  const opening   = analysis?.bidOpeningDate   || null;
  const hasExplicit = explicit.length > 0 || opening;

  // Auto-extract from requirements text if no explicit dates provided
  const autoExtracted = [];
  if (!hasExplicit) {
    (analysis?.biddingRequirements || []).forEach((req) => {
      const dates = extractDatesFromText(req.description);
      dates.forEach((d) => {
        autoExtracted.push({ title: req.title, date: d, description: req.description, auto: true });
      });
    });
  }

  const allDates = hasExplicit
    ? [
        ...(opening ? [{ title: "Bid Opening Date", date: opening, isBidOpening: true }] : []),
        ...explicit,
      ]
    : autoExtracted;

  if (allDates.length === 0) {
    return (
      <div className="border border-dashed border-amber-500/30 rounded p-4 mb-6 bg-amber-900/5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-400 text-base">📅</span>
          <span className="text-xs font-mono text-amber-400 tracking-wider uppercase">Key Dates & Deadlines</span>
        </div>
        <p className="text-xs text-muted font-mono">
          No deadline data extracted yet. Re-analyze the document to extract bidding dates automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400 text-base">📅</span>
        <span className="text-xs font-mono text-muted tracking-wider uppercase">Key Dates &amp; Deadlines</span>
        <div className="flex-1 h-px bg-ink-border" />
        {autoExtracted.length > 0 && (
          <span className="text-[10px] font-mono text-muted/60">auto-extracted</span>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {allDates.map((item, i) => {
          const days  = daysUntil(item.date);
          const style = deadlineStyle(days);
          const isBidOpen = item.isBidOpening;

          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded border ${style.border} ${style.bg} transition-all hover:scale-[1.01]`}
            >
              <div className={`shrink-0 text-xl ${isBidOpen ? "text-amber-400" : "text-seal-bright"}`}>
                {isBidOpen ? "🔓" : "⏰"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-paper text-xs font-semibold">{item.title}</span>
                  {isBidOpen && (
                    <span className="text-[10px] font-mono bg-amber-500 text-ink px-1.5 py-0.5 rounded-sm font-bold">
                      BID OPENING
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-seal-bright mb-1">{item.date || "Date TBD"}</div>
                {item.description && (
                  <p className="text-[11px] text-muted leading-relaxed line-clamp-2">{item.description}</p>
                )}
              </div>
              {style.badge && (
                <span className={`shrink-0 text-[10px] font-mono px-2 py-1 rounded-sm whitespace-nowrap ${style.badge.cls}`}>
                  {style.badge.text}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContractDetail() {
  const { id }      = useParams();
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("Summary");
  const [error, setError]       = useState("");
  const [panelOpen, setPanelOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await client.get(`/reports/contract/${id}`);
      setReport(data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load this report.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    // Only poll while the contract is still processing.
    // Once ANALYZED we stop to avoid unnecessary refetches.
    const poll = setInterval(async () => {
      if (report?.contract?.status === "ANALYZED") {
        clearInterval(poll);
        return;
      }
      await load();
    }, 5000);
    return () => clearInterval(poll);
  }, [load, report?.contract?.status]);

  if (loading) return (
    <div className="animate-pulse">
      {/* Back nav skeleton */}
      <div className="h-3 w-28 bg-ink-border rounded mb-6" />
      {/* Header skeleton */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div className="flex-1">
          <div className="h-7 w-64 bg-ink-border rounded mb-2" />
          <div className="h-3 w-40 bg-ink-border/60 rounded" />
        </div>
        <div className="h-8 w-32 bg-ink-border rounded" />
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-2 border-b border-ink-border mb-6">
        {["Summary","Clauses","Risk","Compliance"].map(t => (
          <div key={t} className="h-8 w-20 bg-ink-border/50 rounded-t" />
        ))}
      </div>
      {/* Content card skeleton */}
      <div className="card p-6 space-y-3">
        <div className="h-3 w-full bg-ink-border rounded" />
        <div className="h-3 w-5/6 bg-ink-border rounded" />
        <div className="h-3 w-4/5 bg-ink-border rounded" />
        <div className="h-3 w-full bg-ink-border rounded" />
        <div className="h-3 w-3/4 bg-ink-border rounded" />
        <div className="h-3 w-5/6 bg-ink-border rounded" />
      </div>
    </div>
  );

  if (error) return (
    <div className="card p-8 text-center">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="font-display text-lg mb-1">Unable to load report</p>
      <p className="text-muted text-sm mb-5">{error}</p>
      <button onClick={load} className="btn-primary">Retry</button>
    </div>
  );

  const { contract, riskReport, complianceReport, analysis } = report;
  const overallRisk = riskReport?.overallRiskLevel || (contract.status === "ANALYZED" ? "LOW" : null);
  const isBidding   = analysis?.contractType === "bidding";
  const tabsList    = isBidding
    ? [...TABS, "Corporate Laws", "Bidding & Laws"]
    : [...TABS, "Corporate Laws"];

  return (
    <>
      {/* Main content — shifts left when panel is open */}
      <div
        className="transition-all duration-350"
        style={{ marginRight: panelOpen ? "min(900px, 92vw)" : "0" }}
      >
        {/* Back nav */}
        <Link to="/" className="text-xs font-mono text-muted hover:text-seal-bright">
          ← BACK TO DOCKET
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mt-4 mb-8 gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl text-paper truncate">{contract.fileName}</h1>
            <div className="text-sm text-muted mt-1">
              {contract.userCountry} → {contract.employerCountry}
              {contract.clientCountry ? ` · ${contract.clientCountry}` : ""}
              {isBidding && (
                <span className="ml-2 text-[10px] font-mono bg-amber-900/30 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-sm">
                  BIDDING DOCUMENT
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {contract.status === "ANALYZED" && (
              <>
                {/* View Summary Panel button */}
                <button
                  onClick={() => setPanelOpen((v) => !v)}
                  className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm border transition-all ${
                    panelOpen
                      ? "bg-seal/20 border-seal/50 text-seal-bright"
                      : "border-ink-border text-muted hover:border-seal/50 hover:text-seal-bright"
                  }`}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <line x1="9" y1="3" x2="9" y2="21" />
                  </svg>
                  {panelOpen ? "Close Summary" : "View Summary"}
                </button>
              </>
            )}
            <StatusBadge status={contract.status} />
            {overallRisk && <Seal level={overallRisk} />}
          </div>
        </div>

        {/* Processing state */}
        {contract.status !== "ANALYZED" ? (
          <div className="card p-8 text-center mb-8">
            <div className="text-2xl mb-3">⚙️</div>
            <p className="font-display text-lg mb-1">Analysis in progress</p>
            <p className="text-muted text-sm">
              The AI pipeline is extracting clauses and checking risk &amp; compliance. This page updates automatically.
            </p>
          </div>
        ) : (
          <>
            {/* Tab nav */}
            <div className="flex gap-1 border-b border-ink-border mb-6 overflow-x-auto">
              {tabsList.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-sm font-body whitespace-nowrap -mb-px border-b-2 transition-colors ${
                    tab === t
                      ? "border-seal text-paper"
                      : "border-transparent text-muted hover:text-paper"
                  }`}
                >
                  {t}
                  {t === "Bidding & Laws" && (analysis?.biddingDeadlines?.length || analysis?.bidOpeningDate) && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-ink text-[9px] font-bold">!</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="card p-6 mb-8">
              {tab === "Summary" && (
                <div>
                  <p
                    className="text-sm leading-relaxed text-paper whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatSummary(analysis?.summary || "No summary available.") }}
                  />
                </div>
              )}

              {tab === "Clauses" && (
                <div className="space-y-4">
                  <div className="text-xs font-mono text-muted tracking-wide mb-2 uppercase">Involved Clauses &amp; Laws</div>
                  {(!analysis?.clauses || analysis.clauses.length === 0) && (
                    <p className="text-muted text-sm">No clauses extracted.</p>
                  )}
                  {(analysis?.clauses || []).map((c, i) => (
                    <div key={i} className="border-l-2 border-seal pl-4 py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-paper text-sm font-medium">{c.title}</span>
                        <span className="docket-number uppercase">{c.category}</span>
                      </div>
                      <p className="text-xs text-muted mt-1 font-mono whitespace-pre-wrap">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === "Risk" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-mono text-muted tracking-wide">OVERALL RISK</span>
                    <Seal level={riskReport?.overallRiskLevel} size="sm" />
                  </div>
                  {(riskReport?.risks || []).length === 0 && <p className="text-muted text-sm">No risks flagged.</p>}
                  {(riskReport?.risks || []).map((r, i) => (
                    <div key={i} className="border-l-2 border-risk-high pl-4">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-paper text-sm font-medium">{r.title}</span>
                        <span className="docket-number">{r.severity}</span>
                      </div>
                      <p className="text-sm text-muted mt-1">{r.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === "Compliance" && (
                <div className="space-y-4">
                  <p className="text-sm">
                    {complianceReport?.isCompliant ? (
                      <span className="text-risk-low font-mono text-xs">NO COMPLIANCE ISSUES DETECTED</span>
                    ) : (
                      <span className="text-risk-high font-mono text-xs">POTENTIAL COMPLIANCE ISSUES DETECTED</span>
                    )}
                  </p>
                  {(complianceReport?.issues || []).map((issue, i) => (
                    <div key={i} className="border-l-2 border-risk-high pl-4">
                      <div className="font-body text-paper text-sm font-medium">{issue.title}</div>
                      <p className="text-sm text-muted mt-1">{issue.description}</p>
                      {issue.regulationReference && (
                        <p className="docket-number mt-1">{issue.regulationReference}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tab === "Corporate Laws" && (
                <div>
                  <div className="text-xs font-mono text-muted tracking-wide mb-3 uppercase">
                    Corporate Laws &amp; Regulations of {contract.employerCountry || contract.userCountry}
                  </div>
                  {(!analysis?.corporateLaws || analysis.corporateLaws.length === 0) ? (
                    <p className="text-muted text-sm">No corporate laws analyzed for this contract.</p>
                  ) : (
                    <div className="grid gap-4">
                      {analysis.corporateLaws.map((law, idx) => (
                        <div key={idx} className="border border-ink-border p-4 rounded-sm bg-ink/30 hover:border-seal/40 transition-colors">
                          <div className="font-body text-seal-bright text-sm font-medium mb-1.5">{law.lawName}</div>
                          <p className="text-xs text-muted leading-relaxed font-sans">{law.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === "Bidding & Laws" && (
                <div className="space-y-6">
                  {/* ⭐ DEADLINE HIGHLIGHTS */}
                  <DeadlinesSection analysis={analysis} contract={contract} />

                  {/* Bidding Laws */}
                  <div>
                    <div className="text-xs font-mono text-muted tracking-wide mb-3 uppercase">
                      Bidding Laws &amp; Regulations of {contract.employerCountry || contract.userCountry}
                    </div>
                    {(!analysis?.biddingLaws || analysis.biddingLaws.length === 0) ? (
                      <p className="text-muted text-sm">No bidding laws available.</p>
                    ) : (
                      <div className="grid gap-4">
                        {analysis.biddingLaws.map((law, idx) => (
                          <div key={idx} className="border border-ink-border p-4 rounded-sm bg-ink/30 hover:border-seal/40 transition-colors">
                            <div className="font-body text-seal-bright text-sm font-medium mb-1.5">{law.lawName}</div>
                            <p className="text-xs text-muted leading-relaxed font-sans">{law.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Requirements */}
                  <div className="border-t border-ink-border pt-6">
                    <div className="text-xs font-mono text-muted tracking-wide mb-3 uppercase">
                      Requirements to Participate in Bidding
                    </div>
                    {(!analysis?.biddingRequirements || analysis.biddingRequirements.length === 0) ? (
                      <p className="text-muted text-sm">No requirements found in the contract.</p>
                    ) : (
                      <div className="space-y-3">
                        {analysis.biddingRequirements.map((reqItem, idx) => {
                          // Highlight any date patterns found in the requirement description
                          const dates = extractDatesFromText(reqItem.description);
                          return (
                            <div key={idx} className={`flex items-start gap-3 border-l-2 pl-4 py-0.5 ${dates.length > 0 ? "border-amber-500/60" : "border-seal"}`}>
                              <div>
                                <div className="font-body text-paper text-sm font-medium flex items-center gap-2">
                                  {reqItem.title}
                                  {dates.length > 0 && (
                                    <span className="text-[10px] font-mono bg-amber-900/30 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded-sm">
                                      📅 {dates[0]}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted mt-1 font-sans leading-relaxed">{reqItem.description}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Panel */}
            <ChatPanel contractId={id} />
          </>
        )}
      </div>

      {/* ── Document Summary Panel (slides in from right) ─────────────────── */}
      <DocumentSummaryPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        report={report}
      />
    </>
  );
}
