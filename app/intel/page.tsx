import IntelView from "@/components/intel/IntelView";
import Sidebar from "@/components/dashboard/Sidebar";

export default function IntelPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <IntelView />
      </main>
    </div>
  );
}
