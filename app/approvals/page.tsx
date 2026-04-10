import ApprovalsView from "@/components/approvals/ApprovalsView";
import Sidebar from "@/components/dashboard/Sidebar";

export default function ApprovalsPage() {
  return (
    <div className="flex h-screen bg-surface-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ApprovalsView />
      </main>
    </div>
  );
}
