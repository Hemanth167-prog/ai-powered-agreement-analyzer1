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

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">The Docket</h1>
          <p className="text-muted text-sm mt-1">Every contract you've filed for AI review, in order.</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">File contract</button>
      </div>

      {loading && <p className="text-muted text-sm">Loading docket…</p>}

      {!loading && contracts.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-display text-lg mb-1">The docket is empty</p>
          <p className="text-muted text-sm mb-5">File your first contract to start an AI-backed risk and compliance review.</p>
          <button onClick={() => setShowUpload(true)} className="btn-primary">File contract</button>
        </div>
      )}

      <div className="space-y-2">
        {contracts.map((c, i) => (
          <Link
            key={c._id}
            to={`/contracts/${c._id}`}
            className="card flex items-center gap-4 px-5 py-4 hover:border-seal transition-colors"
          >
            <span className="docket-number w-10 shrink-0">{String(i + 1).padStart(3, "0")}</span>
            <div className="flex-1 min-w-0">
              <div className="font-body text-paper truncate">{c.fileName}</div>
              <div className="text-xs text-muted mt-0.5">
                {c.userCountry} → {c.employerCountry}{c.clientCountry ? ` · ${c.clientCountry}` : ""} · filed{" "}
                {new Date(c.createdAt).toLocaleDateString()}
              </div>
            </div>
            <StatusBadge status={c.status} />
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
