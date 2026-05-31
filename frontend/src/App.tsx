import { Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { HomePage } from "./pages/HomePage";
import { Dashboard } from "./pages/Dashboard";
import { TalkToData } from "./pages/TalkToData";
import { Violations } from "./pages/Violations";
import { PreApprovals } from "./pages/PreApprovals";
import { ApprovalHistory } from "./pages/ApprovalHistory";
import { ExpenseReports } from "./pages/ExpenseReports";
import { ReportDetail } from "./pages/ReportDetail";
import { PolicyManager } from "./pages/PolicyManager";

function AppWithLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Home / Landing — no sidebar */}
      <Route path="/" element={<HomePage />} />

      {/* All other pages — wrapped in Layout with sidebar */}
      <Route element={<AppWithLayout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/query" element={<TalkToData />} />
        <Route path="/violations" element={<Violations />} />
        <Route path="/approvals" element={<PreApprovals />} />
        <Route path="/approvals/history" element={<ApprovalHistory />} />
        <Route path="/reports" element={<ExpenseReports />} />
        <Route path="/reports/:id" element={<ReportDetail />} />
        <Route path="/policy" element={<PolicyManager />} />
      </Route>
    </Routes>
  );
}
