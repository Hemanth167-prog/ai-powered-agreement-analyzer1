import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import BackgroundGraphics from "../components/BackgroundGraphics.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedUser = await login(email, password);

      // If rememberMe is checked, save email in localStorage (just a client-side simulation)
      if (rememberMe) {
        localStorage.setItem("remembered_email", email);
      } else {
        localStorage.removeItem("remembered_email");
      }

      // Differentiate user vs admin based on login details
      if (loggedUser.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-ink text-paper relative overflow-hidden transition-colors duration-300">
      {/* Background Graphic Watermarks */}
      <BackgroundGraphics />

      {/* LEFT COLUMN: Landing presentation (Hero / Social proof / Stats) */}
      <div className="hidden md:flex md:w-[58%] lg:w-[62%] flex-col justify-between p-12 lg:p-16 border-r border-ink-border relative z-10 select-none">
        
        {/* Logo/Brand Header */}
        <div className="flex items-center gap-2.5 animate-fadeInUp">
          <div className="w-10 h-10 rounded-full border border-seal flex items-center justify-center text-seal font-display text-base font-bold shadow-sm bg-ink-raised">
            ⚖
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-[0.1em] text-paper uppercase">Docketwise</div>
            <div className="text-[8px] font-mono text-muted tracking-[0.2em] uppercase font-bold">Contract Intelligence</div>
          </div>
        </div>

        {/* Hero Headline & Features */}
        <div className="my-auto max-w-2xl space-y-8 animate-fadeInUp" style={{ animationDelay: "0.12s" }}>
          <div className="space-y-4">
            <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-paper">
              Contract intelligence for <span className="text-seal">modern enterprises</span>.
            </h1>
            <p className="text-sm lg:text-base text-muted leading-relaxed font-body">
              Analyze clauses, audit compliance risks, and interrogate agreements with AI. 
              The unified contract database trusted by corporate teams, legal firms, and compliance experts globally.
            </p>
          </div>

          {/* Quick Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-3 p-3.5 bg-ink-raised border border-ink-border rounded-[6px] hover:border-seal/40 hover:-translate-y-[1px] hover:shadow-sm transition-all duration-200">
              <span className="text-base">🔍</span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-paper">Automated Scan</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-0.5">Instant OCR and structure parsing from PDFs.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-ink-raised border border-ink-border rounded-[6px] hover:border-seal/40 hover:-translate-y-[1px] hover:shadow-sm transition-all duration-200">
              <span className="text-base">🛡️</span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-paper">Compliance Audit</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-0.5">Spot regulatory exposure and missing clauses automatically.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-ink-raised border border-ink-border rounded-[6px] hover:border-seal/40 hover:-translate-y-[1px] hover:shadow-sm transition-all duration-200">
              <span className="text-base">💬</span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-paper">Contract Q&A</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-0.5">Ask questions and fetch specific obligations in real time.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 bg-ink-raised border border-ink-border rounded-[6px] hover:border-seal/40 hover:-translate-y-[1px] hover:shadow-sm transition-all duration-200">
              <span className="text-base">🔒</span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-paper">Clear Security</h4>
                <p className="text-[11px] text-muted leading-relaxed mt-0.5">Microservices auditing and RBAC access clear.</p>
              </div>
            </div>
          </div>

          {/* Social Proof Stats */}
          <div className="flex items-center gap-10 pt-4 border-t border-ink-border max-w-lg">
            <div>
              <div className="text-2xl font-extrabold text-paper font-display">99.8%</div>
              <div className="text-[10px] font-mono text-muted tracking-wider uppercase mt-0.5">Accuracy Rate</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-paper font-display">&lt; 15s</div>
              <div className="text-[10px] font-mono text-muted tracking-wider uppercase mt-0.5">Review Speed</div>
            </div>
            <div>
              <div className="text-2xl font-extrabold text-paper font-display">15k+</div>
              <div className="text-[10px] font-mono text-muted tracking-wider uppercase mt-0.5">Agreements Scanned</div>
            </div>
          </div>
        </div>

        {/* Footer Logos */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 opacity-60 animate-fadeInUp" style={{ animationDelay: "0.22s" }}>
          <span className="text-[9px] font-mono text-muted tracking-wider uppercase font-semibold">TRUSTED BY TEAMS AT:</span>
          <span className="text-[11px] font-display font-extrabold tracking-widest text-muted">LEXINGTON</span>
          <span className="text-[11px] font-display font-extrabold tracking-widest text-muted">VERTEX LAW</span>
          <span className="text-[11px] font-display font-extrabold tracking-widest text-muted">APEX VENTURES</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Glassmorphic Login Card */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-ink/10 backdrop-blur-md relative z-10">
        {/* Blurry glow background vector */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-seal/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-sm flex flex-col items-center">
          
          {/* Logo on small screens */}
          <div className="md:hidden flex items-center gap-2 mb-8 animate-fadeInUp">
            <div className="w-9 h-9 rounded-full border border-seal flex items-center justify-center text-seal font-display text-sm font-bold shadow-sm bg-ink-raised">
              ⚖
            </div>
            <span className="font-display text-lg font-bold tracking-[0.1em] text-paper uppercase">Docketwise</span>
          </div>

          <form 
            onSubmit={submit} 
            className="card glass-card w-full p-8 space-y-6 rounded-[12px] animate-fadeInUp transition-all duration-500 border-seal/20 shadow-[0_12px_45px_-12px_rgba(37,99,235,0.08)] focus-within:border-seal/50 focus-within:shadow-[0_12px_45px_-6px_rgba(37,99,235,0.16)]"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="space-y-1.5">
              <h2 className="font-display text-xl font-bold tracking-tight text-paper">
                Sign in to Dashboard
              </h2>
              <p className="text-[11px] text-muted font-body leading-relaxed">
                Welcome back. Access your digital contract docket.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[9px] font-mono text-muted mb-1.5 tracking-widest font-bold">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  required 
                  className="input-field font-sans" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[9px] font-mono text-muted tracking-widest font-bold">PASSWORD</label>
                  <Link to="/forgot-password" className="text-[9px] font-mono text-seal hover:underline">Forgot?</Link>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    className="input-field font-sans pr-10" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-paper text-xs font-mono font-medium focus:outline-none"
                  >
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>
            </div>

            {/* Remember Me Toggle */}
            <div className="flex items-center justify-between text-xs font-body">
              <label className="flex items-center gap-2 cursor-pointer text-muted hover:text-paper">
                <input 
                  type="checkbox" 
                  className="rounded border-ink-border text-seal focus:ring-seal w-3.5 h-3.5 bg-ink-raised"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="font-mono text-[10px] tracking-wider uppercase font-medium select-none">Remember Me</span>
              </label>
            </div>

            {error && (
              <p className="text-risk-high text-[11px] font-mono leading-relaxed bg-risk-high/5 p-3 rounded-[4px] border border-risk-high/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-[6px] font-mono text-xs tracking-wider transition-all uppercase font-bold flex items-center justify-center shadow-sm hover:shadow-md btn-primary"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                  <span>Verifying credentials…</span>
                </div>
              ) : (
                "Enter Secure Workspace"
              )}
            </button>

            <p className="text-xs text-muted text-center pt-2 font-mono">
              Need clearance? <Link to="/register" className="text-seal hover:underline font-bold">Register client details</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
