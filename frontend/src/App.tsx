import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { TalkToData } from "./pages/TalkToData";
import { Violations } from "./pages/Violations";
import { PreApprovals } from "./pages/PreApprovals";
import { ExpenseReports } from "./pages/ExpenseReports";
import { ReportDetail } from "./pages/ReportDetail";
import { PolicyManager } from "./pages/PolicyManager";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/query" element={<TalkToData />} />
        <Route path="/violations" element={<Violations />} />
        <Route path="/approvals" element={<PreApprovals />} />
        <Route path="/reports" element={<ExpenseReports />} />
        <Route path="/reports/:id" element={<ReportDetail />} />
        <Route path="/policy" element={<PolicyManager />} />
      </Routes>
    </Layout>
  );
}
