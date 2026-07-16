// The platform's signature element: a wax-seal-style badge marking a contract's
// risk level, echoing the way a physical legal document gets stamped.
const LEVELS = {
  HIGH: { label: "H", ring: "border-risk-high", text: "text-risk-high", word: "High risk" },
  MEDIUM: { label: "M", ring: "border-risk-medium", text: "text-risk-medium", word: "Medium risk" },
  LOW: { label: "L", ring: "border-risk-low", text: "text-risk-low", word: "Low risk" },
};

export default function Seal({ level = "LOW", size = "md" }) {
  const cfg = LEVELS[level] || LEVELS.LOW;
  const dim = size === "sm" ? "w-8 h-8 text-xs" : "w-11 h-11 text-sm";
  return (
    <div className="flex items-center gap-2" title={cfg.word}>
      <div
        className={`${dim} rounded-full border-2 ${cfg.ring} flex items-center justify-center font-display font-semibold ${cfg.text} shrink-0`}
        style={{ background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.06), transparent 60%)" }}
      >
        {cfg.label}
      </div>
    </div>
  );
}
