import { useEffect, useState } from "react";
import client from "../api/client.js";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await client.get("/notifications");
    setItems(data.data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markRead = async (id) => {
    await client.patch(`/notifications/${id}/read`);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Notifications</h1>
      <p className="text-muted text-sm mb-8">Updates from the AI, risk, and compliance engines.</p>

      {loading && (
        <div className="space-y-2 animate-pulse">
          {[1,2,3].map(i => (
            <div key={i} className="card px-5 py-4 flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="h-2.5 w-24 bg-ink-border rounded" />
                <div className="h-3.5 w-48 bg-ink-border rounded" />
                <div className="h-3 w-64 bg-ink-border/60 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && items.length === 0 && <p className="text-muted text-sm">No notifications yet.</p>}

      <div className="space-y-2">
        {items.map((n) => (
          <div
            key={n._id}
            className={`card px-5 py-4 flex items-start justify-between gap-4 ${n.isRead ? "opacity-60" : ""}`}
          >
            <div>
              <div className="text-xs font-mono text-seal-bright tracking-wide mb-1">{n.type.replace(/_/g, " ")}</div>
              <div className="font-body text-paper text-sm font-medium">{n.title}</div>
              <div className="text-sm text-muted mt-0.5">{n.message}</div>
              <div className="docket-number mt-2">{new Date(n.createdAt).toLocaleString()}</div>
            </div>
            {!n.isRead && (
              <button onClick={() => markRead(n._id)} className="text-xs font-mono text-muted hover:text-seal-bright shrink-0">
                MARK READ
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
