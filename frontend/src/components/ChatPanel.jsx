import { useEffect, useRef, useState, useCallback } from "react";
import client from "../api/client.js";

// Copy icon SVG
function CopyIcon({ copied }) {
  return copied ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

// Typing indicator – three bouncing dots
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[85%]">
      <div className="inline-flex items-center gap-1 px-4 py-3 rounded-sm bg-ink border border-ink-border">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 rounded-full bg-muted"
            style={{
              animation: "typingBounce 1.2s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ contractId, presetQuery, onQueryCleared }) {
  const [history, setHistory]     = useState([]);
  const [message, setMessage]     = useState("");
  const [sending, setSending]     = useState(false);
  const [copiedId, setCopiedId]   = useState(null);  // _id of recently copied message
  const [hoveredId, setHoveredId] = useState(null);  // _id of hovered message
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (presetQuery) {
      setMessage(presetQuery);
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (onQueryCleared) onQueryCleared();
    }
  }, [presetQuery, onQueryCleared]);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await client.get(`/chat/${contractId}`);
      setHistory(data.data);
    } catch {
      // non-fatal
    }
  }, [contractId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, sending]);

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      // fallback for non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1600);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    const text = message;
    setMessage("");
    inputRef.current?.focus();
    try {
      await client.post("/chat", { contractId, message: text });
      await loadHistory();
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {/* Inject typing animation CSS once */}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>

      <div className="card flex flex-col" style={{ height: 480 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-border shrink-0">
          <div>
            <h3 className="font-display text-base text-paper">Contract Laws & Regulations</h3>
            <p className="text-[11px] text-muted font-mono mt-0.5">AI assistant focused on statutory laws & compliance</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-emerald-400">LIVE</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ scrollbarWidth: "thin" }}>
          {history.length === 0 && !sending && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="text-3xl">⚖️</div>
              <p className="text-muted text-sm max-w-xs">
                Ask about statutory laws, regulations, and legal compliance frameworks impacting this contract.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {["What statutory laws apply?", "Are labor laws respected?", "What compliance acts govern this?"].map((q) => (
                  <button
                    key={q}
                    onClick={() => { setMessage(q); inputRef.current?.focus(); }}
                    className="text-xs font-mono text-muted border border-ink-border px-2.5 py-1.5 rounded-sm hover:border-seal hover:text-seal-bright transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((m) => {
            const isUser   = m.role === "user";
            const isCopied = copiedId === m._id;
            const isHover  = hoveredId === m._id;

            return (
              <div
                key={m._id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                onMouseEnter={() => setHoveredId(m._id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Bot avatar */}
                {!isUser && (
                  <div className="shrink-0 mr-2 mt-1 h-6 w-6 rounded-full bg-seal/20 border border-seal/30 flex items-center justify-center text-[11px]">
                    ⚖
                  </div>
                )}

                <div className="relative group max-w-[80%]">
                  {/* Bubble */}
                  <div
                    className={`px-4 py-2.5 rounded-sm text-sm whitespace-pre-wrap leading-relaxed ${
                      isUser
                        ? "bg-seal text-ink rounded-br-none"
                        : "bg-ink border border-ink-border text-paper rounded-bl-none"
                    }`}
                  >
                    {m.message}
                  </div>

                  {/* Timestamp + Copy */}
                  <div className={`flex items-center gap-2 mt-1 ${isUser ? "justify-end" : "justify-start"}`}>
                    <span
                      className="text-[10px] font-mono text-muted transition-opacity duration-200"
                      style={{ opacity: isHover ? 1 : 0 }}
                    >
                      {formatTime(m.createdAt)}
                    </span>
                    <button
                      onClick={() => handleCopy(m.message, m._id)}
                      title={isCopied ? "Copied!" : "Copy message"}
                      className={`transition-all duration-200 p-1 rounded-sm ${
                        isHover || isCopied ? "opacity-100" : "opacity-0"
                      } ${
                        isCopied
                          ? "text-emerald-400 bg-emerald-900/20"
                          : "text-muted hover:text-paper hover:bg-ink-border/50"
                      }`}
                    >
                      <CopyIcon copied={isCopied} />
                    </button>
                    {isCopied && (
                      <span className="text-[10px] font-mono text-emerald-400 animate-pulse">
                        Copied!
                      </span>
                    )}
                  </div>
                </div>

                {/* User avatar */}
                {isUser && (
                  <div className="shrink-0 ml-2 mt-1 h-6 w-6 rounded-full bg-seal flex items-center justify-center text-ink text-[11px] font-bold">
                    U
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator while sending */}
          {sending && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* Input form */}
        <form
          onSubmit={send}
          className="flex gap-2 px-4 py-3 border-t border-ink-border bg-ink-raised shrink-0"
        >
          <input
            ref={inputRef}
            className="input-field text-sm"
            placeholder="Ask about laws and regulations governing this contract…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="btn-primary shrink-0 text-sm px-4"
          >
            {sending ? (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-ink animate-ping" />
                <span className="h-1 w-1 rounded-full bg-ink animate-ping" style={{ animationDelay: "0.15s" }} />
                <span className="h-1 w-1 rounded-full bg-ink animate-ping" style={{ animationDelay: "0.3s" }} />
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Ask
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </span>
            )}
          </button>
        </form>
      </div>
    </>
  );
}
