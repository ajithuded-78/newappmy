import { useState } from "react";
import Layout, { type Page } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import SalesEntry from "@/pages/SalesEntry";
import Analytics from "@/pages/Analytics";
import Costs from "@/pages/Costs";
import Reports from "@/pages/Reports";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Index() {
  const [page, setPage] = useState<Page>("dashboard");

  const PAGE_MAP: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard />,
    entry: <SalesEntry />,
    analytics: <Analytics />,
    costs: <Costs />,
    reports: <Reports />,
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <Layout activePage={page} onNavigate={setPage}>
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <button onClick={logout}>Logout</button>
      </div>

      {PAGE_MAP[page]}
    </Layout>
  );
}