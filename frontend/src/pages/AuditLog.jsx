import { useEffect, useState } from "react";
import client from "../api/client.js";

/** Format "Thu 16/07/2026 12:36" */
function fmtTime(raw) {
  if (!raw) return "—";
  const d = new Date(raw);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = days[d.getDay()];
  const dd  = String(d.getDate()).padStart(2, "0");
  const mm  = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh  = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

const ACTION_COLORS = {
  LOGIN:             { bg: "rgba(39,174,96,0.12)",   text: "#4ade80",  label: "LOGIN"      },
  LOGOUT:            { bg: "rgba(251,146,60,0.12)",   text: "#fb923c",  label: "LOGOUT"     },
  UPLOAD:            { bg: "rgba(96,165,250,0.12)",   text: "#60a5fa",  label: "UPLOAD"     },
  DOWNLOAD:          { bg: "rgba(129,140,248,0.12)",  text: "#818cf8",  label: "DOWNLOAD"   },
  DELETE:            { bg: "rgba(248,113,113,0.12)",  text: "#f87171",  label: "DELETE"     },
  AI_ANALYSIS:       { bg: "rgba(56,189,248,0.12)",   text: "#38bdf8",  label: "AI SCAN"    },
  REPORT_GENERATION: { bg: "rgba(192,132,252,0.12)",  text: "#c084fc",  label: "REPORT"     },
  ADMIN_ACTION:      { bg: "rgba(245,158,11,0.12)",   text: "#f59e0b",  label: "ADMIN"      },
  VIEW_REPORT:       { bg: "rgba(134,239,172,0.12)",  text: "#86efac",  label: "VIEW"       },
  REGISTER:          { bg: "rgba(125,211,252,0.12)",  text: "#7dd3fc",  label: "REGISTER"   },
};

const ACTION_ICONS = {
  LOGIN:             "→",
  LOGOUT:            "←",
  UPLOAD:            "↑",
  DOWNLOAD:          "↓",
  DELETE:            "✕",
  AI_ANALYSIS:       "⚡",
  REPORT_GENERATION: "📄",
  ADMIN_ACTION:      "⚙",
  VIEW_REPORT:       "👁",
  REGISTER:          "✚",
};

export default function AuditLog() {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    client
      .get("/audit/me")
      .then(({ data }) => setLogs(data.data))
      .catch((err) => setError(err.response?.data?.message || "Unable to load audit trail."))
      .finally(() => setLoading(false));
  }, []);

  const uniqueActions = [...new Set(logs.map((l) => l.action))].sort();
  const filtered = filter === "ALL" ? logs : logs.filter((l) => l.action === filter);

  return (
    <div>
      <h1 className="font-display text-3xl mb-1 text-paper">My Audit Trail</h1>
      <p className="text-muted text-sm mb-6">
        Every action recorded against your account. This log is private — only you can see it.
      </p>

      {loading && (
        <div className="card overflow-hidden animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-start gap-4 px-5 py-4 border-b border-ink-border last:border-0">
              <div className="shrink-0 h-9 w-9 rounded-full bg-ink-border" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 bg-ink-border rounded" />
                <div className="h-2.5 w-48 bg-ink-border/60 rounded" />
              </div>
              <div className="h-3 w-28 bg-ink-border/40 rounded" />
            </div>
          ))}
        </div>
      )}
      {error && <p className="text-risk-high text-sm font-mono">{error}</p>}

      {!loading && !error && (
        <div className="card overflow-hidden">
          {/* Filters */}
          <div className="flex items-center gap-3 p-4 border-b border-ink-border flex-wrap">
            <span className="text-xs font-mono text-muted tracking-widest uppercase">Filter:</span>
            <button
              onClick={() => setFilter("ALL")}
              className={`text-xs font-mono px-2.5 py-1 rounded-sm border transition-colors ${
                filter === "ALL"
                  ? "bg-seal/20 border-seal/40 text-seal-bright"
                  : "border-ink-border text-muted hover:text-paper"
              }`}
            >
              All ({logs.length})
            </button>
            {uniqueActions.map((a) => {
              const s = ACTION_COLORS[a] || { label: a, text: "#8d93a0", bg: "transparent" };
              return (
                <button
                  key={a}
                  onClick={() => setFilter(a)}
                  className={`text-xs font-mono px-2.5 py-1 rounded-sm border transition-colors ${
                    filter === a ? "opacity-100" : "opacity-60 hover:opacity-90"
                  }`}
                  style={{
                    backgroundColor: filter === a ? s.bg : "transparent",
                    borderColor: filter === a ? s.text + "60" : "#2a313d",
                    color: s.text,
                  }}
                >
                  {ACTION_ICONS[a] || "•"} {s.label}
                </button>
              );
            })}
            <span className="ml-auto text-[10px] font-mono text-muted">
              Showing {filtered.length} events
            </span>
          </div>

          {/* Events */}
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-muted text-sm font-mono">No audit records match this filter.</p>
            </div>
          ) : (
            <div className="divide-y divide-ink-border">
              {filtered.map((log, idx) => {
                const s  = ACTION_COLORS[log.action] || { label: log.action, text: "#8d93a0", bg: "transparent" };
                const ic = ACTION_ICONS[log.action] || "•";
                const isSuccess = log.status === "SUCCESS";

                return (
                  <div key={log._id} className="flex items-start gap-4 px-5 py-4 hover:bg-ink/30 transition-colors">
                    {/* Icon */}
                    <div
                      className="shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-base font-bold"
                      style={{ backgroundColor: s.bg, color: s.text }}
                    >
                      {ic}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="text-xs font-mono font-bold px-2 py-0.5 rounded-sm"
                          style={{ backgroundColor: s.bg, color: s.text }}
                        >
                          {s.label}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                            isSuccess
                              ? "bg-emerald-900/20 text-emerald-400"
                              : "bg-red-900/20 text-red-400"
                          }`}
                        >
                          {log.status}
                        </span>
                        {log.ip && (
                          <span className="text-[10px] font-mono text-muted/60">IP: {log.ip}</span>
                        )}
                      </div>
                      {log.meta && Object.keys(log.meta).length > 0 && (
                        <p className="text-xs text-muted font-mono truncate">
                          {Object.entries(log.meta)
                            .filter(([k]) => k !== "userName")
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-mono text-muted whitespace-nowrap">
                        {fmtTime(log.timestamp || log.createdAt)}
                      </div>
                      <div className="text-[10px] font-mono text-muted/40 mt-0.5">
                        #{String(idx + 1).padStart(3, "0")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
