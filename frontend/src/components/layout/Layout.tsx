import { NavLink } from "react-router-dom";

const NAV = [
  { to: "/", label: "Dashboard", icon: "▦" },
  { to: "/query", label: "Talk to Data", icon: "✦" },
  { to: "/violations", label: "Violations", icon: "⚠" },
  { to: "/approvals", label: "Pre-Approvals", icon: "✓" },
  { to: "/reports", label: "Expense Reports", icon: "▤" },
  { to: "/policy", label: "Policy Manager", icon: "§" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-ink-700/60 bg-ink-900/70 px-4 py-6 backdrop-blur">
        <div className="flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brim-500 text-lg font-black text-ink-950">
            B
          </div>
          <div>
            <div className="text-sm font-bold leading-tight">Brim</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Expense Intelligence
            </div>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-brim-500/15 text-brim-400"
                    : "text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                }`
              }
            >
              <span className="w-4 text-center opacity-80">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto rounded-xl border border-ink-700/60 bg-ink-850/60 p-3 text-[11px] leading-relaxed text-slate-500">
          <span className="font-semibold text-brim-400">Deterministic-first.</span>{" "}
          ~85% of checks run in Python; AI sees only flagged anomalies.
        </div>
      </aside>

      <main className="ml-60 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}
