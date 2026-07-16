import { useEffect, useState } from "react";

// Consistent color per user based on their ID hash
const AVATAR_COLORS = [
  "#27ae60", "#3498db", "#9b59b6", "#f39c12", "#e74c3c",
  "#1abc9c", "#e67e22", "#16a085", "#8e44ad", "#2980b9",
];

export function getAvatarColor(userId) {
  if (!userId) return AVATAR_COLORS[0];
  let hash = 0;
  const str = String(userId);
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function UsersPieChart({ activeCount = 0, totalCount = 0 }) {
  const [hovered, setHovered] = useState(null); // 'active' | 'offline' | null
  const [progress, setProgress] = useState(0);   // 0 → 1 animation

  // Animate arc on mount or data change
  useEffect(() => {
    setProgress(0);
    let raf;
    let start = null;
    const duration = 1100;

    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      // Ease-out cubic
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const timer = setTimeout(() => { raf = requestAnimationFrame(tick); }, 150);
    return () => { clearTimeout(timer); cancelAnimationFrame(raf); };
  }, [activeCount, totalCount]);

  const offlineCount = Math.max(0, totalCount - activeCount);
  const safeTotal = totalCount || 1;

  const cx = 90, cy = 90, r = 68, sw = 22;
  const circ = 2 * Math.PI * r;

  const activeDash  = (activeCount  / safeTotal) * circ * progress;
  const offlineDash = (offlineCount / safeTotal) * circ * progress;

  // Start both arcs from the top (-90°). strokeDashoffset shifts start point.
  // Circle SVG draws from 3-o-clock, so subtract circ/4 to start from 12-o-clock.
  const activeStrokeOfs  = circ * 0.25;                   // top
  const offlineStrokeOfs = circ * 0.25 - activeDash;       // after active

  const activeColor  = hovered === "active"  ? "#34d399" : "#27ae60";
  const offlineColor = hovered === "offline" ? "#9ca3af" : "#374151";
  const activeStrokeW  = hovered === "active"  ? sw + 5 : sw;
  const offlineStrokeW = hovered === "offline" ? sw + 5 : sw;

  const activePercent  = ((activeCount  / safeTotal) * 100).toFixed(1);
  const offlinePercent = ((offlineCount / safeTotal) * 100).toFixed(1);

  return (
    <div className="flex flex-col items-center select-none">
      <div className="relative" style={{ width: 180, height: 180 }}>
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          style={{ filter: "drop-shadow(0 0 24px rgba(39,174,96,0.12))" }}
        >
          {/* Background track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a2035" strokeWidth={sw} />

          {/* Offline segment (drawn first so active is on top) */}
          {offlineDash > 0.5 && (
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={offlineColor}
              strokeWidth={offlineStrokeW}
              strokeDasharray={`${offlineDash} ${circ}`}
              strokeDashoffset={offlineStrokeOfs}
              strokeLinecap="butt"
              style={{ transition: "stroke 0.2s, stroke-width 0.2s", cursor: "pointer" }}
              onMouseEnter={() => setHovered("offline")}
              onMouseLeave={() => setHovered(null)}
            />
          )}

          {/* Active segment */}
          {activeDash > 0.5 && (
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={activeColor}
              strokeWidth={activeStrokeW}
              strokeDasharray={`${activeDash} ${circ}`}
              strokeDashoffset={activeStrokeOfs}
              strokeLinecap="butt"
              style={{ transition: "stroke 0.2s, stroke-width 0.2s", cursor: "pointer" }}
              onMouseEnter={() => setHovered("active")}
              onMouseLeave={() => setHovered(null)}
            />
          )}

          {/* Empty state ring */}
          {totalCount === 0 && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2a313d" strokeWidth={sw} strokeDasharray="6 4" />
          )}

          {/* Center total label */}
          <text
            x={cx} y={cy - 12}
            textAnchor="middle"
            fill={hovered === "active" ? "#34d399" : hovered === "offline" ? "#9ca3af" : "#f3f0e8"}
            fontSize="30"
            fontWeight="700"
            fontFamily="'Source Serif 4', serif"
            style={{ transition: "fill 0.2s" }}
          >
            {hovered === "active" ? activeCount : hovered === "offline" ? offlineCount : totalCount}
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle" fill="#8d93a0" fontSize="7.5" fontFamily="'IBM Plex Mono', monospace" letterSpacing="2">
            {hovered === "active" ? "ACTIVE" : hovered === "offline" ? "OFFLINE" : "TOTAL"}
          </text>
          <text x={cx} y={cy + 21} textAnchor="middle" fill="#8d93a0" fontSize="7.5" fontFamily="'IBM Plex Mono', monospace" letterSpacing="2">
            {hovered === "active" ? `${activePercent}%` : hovered === "offline" ? `${offlinePercent}%` : "USERS"}
          </text>
        </svg>

        {/* Hover tooltip popup */}
        {hovered === "active" && (
          <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <div className="bg-ink border border-[#27ae60]/40 rounded px-3 py-2 shadow-2xl text-xs font-mono whitespace-nowrap">
              <div className="text-[#27ae60] font-bold text-sm">{activeCount} Online</div>
              <div className="text-muted mt-0.5">{activePercent}% of total</div>
              <div className="text-muted">Active ≤ 15s ago</div>
            </div>
          </div>
        )}
        {hovered === "offline" && (
          <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <div className="bg-ink border border-gray-600/40 rounded px-3 py-2 shadow-2xl text-xs font-mono whitespace-nowrap">
              <div className="text-gray-400 font-bold text-sm">{offlineCount} Offline</div>
              <div className="text-muted mt-0.5">{offlinePercent}% of total</div>
              <div className="text-muted">No heartbeat &gt; 15s</div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-1">
        <button
          className="flex items-center gap-2 group"
          onMouseEnter={() => setHovered("active")}
          onMouseLeave={() => setHovered(null)}
        >
          <span
            className="h-2.5 w-2.5 rounded-full transition-transform group-hover:scale-125"
            style={{ backgroundColor: "#27ae60" }}
          />
          <span className="text-xs font-mono text-muted group-hover:text-paper transition-colors">
            Active{" "}
            <span style={{ color: "#27ae60" }} className="font-bold">{activeCount}</span>
          </span>
        </button>

        <button
          className="flex items-center gap-2 group"
          onMouseEnter={() => setHovered("offline")}
          onMouseLeave={() => setHovered(null)}
        >
          <span
            className="h-2.5 w-2.5 rounded-full bg-gray-600 transition-transform group-hover:scale-125"
          />
          <span className="text-xs font-mono text-muted group-hover:text-paper transition-colors">
            Offline{" "}
            <span className="text-gray-400 font-bold">{offlineCount}</span>
          </span>
        </button>
      </div>
    </div>
  );
}
