import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Docket Dashboard", exact: true, icon: "📁" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
  { to: "/audit", label: "Security Audit", icon: "🛡️" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem("sidebar_collapsed") === "true";
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar_collapsed", next ? "true" : "false");
  };

  const items = [...NAV_ITEMS];
  if (user?.role === "admin") {
    items.push({ to: "/admin", label: "Control Center", icon: "🔑" });
  }

  return (
    <aside 
      className={`shrink-0 border-r border-ink-border flex flex-col h-screen sticky top-0 sidebar-bg relative z-20 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Sidebar Header Brand */}
      <div className={`px-5 py-6 border-b border-ink-border/50 bg-ink/10 flex flex-col transition-all duration-300 ${
        collapsed ? "items-center" : "items-stretch"
      }`}>
        {!collapsed ? (
          <div className="flex items-center justify-between w-full animate-fadeInUp">
            <div className="flex flex-col">
              <span className="font-display text-2xl font-bold tracking-[0.12em] text-seal uppercase select-none">
                Docketwise
              </span>
              <span className="text-[8px] font-mono text-muted tracking-[0.2em] mt-1.5 uppercase font-semibold select-none">
                Contract Intelligence
              </span>
            </div>
            <button 
              onClick={toggle}
              className="w-6 h-6 rounded-full border border-ink-border bg-ink-raised flex items-center justify-center text-muted hover:text-paper shadow-sm hover:shadow active:scale-95 transition-all text-[10px] focus:outline-none"
              title="Collapse Navigation"
            >
              ←
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3.5 animate-scaleIn">
            <div className="w-10 h-10 rounded-full border border-seal/30 flex items-center justify-center text-seal font-display text-base font-bold shadow-sm bg-ink-raised select-none">
              ⚖
            </div>
            <button 
              onClick={toggle}
              className="w-6 h-6 rounded-full border border-ink-border bg-ink-raised flex items-center justify-center text-muted hover:text-paper shadow-sm hover:shadow active:scale-95 transition-all text-[10px] focus:outline-none"
              title="Expand Navigation"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Navigation menu */}
      <nav className={`flex-1 py-6 space-y-2 overflow-y-auto ${collapsed ? "px-2.5" : "px-4"}`}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `flex items-center rounded-[6px] font-body text-[11px] font-bold tracking-wider uppercase transition-all duration-200 border-l-2 ${
                collapsed ? "justify-center py-3 border-l-0" : "gap-3 px-4 py-2.5"
              } ${
                isActive 
                  ? "bg-seal/[0.06] border-seal text-seal shadow-[0_2px_8px_-3px_rgba(140,98,57,0.06)]" 
                  : "border-transparent text-muted hover:bg-seal/[0.02] hover:text-paper"
              }`
            }
          >
            <span className="text-sm opacity-80">{item.icon}</span>
            {!collapsed && <span className="animate-fadeInUp">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer User panel */}
      <div className={`py-5 border-t border-ink-border/60 bg-ink/20 flex flex-col transition-all ${
        collapsed ? "items-center px-2" : "px-5"
      }`}>
        {!collapsed ? (
          <div className="flex flex-col w-full animate-fadeInUp">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-mono text-muted uppercase tracking-widest font-bold">CLIENT WORKSPACE</span>
              
              {/* Theme Toggle Switch */}
              <button
                onClick={toggleTheme}
                className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-ink-border transition-colors duration-200 ease-in-out focus:outline-none bg-slate-200 dark:bg-slate-800"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                <span
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[8px] ${
                    theme === "dark" ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                  style={{ marginTop: "1px" }}
                >
                  {theme === "light" ? "☀️" : "🌙"}
                </span>
              </button>
            </div>
            <div className="text-sm font-bold text-paper truncate select-none">{user?.name}</div>
            <div className="text-[10px] font-mono text-muted truncate mb-4 select-none">{user?.email}</div>
          </div>
        ) : (
          <button
            onClick={toggleTheme}
            className="p-2 mb-3 rounded-full border border-ink-border hover:border-seal bg-ink-raised hover:text-seal-bright transition-all focus:outline-none text-xs flex items-center justify-center"
            title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
        )}

        <button 
          onClick={logout} 
          title={collapsed ? "Sign Out" : undefined}
          className={`font-mono text-seal hover:text-seal-bright transition-colors uppercase tracking-widest font-bold flex items-center ${
            collapsed ? "justify-center p-2.5 text-sm rounded-full hover:bg-risk-high/15 hover:text-risk-high border border-transparent hover:border-risk-high/20 transition-all" : "text-left text-[10px] gap-1.5"
          }`}
        >
          {collapsed ? "🚪" : (
            <>
              <span>[ SIGN OUT</span>
              <span>→ ]</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
