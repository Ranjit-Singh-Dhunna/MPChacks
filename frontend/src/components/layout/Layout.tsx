import { NavLink, useLocation } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", icon: "grid_view" },
  { to: "/violations", label: "Compliance", icon: "shield" },
  { to: "/approvals", label: "Approvals", icon: "fact_check" },
  { to: "/reports", label: "Reports", icon: "article" },
  { to: "/policy", label: "Policy Settings", icon: "settings" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isDashboardPage = location.pathname === "/";

  return (
    <div className="flex min-h-screen text-on-background bg-background">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-outline-variant bg-surface-container-low px-4 py-6 z-20">
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary font-bold text-on-primary">
            B
          </div>
          <div>
            <div className="text-md font-black tracking-tight text-primary">Brim AI</div>
            <div className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant">
              Expense Intelligence
            </div>
          </div>
        </div>

        {!isDashboardPage && (
          <NavLink
            to="/query"
            className="flex items-center justify-between gap-2 rounded-lg bg-secondary hover:opacity-90 px-3 py-2.5 mb-4 text-sm font-semibold text-white shadow-sm transition-all"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              Talk to Data
            </div>
            <span className="rounded bg-white/20 px-1.5 py-0.5 font-mono text-[9px] text-white border border-white/20">
              ⌘ K
            </span>
          </NavLink>
        )}

        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-secondary text-white font-bold shadow-sm"
                    : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`
              }
            >
              <span className="material-symbols-outlined text-[20px]">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          {isDashboardPage && (
            <NavLink
              to="/query"
              className="flex items-center justify-center gap-2 rounded-lg bg-secondary hover:opacity-90 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">mic</span>
              Talk to Data
            </NavLink>
          )}



          <div className="flex flex-col gap-1 px-2 border-t border-outline-variant pt-4">
            <a
              href="#help"
              className="flex items-center gap-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">help_outline</span>
              Help
            </a>
            <a
              href="#logout"
              className="flex items-center gap-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              Logout
            </a>
          </div>
        </div>
      </aside>

      <main className="ml-60 flex-grow bg-surface-bright min-h-screen relative">{children}</main>
    </div>
  );
}


