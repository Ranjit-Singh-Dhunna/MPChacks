import { format } from "date-fns";
import { exportElementToPDF } from "../../lib/pdfExport";

export function ReportPreview({ report }: { report: any }) {
  if (!report) return null;

  return (
    <div className="flex flex-col h-full bg-transparent p-4 lg:p-12 overflow-y-auto items-center custom-scrollbar">
      <div className="flex w-full max-w-[850px] justify-end mb-6">
        <button
          onClick={() => exportElementToPDF("report-pdf-content", report.report_title || "Expense_Report")}
          className="bg-blue-600 text-white text-[13px] font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          Download PDF
        </button>
      </div>

      <div
        id="report-pdf-content"
        className="w-full max-w-[850px] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/10 min-h-[1100px] flex flex-col p-12 text-[#1a1a1c]"
      >
        {/* Header */}
        <div className="flex justify-between items-end border-b-2 border-[#1a1a1c] pb-6 mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">{report.report_title}</h1>
            <div className="text-sm font-semibold text-gray-500 mt-2">
              Generated {format(new Date(), "MMMM d, yyyy")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black uppercase tracking-wider text-gray-500">Employee / Department</div>
            <div className="text-xl font-bold">{report.employee_name}</div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-10">
          <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Executive Summary</div>
          <p className="text-sm font-medium leading-relaxed text-gray-800 bg-gray-50 p-4 border-l-4 border-primary/40 rounded-r-lg">
            {report.executive_summary}
          </p>
        </div>

        {/* Total Spend Highlights */}
        <div className="flex justify-between items-center mb-10 bg-gray-50 p-6 rounded-xl border border-gray-100">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-gray-400">Total Spend</div>
            <div className="text-3xl font-black tracking-tight text-[#1a1a1c]">${report.total_spend.toLocaleString()}</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-black uppercase tracking-widest text-gray-400">Transaction Count</div>
            <div className="text-3xl font-black tracking-tight text-[#1a1a1c]">
              {report.groups.reduce((acc: number, g: any) => acc + g.transactions.length, 0)}
            </div>
          </div>
        </div>

        {/* Groups & Transactions */}
        <div className="flex-1 space-y-8">
          {report.groups.map((group: any, idx: number) => (
            <div key={idx} className="break-inside-avoid-page">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-4">
                <h2 className="text-lg font-black">{group.category}</h2>
                <span className="text-lg font-black">${group.total_amount.toLocaleString()}</span>
              </div>
              
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="py-2 font-bold w-24">Date</th>
                    <th className="py-2 font-bold">Merchant</th>
                    <th className="py-2 font-bold w-20 text-right">Amount</th>
                    <th className="py-2 font-bold pl-4 w-32">Policy Status</th>
                  </tr>
                </thead>
                <tbody className="font-medium text-gray-700 divide-y divide-gray-50">
                  {group.transactions.map((t: any) => (
                    <tr key={t.transaction_id} className="break-inside-avoid">
                      <td className="py-2.5 whitespace-nowrap">{t.transaction_date}</td>
                      <td className="py-2.5 truncate max-w-[200px]">{t.merchant_name}</td>
                      <td className="py-2.5 text-right font-bold text-gray-900">${t.amount_usd.toFixed(2)}</td>
                      <td className="py-2.5 pl-4">
                        {t.policy_flag === "VIOLATION" ? (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Violation</span>
                        ) : t.policy_flag === "REVIEW" ? (
                          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Review</span>
                        ) : (
                          <span className="text-gray-400 text-[10px] font-bold uppercase">Compliant</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer Signatures */}
        <div className="mt-16 flex justify-between border-t-2 border-gray-100 pt-8">
          <div className="w-64">
            <div className="border-b border-gray-400 pb-8 mb-2"></div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Prepared By (AI)</div>
          </div>
          <div className="w-64">
            <div className="border-b border-gray-400 pb-8 mb-2"></div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center">CFO Approval</div>
          </div>
        </div>
      </div>
    </div>
  );
}
