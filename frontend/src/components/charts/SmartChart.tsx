import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UIConfig } from "../../types";

const PALETTE = [
  "#2dd4bf", "#7c83ff", "#f59e0b", "#f43f5e", "#38bdf8",
  "#a78bfa", "#34d399", "#fb923c", "#e879f9", "#facc15",
];

type Row = Record<string, unknown>;

function inferKeys(data: Row[], ui: UIConfig) {
  if (!data.length) return { x: "label", y: "value" };
  const keys = Object.keys(data[0]);
  const x = ui.x_axis && keys.includes(ui.x_axis) ? ui.x_axis : keys[0];
  const numeric = keys.find((k) => k !== x && typeof data[0][k] === "number");
  const y = ui.y_axis && keys.includes(ui.y_axis) ? ui.y_axis : numeric || keys[1] || keys[0];
  return { x, y };
}

const axisProps = {
  stroke: "#5b6780",
  tick: { fill: "#94a3b8", fontSize: 12 },
};

const tooltipStyle = {
  contentStyle: {
    background: "#141b2b",
    border: "1px solid #243049",
    borderRadius: 12,
    color: "#e6ebf5",
  },
};

export function SmartChart({ data, ui }: { data: Row[]; ui: UIConfig }) {
  if (!data.length) {
    return (
      <div className="flex h-72 items-center justify-center text-slate-500">
        No data to display.
      </div>
    );
  }

  const { x, y } = inferKeys(data, ui);

  if (ui.chart_type === "table") {
    const keys = Object.keys(data[0]);
    return (
      <div className="max-h-80 overflow-auto rounded-xl border border-outline-variant/60">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-container-low text-left text-xs uppercase text-on-surface-variant">
            <tr>
              {keys.map((k) => (
                <th key={k} className="px-3 py-2 font-semibold">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t border-outline-variant/40">
                {keys.map((k) => (
                  <td key={k} className="px-3 py-2 tabular-nums text-on-background">
                    {String(row[k])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={380}>
      {ui.chart_type === "pie" ? (
        <PieChart>
          <Pie
            data={data}
            dataKey={y}
            nameKey={x}
            cx="50%"
            cy="50%"
            outerRadius={110}
            innerRadius={55}
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
          <Legend />
        </PieChart>
      ) : ui.chart_type === "line" ? (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2940" />
          <XAxis dataKey={x} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey={y} stroke="#2dd4bf" strokeWidth={2.5} dot={false} />
        </LineChart>
      ) : ui.chart_type === "area" ? (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2dd4bf" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#2dd4bf" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2940" />
          <XAxis dataKey={x} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipStyle} />
          <Area type="monotone" dataKey={y} stroke="#2dd4bf" strokeWidth={2} fill="url(#g)" />
        </AreaChart>
      ) : (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2940" />
          <XAxis dataKey={x} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "rgba(124,131,255,0.08)" }} />
          <Bar dataKey={y} radius={[6, 6, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
