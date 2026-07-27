import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../api/client.js";
import BackgroundGraphics from "../components/BackgroundGraphics.jsx";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [step, setStep] = useState(1); // 1: Send OTP, 2: Verify & Reset
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSendOTP = async (e, targetEmail = email) => {
    if (e) e.preventDefault();
    setError("");
    setSuccess("");

    const emailErr = getEmailError(targetEmail);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setLoading(true);
    try {
      // Calls forgot-password which generates the 6-digit OTP code and triggers notification-service
      const { data } = await client.post("/auth/forgot-password", { email: targetEmail });
      
      // In development/test mode, the controller returns the OTP directly in the response payload.
      // This allows integration testing and easy local development without an actual SMTP configuration.
      const devOtp = data?.data?.otp;
      if (devOtp) {
        console.log(`[DEV OTP BYPASS]: OTP code is ${devOtp}`);
      }

      setSuccess("Docketwise security firewall has dispatched a 6-digit verification OTP to your email.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Recovery request failed. Please check parameters.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("registeredEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      handleSendOTP(null, savedEmail);
    }
  }, []);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otp || otp.trim().length !== 6) {
      setError("OTP verification code must be exactly 6 digits.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password parameters must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match security parameters.");
      return;
    }

    setLoading(true);
    try {
      await client.post("/auth/reset-password", { 
        email, 
        otp: otp.trim(), 
        newPassword 
      });
      setSuccess("Credentials successfully updated in security ledger database. Redirecting to sign in...");
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Verification code is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-ink text-paper relative overflow-hidden transition-colors duration-300">
      <BackgroundGraphics />

      {/* LEFT COLUMN: Landing presentation */}
      <div className="hidden md:flex md:w-[58%] lg:w-[62%] flex-col justify-between p-12 lg:p-16 border-r border-ink-border relative z-10 select-none">
        <div className="flex items-center gap-2.5 animate-fadeInUp">
          <div className="w-10 h-10 rounded-full border border-seal flex items-center justify-center text-seal font-display text-base font-bold shadow-sm bg-ink-raised">
            ⚖
          </div>
          <div>
            <div className="font-display text-xl font-bold tracking-[0.1em] text-paper uppercase">Docketwise</div>
            <div className="text-[8px] font-mono text-muted tracking-[0.2em] uppercase font-bold">Contract Intelligence</div>
          </div>
        </div>

        <div className="my-auto max-w-2xl space-y-6 animate-fadeInUp" style={{ animationDelay: "0.12s" }}>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-paper">
            Recover your <span className="text-seal">workspace</span> dashboard.
          </h1>
          <p className="text-sm lg:text-base text-muted leading-relaxed font-body">
            Input your registered corporate email parameters, and the security firewall will send a One-Time Verification Password (OTP) to restore account access.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 opacity-60 animate-fadeInUp" style={{ animationDelay: "0.2s" }}>
          <span className="text-[9px] font-mono text-muted tracking-wider uppercase font-semibold">SECURE OTP RECOVERY SYSTEM</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Recovery Card */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-12 bg-ink/10 backdrop-blur-md relative z-10">
        <div className="w-full max-w-sm flex flex-col items-center">
          
          <div className="md:hidden flex items-center gap-2 mb-8 animate-fadeInUp">
            <div className="w-9 h-9 rounded-full border border-seal flex items-center justify-center text-seal font-display text-sm font-bold shadow-sm bg-ink-raised">
              ⚖
            </div>
            <span className="font-display text-lg font-bold tracking-[0.1em] text-paper uppercase">Docketwise</span>
          </div>

          <div 
            className="card glass-card w-full p-8 space-y-5 rounded-[12px] animate-fadeInUp border-seal/20 shadow-[0_12px_45px_-12px_rgba(37,99,235,0.08)] focus-within:border-seal/50 focus-within:shadow-[0_12px_45px_-6px_rgba(37,99,235,0.16)] transition-all duration-500"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="space-y-1.5">
              <h2 className="font-display text-xl font-bold tracking-tight text-paper">Reset password</h2>
              <p className="text-[11px] text-muted font-body leading-relaxed">
                {step === 1 
                  ? "Enter your email address to generate verification code." 
                  : "Verify security OTP and define new password parameters."}
              </p>
            </div>

            {error && (
              <p className="text-risk-high text-[11px] font-mono leading-relaxed bg-risk-high/5 p-3 rounded-[4px] border border-risk-high/20">
                {error}
              </p>
            )}

            {success && (
              <p className="text-seal text-[11px] font-mono leading-relaxed bg-seal/5 p-3 rounded-[4px] border border-seal/20">
                {success}
              </p>
            )}

            {step === 1 ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-mono text-muted mb-1 tracking-widest font-bold">EMAIL ADDRESS</label>
                  <input 
                    type="email" 
                    required 
                    className={`input-field font-sans ${getEmailError(email) ? "border-risk-high focus:border-risk-high focus:ring-risk-high/20" : ""}`} 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                  />
                  {getEmailError(email) && (
                    <p className="text-risk-high text-[10px] font-mono mt-1">{getEmailError(email)}</p>
                  )}
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-3 rounded-[6px] font-mono text-xs tracking-wider transition-all uppercase font-bold flex items-center justify-center shadow-sm hover:shadow-md btn-primary"
                >
                  {loading ? "Requesting OTP…" : "Send Reset OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-mono text-muted mb-1.5 tracking-widest font-bold">6-DIGIT OTP CODE</label>
                  <input 
                    type="text" 
                    required 
                    maxLength={6}
                    placeholder="123456"
                    className="input-field font-mono text-center tracking-[0.5em] text-sm" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} 
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-mono text-muted mb-1.5 tracking-widest font-bold">NEW PASSWORD</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required 
                      className="input-field font-sans pr-10" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
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
                  <label className="block text-[9px] font-mono text-muted mb-1.5 tracking-widest font-bold">CONFIRM NEW PASSWORD</label>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    className="input-field font-sans" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full py-3 rounded-[6px] font-mono text-xs tracking-wider transition-all uppercase font-bold flex items-center justify-center shadow-sm hover:shadow-md btn-primary"
                >
                  {loading ? "Verifying & Saving…" : "Verify & Save Password"}
                </button>
              </form>
            )}
            
            <p className="text-xs text-muted text-center pt-2 font-mono">
              Remember password? <Link to="/login" className="text-seal hover:underline font-bold">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
