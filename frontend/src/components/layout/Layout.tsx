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
          <div className="flex flex-col">
            <div className="text-2xl font-serif font-medium italic tracking-tight" style={{ color: "var(--ink-primary)" }}>
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

      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main
        className="ml-60 w-[calc(100vw-15rem)] min-w-0 min-h-screen relative flex flex-col"
        style={{ background: "var(--bg-base)" }}
      >
        {children}
      </main>
    </div>
  );
}
