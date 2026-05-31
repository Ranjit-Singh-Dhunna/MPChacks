import { format } from "date-fns";
import { exportElementToPDF } from "../../lib/pdfExport";
import type { AIReportGroup, AIReportResponse, AIReportTransaction } from "../../types";

const PREVIEW_ROW_LIMIT = 7;

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value || 0);

const transactionCount = (report: AIReportResponse) =>
  report.groups.reduce((acc, group) => acc + group.transactions.length, 0);

const policyLabel = (transaction: AIReportTransaction) => {
  if (transaction.policy_flag === "VIOLATION") return "Violation";
  if (transaction.policy_flag === "REVIEW") return "Review";
  return "Compliant";
};

function GroupBars({ groups }: { groups: AIReportGroup[] }) {
  const topGroups = [...groups].sort((a, b) => b.total_amount - a.total_amount).slice(0, 5);
  const max = Math.max(...topGroups.map((group) => group.total_amount), 1);

  return (
    <div className="space-y-2">
      {topGroups.map((group) => (
        <div key={group.category} className="grid grid-cols-[minmax(0,1fr)_88px] items-center gap-3 text-[11px]">
          <div className="min-w-0">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate font-bold text-slate-700">{group.category}</span>
              <span className="shrink-0 font-bold tabular-nums text-slate-500">{money(group.total_amount)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.max(8, (group.total_amount / max) * 100)}%` }}
              />
            </div>
          </div>
          <div className="text-right font-semibold tabular-nums text-slate-400">
            {group.transactions.length} items
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionRows({
  transactions,
  limit,
}: {
  transactions: AIReportTransaction[];
  limit?: number;
}) {
  const rows = typeof limit === "number" ? transactions.slice(0, limit) : transactions;

  return (
    <tbody className="divide-y divide-slate-100 text-[11px] font-medium text-slate-700">
      {rows.map((transaction) => (
        <tr key={transaction.transaction_id} className="avoid-page-break">
          <td className="py-2 pr-3 align-top tabular-nums text-slate-500">{transaction.transaction_date}</td>
          <td className="min-w-0 py-2 pr-3 align-top">
            <div className="break-words font-bold text-slate-800">{transaction.merchant_name}</div>
            <div className="break-words text-[10px] text-slate-400">{transaction.mcc_description}</div>
          </td>
          <td className="py-2 pr-3 text-right align-top font-black tabular-nums text-slate-900">
            {money(transaction.amount_usd)}
          </td>
          <td className="py-2 align-top">
            <span
              className={`inline-flex max-w-full rounded px-2 py-0.5 text-[9px] font-black uppercase ${
                transaction.policy_flag === "VIOLATION"
                  ? "bg-red-100 text-red-700"
                  : transaction.policy_flag === "REVIEW"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {policyLabel(transaction)}
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function ReportPage({
  report,
  previewOnly = false,
}: {
  report: AIReportResponse;
  previewOnly?: boolean;
}) {
  const primaryGroup = [...report.groups].sort((a, b) => b.total_amount - a.total_amount)[0];
  const previewTransactions = primaryGroup?.transactions ?? [];
  const hiddenRows = Math.max(previewTransactions.length - PREVIEW_ROW_LIMIT, 0);

  return (
    <section
      className={`report-a4-page bg-white text-slate-950 ${previewOnly ? "h-full overflow-hidden" : "min-h-[1123px]"}`}
    >
      <div className="flex h-full min-h-0 flex-col p-10">
        <header className="mb-7 flex items-end justify-between gap-6 border-b-2 border-slate-950 pb-5">
          <div className="min-w-0">
            <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
              CFO Expense Report
            </div>
            <h1 className="break-words text-3xl font-black uppercase leading-tight text-slate-950">
              {report.report_title}
            </h1>
            <div className="mt-2 text-xs font-semibold text-slate-500">
              Generated {format(new Date(), "MMMM d, yyyy")}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employee / Scope</div>
            <div className="max-w-[220px] break-words text-lg font-black">{report.employee_name || "Multiple"}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">{report.date_range}</div>
          </div>
        </header>

        <div className="mb-7 grid grid-cols-[1.15fr_0.85fr] gap-6">
          <section className="min-w-0">
            <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
              Executive Summary
            </div>
            <p className="max-h-[132px] overflow-hidden border-l-4 border-blue-600 bg-slate-50 p-4 text-[12px] font-medium leading-relaxed text-slate-700">
              {report.executive_summary}
            </p>
          </section>

          <section className="grid grid-cols-1 gap-3">
            <div className="border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Spend</div>
              <div className="mt-1 text-3xl font-black tabular-nums text-slate-950">{money(report.total_spend)}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-slate-200 p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Transactions</div>
                <div className="mt-1 text-2xl font-black tabular-nums">{transactionCount(report)}</div>
              </div>
              <div className="border border-slate-200 p-3">
                <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">Groups</div>
                <div className="mt-1 text-2xl font-black tabular-nums">{report.groups.length}</div>
              </div>
            </div>
          </section>
        </div>

        <section className="mb-7">
          <div className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Spend By Group</div>
          <GroupBars groups={report.groups} />
        </section>

        <section className="min-h-0 flex-1 overflow-hidden">
          <div className="mb-3 flex items-end justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transaction Detail</div>
              <h2 className="truncate text-lg font-black">{primaryGroup?.category || "Transactions"}</h2>
            </div>
            {primaryGroup && (
              <div className="shrink-0 text-right text-sm font-black tabular-nums">{money(primaryGroup.total_amount)}</div>
            )}
          </div>
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                <th className="w-[86px] py-2 pr-3 font-black">Date</th>
                <th className="py-2 pr-3 font-black">Merchant</th>
                <th className="w-[92px] py-2 pr-3 text-right font-black">Amount</th>
                <th className="w-[96px] py-2 font-black">Policy</th>
              </tr>
            </thead>
            <TransactionRows transactions={previewTransactions} limit={PREVIEW_ROW_LIMIT} />
          </table>
          {hiddenRows > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-400">
              + {hiddenRows} more rows in PDF
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function FullReportDocument({ report }: { report: AIReportResponse }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "-9999px",
        top: 0,
        width: "794px",
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <div
        id="report-pdf-content"
        className="w-[794px] bg-white text-slate-950"
      >
        <textarea id="report-latex-source" className="hidden" readOnly value={report.latex_source} />
        <ReportPage report={report} />
        <div className="report-a4-page min-h-[1123px] bg-white p-10 text-slate-950">
          <h2 className="mb-5 border-b-2 border-slate-950 pb-3 text-2xl font-black uppercase">
            Full Transaction Detail
          </h2>
          {report.groups.map((group) => (
            <section key={group.category} className="avoid-page-break mb-8">
              <div className="mb-3 flex justify-between gap-4 border-b border-slate-200 pb-2">
                <h3 className="break-words text-lg font-black">{group.category}</h3>
                <div className="shrink-0 text-lg font-black tabular-nums">{money(group.total_amount)}</div>
              </div>
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400">
                    <th className="w-[86px] py-2 pr-3 font-black">Date</th>
                    <th className="py-2 pr-3 font-black">Merchant</th>
                    <th className="w-[92px] py-2 pr-3 text-right font-black">Amount</th>
                    <th className="w-[120px] py-2 font-black">Policy</th>
                  </tr>
                </thead>
                <TransactionRows transactions={group.transactions} />
              </table>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ReportPreviewPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center overflow-hidden bg-transparent p-4 lg:p-12">
      <div className="mb-6 flex w-full max-w-[850px] justify-end">
        <div className="h-10 w-36 animate-pulse bg-white/80 shadow-sm" />
      </div>
      <div className="report-preview-frame w-full max-w-[850px] shadow-[0_20px_50px_rgba(15,23,42,0.28)]">
        <div className="report-a4-page h-full overflow-hidden bg-white p-10">
          <div className="mb-7 flex items-end justify-between gap-6 border-b-2 border-slate-200 pb-5">
            <div className="w-2/3 space-y-3">
              <div className="h-3 w-32 animate-pulse bg-blue-100" />
              <div className="h-8 w-full animate-pulse bg-slate-100" />
              <div className="h-3 w-44 animate-pulse bg-slate-100" />
            </div>
            <div className="w-40 space-y-2">
              <div className="h-3 w-full animate-pulse bg-slate-100" />
              <div className="h-6 w-full animate-pulse bg-slate-100" />
            </div>
          </div>
          <div className="mb-7 grid grid-cols-[1.15fr_0.85fr] gap-6">
            <div className="space-y-3">
              <div className="h-3 w-36 animate-pulse bg-slate-100" />
              <div className="h-28 animate-pulse bg-slate-50" />
            </div>
            <div className="space-y-3">
              <div className="h-24 animate-pulse bg-slate-50" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-20 animate-pulse bg-slate-50" />
                <div className="h-20 animate-pulse bg-slate-50" />
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="grid grid-cols-[1fr_88px] gap-3">
                <div className="h-7 animate-pulse bg-slate-50" />
                <div className="h-7 animate-pulse bg-slate-50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReportPreview({ report }: { report: AIReportResponse }) {
  if (!report) return null;

  return (
    <div className="flex h-full flex-col items-center overflow-hidden bg-transparent p-4 lg:p-12">
      <div className="mb-6 flex w-full max-w-[850px] justify-end">
        <button
          onClick={() => exportElementToPDF("report-pdf-content", report.report_title || "Expense_Report")}
          className="flex items-center gap-2 bg-blue-600 px-5 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-60 rounded-lg"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download PDF
        </button>
      </div>

      <div className="report-preview-frame w-full max-w-[850px] shadow-[0_20px_50px_rgba(15,23,42,0.28)]">
        <ReportPage report={report} previewOnly />
      </div>

      <FullReportDocument report={report} />
    </div>
  );
}
