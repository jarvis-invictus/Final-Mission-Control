import Sidebar from "@/components/dashboard/Sidebar";
import ActivityLog from "@/components/activity/ActivityLog";

export default function ActivityPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ActivityLog />
      </main>
    </div>
  );
}
