"""LaTeX document builder for AI-generated expense reports."""

from typing import Any


_LATEX_REPLACEMENTS = {
    "\\": r"\textbackslash{}",
    "&": r"\&",
    "%": r"\%",
    "$": r"\$",
    "#": r"\#",
    "_": r"\_",
    "{": r"\{",
    "}": r"\}",
    "~": r"\textasciitilde{}",
    "^": r"\textasciicircum{}",
}


def _tex(value: Any) -> str:
    text = "" if value is None else str(value)
    return "".join(_LATEX_REPLACEMENTS.get(char, char) for char in text)


def _money(value: float | int | None) -> str:
    return f"\\${float(value or 0):,.2f}"


def build_ai_report_latex(report: Any) -> str:
    """Build a compile-ready LaTeX source for a CFO expense report.

    Tables use fixed-width columns and ragged text so long merchant names,
    categories, and policy notes wrap instead of bleeding past the page edge.
    """

    groups = list(getattr(report, "groups", []) or [])
    transaction_count = sum(len(getattr(group, "transactions", []) or []) for group in groups)
    group_rows = "\n".join(
        rf"{_tex(getattr(group, 'category', 'Other'))} & {_money(getattr(group, 'total_amount', 0))} & {len(getattr(group, 'transactions', []) or [])} \\"
        for group in groups[:12]
    ) or r"None & \$0.00 & 0 \\"

    detail_tables: list[str] = []
    for group in groups:
        rows: list[str] = []
        for transaction in getattr(group, "transactions", []) or []:
            status = getattr(transaction, "policy_flag", None) or "COMPLIANT"
            flag_reason = getattr(transaction, "flag_reason", None)
            policy = status if not flag_reason else f"{status}: {flag_reason}"
            rows.append(
                " & ".join(
                    [
                        _tex(getattr(transaction, "transaction_date", "")),
                        _tex(getattr(transaction, "merchant_name", "")),
                        _money(getattr(transaction, "amount_usd", 0)),
                        _tex(policy),
                    ]
                )
                + r" \\"
            )
        if not rows:
            rows.append(r"-- & No transactions & \$0.00 & -- \\")

        detail_tables.append(
            rf"""
\subsection*{{{_tex(getattr(group, 'category', 'Other'))}}}
\begin{{longtable}}{{P{{0.16\linewidth}} P{{0.40\linewidth}} R{{0.15\linewidth}} P{{0.21\linewidth}}}}
\toprule
\textbf{{Date}} & \textbf{{Merchant}} & \textbf{{Amount}} & \textbf{{Policy}} \\
\midrule
\endhead
{chr(10).join(rows)}
\bottomrule
\end{{longtable}}
"""
        )

    return rf"""\documentclass[11pt]{{article}}
\usepackage[letterpaper,margin=0.65in]{{geometry}}
\usepackage{{array}}
\usepackage{{booktabs}}
\usepackage{{longtable}}
\usepackage{{tabularx}}
\usepackage[table]{{xcolor}}
\usepackage{{helvet}}
\renewcommand{{\familydefault}}{{\sfdefault}}
\setlength{{\parindent}}{{0pt}}
\setlength{{\parskip}}{{6pt}}
\setlength{{\tabcolsep}}{{5pt}}
\renewcommand{{\arraystretch}}{{1.18}}
\newcolumntype{{P}}[1]{{>{{\raggedright\arraybackslash}}p{{#1}}}}
\newcolumntype{{R}}[1]{{>{{\raggedleft\arraybackslash}}p{{#1}}}}
\sloppy
\emergencystretch=2em

\begin{{document}}

\begin{{center}}
{{\LARGE\bfseries {_tex(getattr(report, "report_title", "AI Expense Report"))}}}\\[4pt]
{{\small {_tex(getattr(report, "date_range", "Recent"))} \quad | \quad {_tex(getattr(report, "employee_name", "Multiple"))}}}
\end{{center}}

\vspace{{8pt}}
\hrule
\vspace{{12pt}}

\section*{{Executive Summary}}
{_tex(getattr(report, "executive_summary", ""))}

\section*{{Spend Snapshot}}
\begin{{tabularx}}{{\linewidth}}{{X R{{0.24\linewidth}}}}
\textbf{{Total Spend}} & \textbf{{{_money(getattr(report, "total_spend", 0))}}} \\
\textbf{{Transactions}} & \textbf{{{transaction_count}}} \\
\textbf{{Groups}} & \textbf{{{len(groups)}}} \\
\end{{tabularx}}

\section*{{Group Summary}}
\rowcolors{{2}}{{gray!6}}{{white}}
\begin{{tabularx}}{{\linewidth}}{{X R{{0.22\linewidth}} R{{0.18\linewidth}}}}
\toprule
\textbf{{Group}} & \textbf{{Spend}} & \textbf{{Items}} \\
\midrule
{group_rows}
\bottomrule
\end{{tabularx}}

\newpage
\section*{{Transaction Detail}}
{chr(10).join(detail_tables)}

\end{{document}}
"""
