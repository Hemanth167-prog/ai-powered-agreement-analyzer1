import React from "react";

export default function FavorabilityPieChart({ favorability, size = "md" }) {
  const userPct = favorability?.userPercentage ?? 50;
  const oppPct = favorability?.oppositePercentage ?? 50;

  // Circular math for drawing arcs
  const radius = 18;
  const circumference = 2 * Math.PI * radius; // ~113.1

  // Calculate dash lengths
  const userDash = (userPct / 100) * circumference;
  const oppDash = circumference - userDash;

  // We rotate by 90 deg counterclockwise so drawing starts at 12 o'clock (top)
  const userOffset = circumference * 0.25;
  const oppOffset = userOffset - userDash;

  // Sizes: sm or md
  const outerDim = size === "sm" ? "w-8 h-8" : "w-12 h-12";
  const ringWidth = "3.8";

  return (
    <div
      className={`relative ${outerDim} flex items-center justify-center shrink-0 select-none cursor-help`}
      title={`User Protectiveness: ${userPct}% | Opposite Side: ${oppPct}%`}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 44 44"
        className="transform -rotate-90 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
      >
        {/* Background base track (slate) */}
        <circle
          cx="22"
          cy="22"
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={ringWidth}
        />

        {/* Opposite side segment (red/rose) */}
        {oppDash > 0.1 && (
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="#ef4444"
            strokeWidth={ringWidth}
            strokeDasharray={`${oppDash} ${circumference}`}
            strokeDashoffset={oppOffset}
            strokeLinecap="butt"
            style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
          />
        )}

        {/* User segment (green/emerald) */}
        {userDash > 0.1 && (
          <circle
            cx="22"
            cy="22"
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth={ringWidth}
            strokeDasharray={`${userDash} ${circumference}`}
            strokeDashoffset={userOffset}
            strokeLinecap="butt"
            style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
          />
        )}
      </svg>

      {/* Center content (user favorability percentage in the middle of the pie chart) */}
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-[9px] font-mono font-extrabold text-paper tracking-tighter leading-none">
          {userPct}%
        </span>
      </div>
    </div>
  );
}
