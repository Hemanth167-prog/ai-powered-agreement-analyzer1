import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import BackgroundGraphics from "../components/BackgroundGraphics.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", country: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const getEmailError = (email) => {
    if (!email) return null;
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(email)) {
      return "Email address must contain only lowercase letters.";
    }
    const emailParts = email.split('@');
    if (emailParts.length === 2 && emailParts[1].toLowerCase() === 'gmail.com') {
      const username = emailParts[0];
      if (username.length < 6 || username.length > 30) {
        return "Gmail username must be between 6 and 30 characters.";
      }
      if (!/^[a-zA-Z0-9.]+$/.test(username)) {
        return "Gmail username can only contain letters, numbers, and periods.";
      }
      if (/\.\./.test(username)) {
        return "Gmail username cannot contain consecutive periods.";
      }
      if (username.startsWith('.') || username.endsWith('.')) {
        return "Gmail username cannot start or end with a period.";
      }
    }
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Email format validation
    const emailErr = getEmailError(form.email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    // Name validation (Username format check, e.g. Hemanth or Hemanth1234)
    const trimmedName = form.name.trim();
    const nameRegex = /^[a-zA-Z]+[0-9]*$/;
    if (!nameRegex.test(trimmedName)) {
      setError("Name must contain only letters, optionally followed by numbers (e.g., Hemanth or Hemanth1234).");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      localStorage.setItem("registeredEmail", form.email);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-ink text-paper relative overflow-hidden transition-colors duration-300">
      {/* Background Graphic Watermarks */}
      <BackgroundGraphics />

      {/* LEFT COLUMN: Landing presentation (Hero / Features / Logos) */}
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
              Get started with <span className="text-seal">Docketwise</span> today.
            </h1>
            <p className="text-sm lg:text-base text-muted leading-relaxed font-body">
              Create an account to start scanning corporate agreements, identifying hidden liabilities, and querying documents instantly with Gemini.
            </p>
          </div>

          {/* Quick Checklist */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-seal font-bold">✓</span>
              <span className="text-xs font-semibold text-paper uppercase font-mono tracking-wider">No credit card required for standard analysis</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-seal font-bold">✓</span>
              <span className="text-xs font-semibold text-paper uppercase font-mono tracking-wider">Full access to Risk & Compliance Auditing</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-seal font-bold">✓</span>
              <span className="text-xs font-semibold text-paper uppercase font-mono tracking-wider">Encrypted, audit-trailed database storage</span>
            </div>
          </div>
        </div>

        {/* Footer Logos */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 opacity-60 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <span className="text-[9px] font-mono text-muted tracking-wider uppercase font-semibold">TRUSTED BY TEAMS AT:</span>
          <span className="text-[11px] font-display font-extrabold tracking-widest text-muted">LEXINGTON</span>
          <span className="text-[11px] font-display font-extrabold tracking-widest text-muted">VERTEX LAW</span>
          <span className="text-[11px] font-display font-extrabold tracking-widest text-muted">APEX VENTURES</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Glassmorphic Register Card */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-ink/10 backdrop-blur-md relative z-10">
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
            className="card glass-card w-full p-8 space-y-5 rounded-[12px] animate-fadeInUp border-seal/20 shadow-[0_12px_45px_-12px_rgba(37,99,235,0.08)] focus-within:border-seal/50 focus-within:shadow-[0_12px_45px_-6px_rgba(37,99,235,0.16)] transition-all duration-500"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="space-y-1.5">
              <h2 className="font-display text-xl font-bold tracking-tight text-paper">Create client account</h2>
              <p className="text-[11px] text-muted font-body leading-relaxed">
                Register contract docket workspace clearance.
              </p>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[9px] font-mono text-muted mb-1 tracking-widest font-bold">FULL NAME</label>
                <input 
                  required 
                  className={`input-field font-sans ${form.name && !/^[a-zA-Z]+[0-9]*$/.test(form.name.trim()) ? "border-risk-high focus:border-risk-high focus:ring-risk-high/20" : ""}`}
                  placeholder="e.g. Hemanth"
                  value={form.name} 
                  onChange={update("name")} 
                />
                {form.name && !/^[a-zA-Z]+[0-9]*$/.test(form.name.trim()) && (
                  <p className="text-risk-high text-[10px] font-mono mt-1">Must contain only letters, optionally followed by numbers (e.g., Hemanth or Hemanth1234)</p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-mono text-muted mb-1 tracking-widest font-bold">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  required 
                  className={`input-field font-sans ${getEmailError(form.email) ? "border-risk-high focus:border-risk-high focus:ring-risk-high/20" : ""}`}
                  placeholder="e.g. email@domain.com"
                  value={form.email} 
                  onChange={update("email")} 
                />
                {getEmailError(form.email) && (
                  <p className="text-risk-high text-[10px] font-mono mt-1">{getEmailError(form.email)}</p>
                )}
              </div>
              <div>
                <label className="block text-[9px] font-mono text-muted mb-1 tracking-widest font-bold">PASSWORD</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    className="input-field font-sans pr-10" 
                    value={form.password} 
                    onChange={update("password")} 
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
              <div>
                <label className="block text-[9px] font-mono text-muted mb-1 tracking-widest font-bold">COUNTRY (OPTIONAL)</label>
                <input className="input-field font-sans" placeholder="e.g. India" maxLength={100} value={form.country} onChange={update("country")} />
              </div>
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
                  <span>Creating account…</span>
                </div>
              ) : (
                "Create Account & Enter"
              )}
            </button>
            
            <p className="text-xs text-muted text-center pt-2 font-mono">
              Already registered? <Link to="/login" className="text-seal hover:underline font-bold">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
