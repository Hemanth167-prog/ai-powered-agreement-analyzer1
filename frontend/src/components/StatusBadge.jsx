const STYLES = {
  UPLOADED: "text-muted border-ink-border",
  PROCESSING: "text-seal-bright border-seal",
  ANALYZED: "text-risk-low border-risk-low",
  FAILED: "text-risk-high border-risk-high",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`font-mono text-[11px] tracking-wider uppercase border rounded-sm px-2 py-1 ${STYLES[status] || STYLES.UPLOADED}`}>
      {status}
    </span>
  );
}
