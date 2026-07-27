import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import client from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import Seal from "../components/Seal.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import FavorabilityPieChart from "../components/FavorabilityPieChart.jsx";
import ChatPanel from "../components/ChatPanel.jsx";
import DocumentSummaryPanel from "../components/DocumentSummaryPanel.jsx";
import LawExplainerModal from "../components/LawExplainerModal.jsx";

const TABS = ["Summary", "Clauses", "Risk", "Compliance", "All Laws & Regulations"];

function getAllLaws(analysis, contract) {
  const list = [];
  const seen = new Set();

  (analysis?.corporateLaws || []).forEach(l => {
    if (l?.lawName && !seen.has(l.lawName)) {
      seen.add(l.lawName);
      list.push({ ...l, category: "CORPORATE" });
    }
  });

  (analysis?.biddingLaws || []).forEach(l => {
    if (l?.lawName && !seen.has(l.lawName)) {
      seen.add(l.lawName);
      list.push({ ...l, category: "BIDDING" });
    }
  });

  const empC = contract?.employerCountry || contract?.userCountry || "International";

  const defaultInternational = [
    { lawName: `Commercial Code & Corporate Governance Act of ${empC}`, description: `Governs entity capacity, corporate filings, officer authority, and commercial obligations in ${empC}.`, category: "CORPORATE" },
    { lawName: `Civil Obligations & Statutory Contract Law of ${empC}`, description: `Regulates contract formation, breach remedies, indemnities, and statutory default terms.`, category: "CIVIL LAW" },
    { lawName: `Public Procurement & Tender Act (Riigihangete seadus) of ${empC}`, description: `Mandates transparent tender evaluation, equal treatment of bidders, and statutory EMD security deposit rules.`, category: "BIDDING" },
    { lawName: `European Public Procurement Directive (2014/24/EU)`, description: `Sets international standards for cross-border public procurement and tender documentation.`, category: "INTERNATIONAL" },
    { lawName: `UNCITRAL Model Law on International Commercial Arbitration`, description: `Standard international framework for cross-border dispute resolution and arbitral award enforcement under the New York Convention.`, category: "INTERNATIONAL" },
    { lawName: `UN Convention on Contracts for the International Sale of Goods (CISG)`, description: `Governs international commercial sale contracts, delivery duties, and buyer/seller breach remedies across contracting states.`, category: "INTERNATIONAL" },
    { lawName: `EU General Data Protection Regulation (GDPR)`, description: `Enforces strict personal data processing compliance, cross-border transfer safeguards, and privacy consent mandates.`, category: "COMPLIANCE" }
  ];

  defaultInternational.forEach(l => {
    if (!seen.has(l.lawName)) {
      seen.add(l.lawName);
      list.push(l);
    }
  });

  return list;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatSummary(text) {
  if (!text) return "";
  let safe = String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  // Highlight dates (e.g. 15 August 2026, 2026-08-15, 31/12/2026, 30 days, 15.08.2026)
  const dateRegex = /\b\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}\b|\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}\b|\b\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z.]*\s+\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{2,4}\b|\b\d{1,3}\s+(?:days|months|weeks|years)\b/gi;
  safe = safe.replace(dateRegex, (match) => {
    return `<span class="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold tracking-wider whitespace-nowrap shadow-sm">📅 ${match}</span>`;
  });

  // Highlight bold markdown (laws, acts, regulations)
  safe = safe.replace(/\*\*(.*?)\*\*/g, (match, p1) => {
    const isLaw = /Act|Regulation|Directive|Code|Law|Statute|Decree|Seadus|Määrus|Gesetz|Verordnung|Rules|UCC|GDPR|HIPAA|FAR|UNCITRAL|CISG/i.test(p1);
    if (isLaw) {
      return `<span class="bg-seal/20 text-seal-bright border border-seal/50 px-2 py-0.5 rounded-md font-semibold shadow-sm font-body inline-flex items-center gap-1 cursor-pointer hover:bg-seal/30 transition-all" title="Click to view detailed law breakdown">📜 ${p1}</span>`;
    }
    return `<strong class="text-paper font-semibold">${p1}</strong>`;
  });

  return safe;
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
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [report, setReport]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState("Summary");
  const [error, setError]       = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState(null);
  const [chatQuery, setChatQuery] = useState("");

  const handleDeleteContract = async () => {
    if (window.confirm(`Are you sure you want to permanently delete contract "${contract.fileName}" and all associated analysis records?`)) {
      try {
        await client.delete(`/contracts/${id}`);
        navigate("/");
      } catch (err) {
        alert("Failed to delete contract: " + (err.response?.data?.message || err.message));
      }
    }
  };

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
  const isMou       = analysis?.contractType === "mou";
  const tabsList = ["Summary", "Clauses", "Risk", "Compliance", "All Laws & Regulations"];

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
                <span className="ml-2 text-[10px] font-mono bg-amber-50 text-amber-700 border border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500/30 px-2 py-0.5 rounded-sm">
                  BIDDING DOCUMENT
                </span>
              )}
              {isMou && (
                <span className="ml-2 text-[10px] font-mono bg-blue-50 text-blue-700 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-500/30 px-2 py-0.5 rounded-sm">
                  MEMORANDUM OF UNDERSTANDING (MOU)
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {user && contract.owner === user.id && (
              <button
                onClick={handleDeleteContract}
                className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-sm border border-risk-high/30 text-risk-high hover:bg-risk-high/15 transition-all"
                title="Delete this contract and analysis history"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
                Delete Contract
              </button>
            )}
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
            {contract.status === "ANALYZED" && <FavorabilityPieChart favorability={analysis?.favorability} />}
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
                  {/* Favorability Analysis Section */}
                  {(() => {
                    const favorability = analysis?.favorability || {
                      userPercentage: 50,
                      oppositePercentage: 50,
                      userRationale: "Based on local statutory regulations, the baseline contract maintains a balanced structure. Review specific liability caps and indemnities to verify standard commercial safety.",
                      oppositeRationale: "Standard obligations apply. Review payment milestones and dispute resolution clauses to ensure adequate protection against potential opposite side defaults."
                    };

                    return (
                      <div className="mb-8 border border-ink-border/60 rounded-md p-5 bg-ink/20 shadow-sm">
                        <div className="flex items-center gap-2 mb-3.5">
                          <span className="text-base">⚖️</span>
                          <span className="text-xs font-mono text-muted tracking-wider uppercase">Contract Balance &amp; Favorability</span>
                          <div className="flex-1 h-px bg-ink-border/50" />
                        </div>

                        {/* Split Balance Bar */}
                        <div className="relative mb-5">
                          <div className="flex justify-between items-center mb-2 font-mono text-xs">
                            <span className="text-[#34d399] font-bold">You (User): {favorability.userPercentage}%</span>
                            <span className="text-[#f87171] font-bold">Opposite Side: {favorability.oppositePercentage}%</span>
                          </div>
                          <div className="h-4 w-full rounded-full bg-slate-800/80 overflow-hidden flex shadow-inner border border-ink-border/40">
                            <div 
                              style={{ width: `${favorability.userPercentage}%` }} 
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 ease-out" 
                            />
                            <div 
                              style={{ width: `${favorability.oppositePercentage}%` }} 
                              className="h-full bg-gradient-to-r from-rose-400 to-red-500 transition-all duration-500 ease-out" 
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-muted/70 font-mono mt-1">
                            <span>Protective Terms (User Advantages)</span>
                            <span>Obligations &amp; Risks (Counterparty Advantages)</span>
                          </div>
                        </div>

                        {/* Rationale Cards */}
                        <div className="grid gap-4 md:grid-cols-2 mt-4">
                          <div className="border border-emerald-500/15 rounded bg-emerald-950/10 p-4 transition-all hover:bg-emerald-950/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              <h4 className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">Your Advantages</h4>
                            </div>
                            <p className="text-xs text-muted leading-relaxed font-sans">{favorability.userRationale}</p>
                          </div>

                          <div className="border border-rose-500/15 rounded bg-rose-950/10 p-4 transition-all hover:bg-rose-950/20">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
                              <h4 className="text-xs font-mono text-rose-400 font-bold uppercase tracking-wider">Opposite Side Advantages</h4>
                            </div>
                            <p className="text-xs text-muted leading-relaxed font-sans">{favorability.oppositeRationale}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div onClick={(e) => {
                    const target = e.target.closest("span");
                    if (target && target.innerText.includes("📜")) {
                      const lawName = target.innerText.replace("📜", "").trim();
                      setSelectedLaw({ name: lawName, desc: "" });
                    }
                  }}>
                    <p
                      className="text-sm leading-relaxed text-paper whitespace-pre-wrap cursor-pointer"
                      dangerouslySetInnerHTML={{ __html: formatSummary(analysis?.summary || "No summary available.") }}
                    />
                  </div>
                </div>
              )}

              {tab === "Clauses" && (
                <div className="space-y-4">
                  <div className="text-xs font-mono text-muted tracking-wide mb-2 uppercase">Involved Clauses &amp; Laws</div>
                  {(!analysis?.clauses || analysis.clauses.length === 0) && (
                    <p className="text-muted text-sm">No clauses extracted.</p>
                  )}
                  {(analysis?.clauses || []).map((c, i) => (
                    <div 
                      key={i} 
                      onClick={() => setChatQuery(`Explain the clause "${c.title}" in this contract in detail.`)}
                      className="border-l-2 border-seal pl-4 py-1.5 hover:bg-seal/5 cursor-pointer transition-colors rounded-r"
                      title="Click to ask AI assistant about this clause"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-paper text-sm font-medium hover:text-seal-bright transition-colors">{c.title}</span>
                          <span className="docket-number uppercase">{c.category}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted/60 hover:text-seal-bright transition-colors">Ask AI →</span>
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
                    <div 
                      key={i} 
                      onClick={() => setChatQuery(`Explain the risk "${r.title}" found in this contract and how to mitigate it.`)}
                      className="border-l-2 border-risk-high pl-4 py-1.5 hover:bg-risk-high/5 cursor-pointer transition-colors rounded-r"
                      title="Click to ask AI assistant about this risk"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-paper text-sm font-medium hover:text-risk-high transition-colors">{r.title}</span>
                          <span className="docket-number">{r.severity}</span>
                        </div>
                        <span className="text-[10px] font-mono text-muted/60 hover:text-risk-high transition-colors">Ask AI →</span>
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
                    <div 
                      key={i} 
                      onClick={() => setChatQuery(`Why is the compliance issue "${issue.title}" flagged, and how do we resolve it?`)}
                      className="border-l-2 border-risk-high pl-4 py-1.5 hover:bg-risk-high/5 cursor-pointer transition-colors rounded-r"
                      title="Click to ask AI assistant about this compliance issue"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-body text-paper text-sm font-medium hover:text-risk-high transition-colors">{issue.title}</div>
                        <span className="text-[10px] font-mono text-muted/60 hover:text-risk-high transition-colors">Ask AI →</span>
                      </div>
                      <p className="text-sm text-muted mt-1">{issue.description}</p>
                      {issue.regulationReference && (
                        <p className="docket-number mt-1">{issue.regulationReference}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tab === "All Laws & Regulations" && (
                <div className="space-y-6">
                  {/* ⭐ DEADLINE HIGHLIGHTS */}
                  <DeadlinesSection analysis={analysis} contract={contract} />

                  {/* All Laws Section */}
                  <div>
                    <div className="text-xs font-mono text-muted tracking-wide mb-3 uppercase flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>🏛️</span> Complete Statutory &amp; International Laws Framework ({getAllLaws(analysis, contract).length})
                      </span>
                      <span className="text-[10px] text-seal-bright font-mono">Jurisdiction: {contract.employerCountry || contract.userCountry || "Global"}</span>
                    </div>

                    <div className="grid gap-3.5">
                      {getAllLaws(analysis, contract).map((law, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedLaw({ name: law.lawName, desc: law.description })}
                          className="group border border-ink-border p-4 rounded-sm bg-ink/30 hover:border-seal/60 hover:bg-ink/50 cursor-pointer transition-all shadow-sm"
                          title="Click to view detailed legal breakdown and statutory sections"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-body text-seal-bright text-base font-semibold group-hover:underline flex items-center gap-1.5">
                              <span>📜</span> {law.lawName}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-seal-bright opacity-0 group-hover:opacity-100 transition-opacity">Inspect Law →</span>
                              <span className="text-[10px] font-mono bg-seal/15 text-seal-bright border border-seal/30 px-2 py-0.5 rounded-sm uppercase">
                                {law.category || "STATUTORY"}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted leading-relaxed font-sans">{law.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Governing Law Clauses */}
                  <div className="border-t border-ink-border pt-6">
                    <div className="text-xs font-mono text-muted tracking-wide mb-3 uppercase flex items-center gap-1.5">
                      <span>⚖️</span> Contractual Jurisdiction &amp; Governing Law Clauses
                    </div>
                    {(() => {
                      const jurClauses = (analysis?.clauses || []).filter(c => c.category === "Jurisdiction" || (c.text && c.text.toLowerCase().includes("governed by")));
                      if (jurClauses.length === 0) {
                        return <p className="text-muted text-sm font-sans">Governed by the statutory jurisdiction of {contract.employerCountry || contract.userCountry}.</p>;
                      }
                      return (
                        <div className="space-y-3">
                          {jurClauses.map((c, i) => (
                            <div key={i} className="border-l-2 border-seal pl-4 py-2 bg-ink/20 rounded-r">
                              <div className="font-body text-paper text-sm font-medium">{c.title}</div>
                              <p className="text-xs text-muted mt-1 font-mono leading-relaxed">{c.text}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Chat Panel */}
            <ChatPanel 
              contractId={id} 
              presetQuery={chatQuery}
              onQueryCleared={() => setChatQuery("")}
            />
          </>
        )}
      </div>

      {/* ── Document Summary Panel (slides in from right) ─────────────────── */}
      <DocumentSummaryPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        report={report}
      />

      {/* ── Law Explainer Modal ────────────────────────────────────────────── */}
      <LawExplainerModal
        open={!!selectedLaw}
        onClose={() => setSelectedLaw(null)}
        lawName={selectedLaw?.name}
        lawDescription={selectedLaw?.desc}
        country={contract?.employerCountry || contract?.userCountry}
        onAskChat={(query) => setChatQuery(query)}
      />
    </>
  );
}
