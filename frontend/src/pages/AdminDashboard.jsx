import { useEffect, useState, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import client from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import UsersPieChart, { getAvatarColor } from "../components/UsersPieChart.jsx";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Format a date as "Thu 16/07/2026 12:36" */
function fmtAuditTime(raw) {
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

/** Badge color per action type */
const ACTION_STYLE = {
  LOGIN:              { bg: "#1c3a28", color: "#4ade80", label: "LOGIN"      },
  LOGOUT:             { bg: "#3a2a14", color: "#fb923c", label: "LOGOUT"     },
  UPLOAD:             { bg: "#172d45", color: "#60a5fa", label: "UPLOAD"     },
  DOWNLOAD:           { bg: "#1e2d45", color: "#818cf8", label: "DOWNLOAD"   },
  DELETE:             { bg: "#3a1a1a", color: "#f87171", label: "DELETE"     },
  AI_ANALYSIS:        { bg: "#1d2a3a", color: "#38bdf8", label: "AI SCAN"    },
  REPORT_GENERATION:  { bg: "#2a1d3a", color: "#c084fc", label: "REPORT"     },
  ADMIN_ACTION:       { bg: "#3a2814", color: "#f59e0b", label: "ADMIN"      },
  VIEW_REPORT:        { bg: "#1e3320", color: "#86efac", label: "VIEW"       },
  REGISTER:           { bg: "#1c2f3a", color: "#7dd3fc", label: "REGISTER"   },
};

function ActionBadge({ action }) {
  const s = ACTION_STYLE[action] || { bg: "#23272e", color: "#8d93a0", label: action };
  return (
    <span
      className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm tracking-wider"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function UserAvatar({ name, userId }) {
  const color = getAvatarColor(userId);
  const initials = name ? name.slice(0, 2).toUpperCase() : "??";
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [users, setUsers]           = useState([]);
  const [activeData, setActiveData] = useState({ count: 0, activeUsers: [] });
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [success, setSuccess]       = useState("");

  // Inspect user history
  const [selectedUser, setSelectedUser]     = useState(null);
  const [userContracts, setUserContracts]   = useState([]);
  const [contractsLoading, setContractsLoading] = useState(false);

  // Live audit feed
  const [auditLogs, setAuditLogs]       = useState([]);
  const [auditFilter, setAuditFilter]   = useState("ALL");   // userId or "ALL"
  const [actionFilter, setActionFilter] = useState("ALL");
  const [newIds, setNewIds]             = useState(new Set()); // recently arrived log IDs
  const prevLogIds = useRef(new Set());

  // Build userId → user lookup map
  const userMap = useMemo(() => {
    const m = {};
    users.forEach((u) => { m[u._id] = u; });
    return m;
  }, [users]);

  // ── Fetchers ──────────────────────────────────────────────────────────────

  const fetchUsers = async () => {
    try {
      const { data } = await client.get("/auth/admin/users");
      setUsers(data.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch user directory.");
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveCount = async () => {
    try {
      const { data } = await client.get("/auth/admin/active-count");
      setActiveData(data.data);
    } catch {
      // silent
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data } = await client.get("/audit/all");
      const incoming = data.data || [];

      // Detect new entries and flash them
      const incomingIds = new Set(incoming.map((l) => l._id));
      const brandNew    = new Set();
      incomingIds.forEach((id) => {
        if (!prevLogIds.current.has(id)) brandNew.add(id);
      });
      prevLogIds.current = incomingIds;

      if (brandNew.size > 0) {
        setNewIds(brandNew);
        setTimeout(() => setNewIds(new Set()), 2500);
      }
      setAuditLogs(incoming);
    } catch {
      // silent — admin sees no data if unavailable
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchActiveCount();
    fetchAuditLogs();

    const actInterval   = setInterval(fetchActiveCount, 4000);
    const auditInterval = setInterval(fetchAuditLogs,   3000);
    return () => { clearInterval(actInterval); clearInterval(auditInterval); };
  }, []);

  // ── Inspect history for a user ────────────────────────────────────────────

  const inspectUserHistory = async (user) => {
    setSelectedUser(user);
    setContractsLoading(true);
    setUserContracts([]);
    try {
      const { data } = await client.get(`/contracts?ownerId=${user._id}`);
      setUserContracts(data.data);
    } catch {
      // silent
    } finally {
      setContractsLoading(false);
    }
  };

  // ── Purge user ────────────────────────────────────────────────────────────

  const purgeUser = async (userId, name) => {
    if (!window.confirm(`Permanently remove user "${name}" and all their data?`)) return;
    setSuccess(""); setError("");
    try {
      await client.delete(`/auth/admin/users/${userId}`);
      setSuccess(`User "${name}" has been successfully purged.`);
      fetchUsers(); fetchActiveCount();
      if (selectedUser?._id === userId) setSelectedUser(null);
    } catch (err) {
      setError(err.response?.data?.message || `Failed to remove "${name}".`);
    }
  };

  const isUserActive = (u) => {
    if (!u.lastActiveAt) return false;
    return Date.now() - new Date(u.lastActiveAt).getTime() < 15000;
  };

  // ── Filtered audit logs ───────────────────────────────────────────────────

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const byUser   = auditFilter   === "ALL" || log.userId === auditFilter;
      const byAction = actionFilter  === "ALL" || log.action === actionFilter;
      return byUser && byAction;
    });
  }, [auditLogs, auditFilter, actionFilter]);

  const uniqueActions = useMemo(() => {
    return [...new Set(auditLogs.map((l) => l.action))].sort();
  }, [auditLogs]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl text-paper">Admin Control Room</h1>
        <p className="text-muted text-sm mt-1">
          Real-time user monitoring, live audit trail, and database management.
        </p>
      </div>

      {/* ── KPI Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pie Chart card */}
        <div className="card p-5 bg-ink border border-ink-border flex flex-col items-center justify-center gap-2 relative overflow-visible"
          style={{ boxShadow: "0 0 30px rgba(39,174,96,0.06)" }}>
          <span className="text-xs font-mono text-muted tracking-wider self-start mb-2">
            USER ACTIVITY OVERVIEW
          </span>
          <UsersPieChart activeCount={activeData.count} totalCount={users.length} />
        </div>

        {/* Total Registered */}
        <div className="card p-5 bg-ink border border-ink-border">
          <span className="text-xs font-mono text-muted tracking-wider block mb-3">TOTAL REGISTERED</span>
          <div className="font-display text-5xl text-paper">{users.length}</div>
          <p className="text-xs text-muted mt-3 font-mono">Unique accounts in database</p>
        </div>

        {/* Firewall */}
        <div className="card p-5 bg-ink border border-ink-border"
          style={{ boxShadow: "0 0 15px rgba(242,153,74,0.03)" }}>
          <span className="text-xs font-mono text-muted tracking-wider block mb-3">SECURITY STATUS</span>
          <div className="text-risk-low font-mono text-lg font-bold">ACTIVE</div>
          <p className="text-xs text-muted mt-4 font-mono">WAF / MongoDB Injection Prevention: ON</p>
          <p className="text-xs text-muted mt-1 font-mono">JWT Auth / RBAC: ON</p>
        </div>
      </div>

      {/* Alerts */}
      {success && <p className="text-risk-low bg-risk-low/5 border border-risk-low/20 p-3 rounded-sm text-xs font-mono">{success}</p>}
      {error   && <p className="text-risk-high bg-risk-high/5 border border-risk-high/20 p-3 rounded-sm text-xs font-mono">{error}</p>}

      {/* ── Live Audit Feed ──────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-ink-border flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="h-2 w-2 rounded-full bg-risk-low animate-pulse shrink-0" />
            <span className="text-xs font-mono text-muted tracking-widest uppercase">
              Live Audit Trail — All Users
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* User filter */}
            <select
              className="text-xs font-mono bg-ink border border-ink-border text-muted px-2 py-1 rounded-sm focus:outline-none focus:border-seal"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
            >
              <option value="ALL">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>{u.name}</option>
              ))}
            </select>
            {/* Action filter */}
            <select
              className="text-xs font-mono bg-ink border border-ink-border text-muted px-2 py-1 rounded-sm focus:outline-none focus:border-seal"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="ALL">All Actions</option>
              {uniqueActions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-muted">
              {filteredLogs.length} events
            </span>
          </div>
        </div>

        <div className="max-h-[520px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
          {filteredLogs.length === 0 ? (
            <p className="p-8 text-center text-xs font-mono text-muted">
              No audit events match the current filters.
            </p>
          ) : (
            <div className="divide-y divide-ink-border">
              {filteredLogs.map((log) => {
                const logUser  = userMap[log.userId];
                const name     = logUser?.name || log.meta?.userName || "Unknown User";
                const email    = logUser?.email || "";
                const isNew    = newIds.has(log._id);

                return (
                  <div
                    key={log._id}
                    className="flex items-start gap-3 px-4 py-3 transition-colors duration-700"
                    style={{
                      backgroundColor: isNew ? "rgba(39,174,96,0.06)" : "transparent",
                      borderLeft: isNew ? "2px solid #27ae60" : "2px solid transparent",
                    }}
                  >
                    {/* Avatar */}
                    <UserAvatar name={name} userId={log.userId} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-paper text-xs font-semibold">{name}</span>
                        {email && (
                          <span className="text-[10px] text-muted font-mono truncate max-w-[180px]">{email}</span>
                        )}
                        <ActionBadge action={log.action} />
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                            log.status === "SUCCESS"
                              ? "bg-emerald-900/20 text-emerald-400"
                              : "bg-red-900/20 text-red-400"
                          }`}
                        >
                          {log.status}
                        </span>
                        {isNew && (
                          <span className="text-[9px] font-mono bg-emerald-500 text-ink px-1.5 py-0.5 rounded-sm animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Timestamp + IP + meta */}
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-[11px] font-mono text-muted">
                          {fmtAuditTime(log.timestamp || log.createdAt)}
                        </span>
                        {log.ip && (
                          <span className="text-[10px] font-mono text-muted/60">IP: {log.ip}</span>
                        )}
                        {log.meta && Object.keys(log.meta).length > 0 && (
                          <span className="text-[10px] font-mono text-muted/50 truncate max-w-[260px]">
                            {Object.entries(log.meta)
                              .filter(([k]) => k !== "userName")
                              .slice(0, 2)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── User Directory Table ─────────────────────────────────────────── */}
      <div className="card overflow-x-auto">
        <div className="p-4 border-b border-ink-border flex justify-between items-center">
          <span className="text-xs font-mono text-muted tracking-widest uppercase">User Directory</span>
          <button onClick={fetchUsers} className="text-xs text-seal-bright hover:underline font-mono">
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-muted font-mono">Loading…</p>
        ) : (
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="border-b border-ink-border text-muted uppercase font-mono tracking-wider">
                <th className="p-4 font-normal">Name</th>
                <th className="p-4 font-normal">Email</th>
                <th className="p-4 font-normal">Country</th>
                <th className="p-4 font-normal">Role</th>
                <th className="p-4 font-normal">Status</th>
                <th className="p-4 font-normal">Last Active</th>
                <th className="p-4 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-border text-muted">
              {users.map((u) => {
                const active = isUserActive(u);
                return (
                  <tr key={u._id} className="hover:bg-ink/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <UserAvatar name={u.name} userId={u._id} />
                        <span className="text-paper font-semibold">{u.name}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono">{u.email}</td>
                    <td className="p-4 font-mono uppercase">{u.country || "N/A"}</td>
                    <td className="p-4 font-mono">
                      <span className={`px-2 py-0.5 rounded-sm ${
                        u.role === "admin"
                          ? "bg-risk-high/15 text-risk-high"
                          : "bg-seal/15 text-seal-bright"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 font-mono">
                      {active ? (
                        <span className="text-risk-low flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-risk-low animate-pulse" />
                          active
                        </span>
                      ) : (
                        <span className="text-muted flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-muted" />
                          offline
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-mono">
                      {u.lastActiveAt ? fmtAuditTime(u.lastActiveAt) : "Never"}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => inspectUserHistory(u)}
                        className="text-seal-bright border border-seal/30 hover:bg-seal hover:text-ink px-2.5 py-1 rounded-sm transition-colors font-mono"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => purgeUser(u._id, u.name)}
                        disabled={u.role === "admin"}
                        className="text-risk-high border border-risk-high/30 hover:bg-risk-high hover:text-paper px-2.5 py-1 rounded-sm transition-colors disabled:opacity-30 disabled:pointer-events-none font-mono"
                      >
                        Purge
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── User History Modal ───────────────────────────────────────────── */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 px-4">
          <div className="card w-full max-w-xl p-6 bg-ink border border-ink-border relative shadow-2xl">
            <div className="flex items-center justify-between mb-5 border-b border-ink-border pb-3">
              <div className="flex items-center gap-3">
                <UserAvatar name={selectedUser.name} userId={selectedUser._id} />
                <div>
                  <h3 className="font-display text-lg text-paper">{selectedUser.name}</h3>
                  <p className="text-[11px] text-muted font-mono uppercase">{selectedUser.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-muted hover:text-paper text-xl"
              >×</button>
            </div>

            {contractsLoading ? (
              <p className="p-8 text-center text-xs font-mono text-muted">Scanning MongoDB records…</p>
            ) : (
              <div className="space-y-4">
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {userContracts.length === 0 ? (
                    <p className="text-muted text-xs text-center py-8 font-mono">
                      This user has not filed any contracts yet.
                    </p>
                  ) : (
                    userContracts.map((c) => (
                      <div key={c._id} className="p-3 border border-ink-border rounded-sm flex items-center justify-between bg-ink/30">
                        <div>
                          <div className="text-sm text-paper font-semibold truncate max-w-sm">{c.fileName}</div>
                          <div className="text-[10px] text-muted mt-1 font-mono">
                            {c.userCountry} → {c.employerCountry} · Filed {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={c.status} />
                          {c.status === "ANALYZED" && (
                            <Link
                              to={`/contracts/${c._id}`}
                              className="text-[11px] font-mono text-seal-bright hover:underline border border-seal/30 px-2 py-0.5 rounded-sm hover:bg-seal hover:text-ink transition-colors"
                            >
                              Inspect
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex justify-end pt-3 border-t border-ink-border">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="btn-secondary font-mono text-xs uppercase tracking-wider"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
