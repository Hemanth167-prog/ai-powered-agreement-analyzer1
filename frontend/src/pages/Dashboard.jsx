import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import UploadModal from "../components/UploadModal.jsx";

export default function Dashboard() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data } = await client.get("/contracts");
      setContracts(data.data);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Contracts still processing get polled so status/analysis links appear without a manual refresh.
  useEffect(() => {
    const hasPending = contracts.some((c) => c.status === "PROCESSING" || c.status === "UPLOADED");
    if (!hasPending) return;
    const id = setInterval(() => load(true), 4000); // silent poll — no loading flash
    return () => clearInterval(id);
  }, [contracts]);

  // KPI calculations
  const totalCount = contracts.length;
  const processingCount = contracts.filter((c) => c.status === "PROCESSING" || c.status === "UPLOADED").length;
  const analyzedCount = contracts.filter((c) => c.status === "ANALYZED").length;
  const failedCount = contracts.filter((c) => c.status === "FAILED").length;

  const handleDelete = async (e, contractId, fileName) => {
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm(`Are you sure you want to permanently delete contract "${fileName}" and all associated analysis records?`)) {
      try {
        await client.delete(`/contracts/${contractId}`);
        load(true); // reload silently
      } catch (err) {
        alert("Failed to delete contract: " + (err.response?.data?.message || err.message));
      }
    }
  };

  return (
    <div>
      {/* Brand Header Section */}
      <div className="flex items-start justify-between mb-8 animate-fadeInUp">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-paper">The Docket Workspace</h1>
          <p className="text-muted text-xs mt-1.5 font-medium">Manage and audit your legal repository in real time.</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-1.5 shadow-sm">
          <span>+</span>
          <span>File contract</span>
        </button>
      </div>

      {/* KPI Widgets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fadeInUp" style={{ animationDelay: "0.06s" }}>
        
        {/* Total Filed */}
        <div className="card p-5 bg-ink-raised border border-ink-border rounded-[8px] hover:-translate-y-1 hover:shadow-lg hover:shadow-seal/5 duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-muted tracking-wider uppercase font-semibold">TOTAL FILED</span>
            <span className="text-sm">
              <svg className="w-5 h-5 text-seal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </span>
          </div>
          <div className="font-display text-3xl font-extrabold text-paper mt-2.5">{totalCount}</div>
          <p className="text-[10px] text-muted font-mono mt-2 font-medium">Agreements in database</p>
        </div>

        {/* AI Scanning queue */}
        <div className="card p-5 bg-ink-raised border border-ink-border rounded-[8px] hover:-translate-y-1 hover:shadow-lg hover:shadow-seal/5 duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-muted tracking-wider uppercase font-semibold">AI SCANNING</span>
            <span className="text-sm">
              <svg className={`w-5 h-5 text-seal ${processingCount > 0 ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </span>
          </div>
          <div className="font-display text-3xl font-extrabold text-paper mt-2.5">
            {processingCount > 0 ? (
              <span className="flex items-center gap-2">
                <span>{processingCount}</span>
                <span className="h-2 w-2 rounded-full bg-seal animate-ping" />
              </span>
            ) : (
              "0"
            )}
          </div>
          <p className="text-[10px] text-muted font-mono mt-2 font-medium">Active queue processes</p>
        </div>

        {/* Analyzed */}
        <div className="card p-5 bg-ink-raised border border-ink-border rounded-[8px] hover:-translate-y-1 hover:shadow-lg hover:shadow-seal/5 duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-muted tracking-wider uppercase font-semibold">ANALYZED</span>
            <span className="text-sm">
              <svg className="w-5 h-5 text-risk-low" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </div>
          <div className="font-display text-3xl font-extrabold text-risk-low mt-2.5">{analyzedCount}</div>
          <p className="text-[10px] text-muted font-mono mt-2 font-medium">Reports ready for review</p>
        </div>

        {/* Risks/Failures */}
        <div className="card p-5 bg-ink-raised border border-ink-border rounded-[8px] hover:-translate-y-1 hover:shadow-lg hover:shadow-seal/5 duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono text-muted tracking-wider uppercase font-semibold">LEDGER STATUS</span>
            <span className="text-sm">
              <svg className="w-5 h-5 text-risk-low" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </span>
          </div>
          <div className="font-display text-2xl font-extrabold text-risk-low mt-3">SECURE</div>
          <p className="text-[10px] text-muted font-mono mt-2 font-medium">Access trail active</p>
        </div>
      </div>

      {loading && <p className="text-muted text-sm font-mono animate-pulse">Loading docket…</p>}

      {!loading && contracts.length === 0 && (
        <div className="card p-12 text-center bg-ink-raised border border-ink-border rounded-[8px] max-w-xl mx-auto shadow-sm my-6 animate-fadeInUp">
          <p className="text-3xl mb-4">⚖️</p>
          <h3 className="font-display text-lg font-bold text-paper mb-1">Your contract docket is empty</h3>
          <p className="text-muted text-xs mb-6 max-w-md mx-auto leading-relaxed">
            Upload your first contract, non-disclosure agreement, or tender proposal to execute an automated risk and compliance analysis.
          </p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">File contract</button>
        </div>
      )}

      <div className="space-y-3">
        {contracts.map((c, i) => (
          <Link
            key={c._id}
            to={`/contracts/${c._id}`}
            className="card flex items-center gap-5 px-6 py-4.5 hover:border-seal hover:-translate-y-[2px] hover:shadow-md bg-ink-raised shadow-sm transition-all duration-300 animate-fadeInUp opacity-0"
            style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards' }}
          >
            <span className="docket-number w-12 shrink-0 font-mono font-medium text-xs tracking-wider text-muted opacity-80 border-r border-ink-border/50 pr-4">
              #{String(i + 1).padStart(3, "0")}
            </span>
            <div className="flex-1 min-w-0 pl-1">
              <div className="font-body text-[14px] font-semibold text-paper truncate group-hover:text-seal transition-colors">
                {c.fileName}
              </div>
              <div className="text-xs text-muted mt-1 font-mono tracking-wide uppercase text-[10px]">
                {c.userCountry} → {c.employerCountry}{c.clientCountry ? ` · ${c.clientCountry}` : ""} · filed{" "}
                {new Date(c.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-4">
              <StatusBadge status={c.status} />
              <button
                onClick={(e) => handleDelete(e, c._id, c.fileName)}
                className="text-risk-high hover:bg-risk-high/15 border border-risk-high/30 p-2 rounded-sm transition-all text-xs font-mono"
                title="Delete contract and analysis history"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          </Link>
        ))}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            load();
          }}
        />
      )}
    </div>
  );
}
