import Sidebar from "@/components/dashboard/Sidebar";
import SOPOnboarding from "@/components/sop/SOPOnboarding";

export default function SOPOnboardingPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <SOPOnboarding />
      </main>
    </div>
  );
}
