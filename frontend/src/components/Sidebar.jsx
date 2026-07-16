import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Docket", exact: true },
  { to: "/notifications", label: "Notifications" },
  { to: "/audit", label: "Audit trail" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  const items = [...NAV_ITEMS];
  if (user?.role === "admin") {
    items.push({ to: "/admin", label: "Admin Control" });
  }

  return (
    <aside className="w-60 shrink-0 border-r border-ink-border flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-ink-border">
        <div className="font-display text-2xl tracking-tight">Docketwise</div>
        <div className="docket-number mt-1">CONTRACT REVIEW SYSTEM</div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-sm font-body text-sm transition-colors ${
                isActive ? "bg-ink text-seal-bright border-l-2 border-seal" : "text-muted hover:text-paper"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-5 border-t border-ink-border">
        <div className="text-sm text-paper truncate">{user?.name}</div>
        <div className="text-xs text-muted truncate mb-3">{user?.email}</div>
        <button onClick={logout} className="text-xs font-mono text-muted hover:text-seal-bright transition-colors">
          SIGN OUT →
        </button>
      </div>
    </aside>
  );
}
