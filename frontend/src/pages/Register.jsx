import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", country: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl">Docketwise</div>
          <div className="docket-number mt-1">CONTRACT REVIEW SYSTEM</div>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <h1 className="font-display text-xl mb-2">Create an account</h1>
          <div>
            <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">FULL NAME</label>
            <input required className="input-field" value={form.name} onChange={update("name")} />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">EMAIL</label>
            <input type="email" required className="input-field" value={form.email} onChange={update("email")} />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">PASSWORD</label>
            <input type="password" required className="input-field" value={form.password} onChange={update("password")} />
          </div>
          <div>
            <label className="block text-xs font-mono text-muted mb-1.5 tracking-wide">COUNTRY (OPTIONAL)</label>
            <input className="input-field" placeholder="US" value={form.country} onChange={update("country")} />
          </div>
          {error && <p className="text-risk-high text-sm">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating…" : "Create account"}
          </button>
          <p className="text-sm text-muted text-center pt-2">
            Already registered? <Link to="/login" className="text-seal-bright hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
