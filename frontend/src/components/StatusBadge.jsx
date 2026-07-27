const STYLES = {
  UPLOADED: "bg-slate-100/80 text-slate-500 border-slate-200/60",
  PROCESSING: "bg-seal/10 text-seal border-seal/20 animate-pulse font-bold",
  ANALYZED: "bg-risk-low/10 text-risk-low border-risk-low/20 font-semibold",
  FAILED: "bg-risk-high/10 text-risk-high border-risk-high/20 font-semibold",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`font-mono text-[10px] tracking-wider uppercase border rounded-[3px] px-2.5 py-0.5 ${STYLES[status] || STYLES.UPLOADED}`}>
      {status}
    </span>
  );
}
