import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedUser = await login(email, password);

      if (isAdminMode && loggedUser.role !== "admin") {
        await logout();
        setError("Access Denied: Administrator privileges required.");
        return;
      }

      if (!isAdminMode && loggedUser.role === "admin") {
        await logout();
        setError("Admin accounts must sign in via the Admin Control Portal.");
        return;
      }

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4 transition-colors duration-500">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl tracking-tight">Docketwise</div>
          <div className="docket-number mt-1 text-muted">CONTRACT REVIEW SYSTEM</div>
        </div>

        <form onSubmit={submit} className={`card p-6 space-y-4 border transition-all duration-300 ${isAdminMode ? "border-risk-high/30 shadow-[0_0_15px_rgba(235,87,87,0.07)]" : "border-ink-border"}`}>
          {/* Tab Switcher */}
          <div className="flex border-b border-ink-border mb-4">
            <button
              type="button"
              onClick={() => { setIsAdminMode(false); setError(""); }}
              className={`flex-1 pb-2 text-xs font-mono tracking-wider transition-colors border-b-2 ${
                !isAdminMode ? "border-seal text-seal-bright font-bold" : "border-transparent text-muted hover:text-paper"
              }`}
            >
              USER PORTAL
            </button>
            <button
              type="button"
              onClick={() => { setIsAdminMode(true); setError(""); }}
              className={`flex-1 pb-2 text-xs font-mono tracking-wider transition-colors border-b-2 ${
                isAdminMode ? "border-risk-high text-risk-high font-bold" : "border-transparent text-muted hover:text-paper"
              }`}
            >
              ADMIN CONTROL
            </button>
          </div>

          <h1 className="font-display text-xl mb-2">
            {isAdminMode ? "Admin Control Room" : "Sign in"}
          </h1>

          {isAdminMode && (
            <div className="p-3 bg-risk-high/5 border border-risk-high/20 rounded-sm text-[11px] text-risk-high leading-relaxed font-mono">
              <strong>NOTICE:</strong> SECURE CHANNEL. Unauthorized access attempts are audited in the central audit trail.
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">EMAIL</label>
            <input type="email" required className="input-field font-sans" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">PASSWORD</label>
            <input type="password" required className="input-field font-sans" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <p className="text-risk-high text-xs font-mono leading-relaxed bg-risk-high/5 p-2 rounded-sm border border-risk-high/20">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2.5 rounded-sm font-mono text-xs tracking-wider transition-all uppercase ${
              isAdminMode 
                ? "bg-risk-high hover:bg-red-700 text-paper border border-risk-high" 
                : "btn-primary"
            }`}
          >
            {loading ? "Verifying…" : isAdminMode ? "Authorize Control" : "Enter Dashboard"}
          </button>

          {!isAdminMode && (
            <p className="text-xs text-muted text-center pt-2 font-mono">
              No account? <Link to="/register" className="text-seal-bright hover:underline">Register</Link>
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
