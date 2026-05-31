import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../../lib/theme";

const NAV = [
  { to: "/dashboard", label: "Dashboard",       icon: "grid_view"     },
  { to: "/query",     label: "Talk to Data",    icon: "psychology"    },
  { to: "/violations",label: "Compliance",      icon: "shield"        },
  { to: "/approvals", label: "Approvals",       icon: "fact_check"    },
  { to: "/reports",   label: "Reports",         icon: "article"       },
  { to: "/policy",    label: "Policy Settings", icon: "settings"      },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggle, isDark } = useTheme();

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg-base)", color: "var(--ink-secondary)" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 flex w-60 flex-col z-20 px-4 py-6"
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--sidebar-border)",
        }}
      >
        {/* Wordmark */}
        <div className="flex items-center gap-3 px-2 mb-7">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl font-black text-white text-base shrink-0"
            style={{ background: "var(--accent)" }}
          >
            B
          </div>
          <div>
            <div className="text-sm font-black tracking-tight" style={{ color: "var(--ink-primary)" }}>
              Brim
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
              Expense Intelligence
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/dashboard"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  isActive ? "text-white shadow-sm" : "hover:bg-white/5"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: "var(--accent)", color: "var(--on-accent)" }
                  : { color: "var(--ink-muted)" }
              }
            >
              <span className="material-symbols-outlined text-[19px]">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom cluster */}
        <div
          className="mt-4 pt-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all hover:bg-white/5"
            style={{ color: "var(--ink-muted)" }}
          >
            <motion.span
              className="material-symbols-outlined text-[19px]"
              key={theme}
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.25 }}
            >
              {isDark ? "light_mode" : "dark_mode"}
            </motion.span>
            {isDark ? "Light mode" : "Dark mode"}
          </button>

          {/* Brim AI indicator */}
          <div className="flex items-center gap-2 px-3 py-2 mt-1">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: "var(--accent)" }}
            />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--ink-muted)" }}>
              Brim AI Active
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main
        className="ml-60 flex-grow min-h-screen relative"
        style={{ background: "var(--bg-base)" }}
      >
        {children}
      </main>
    </div>
  );
}
