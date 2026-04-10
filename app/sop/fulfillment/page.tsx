import Sidebar from "@/components/dashboard/Sidebar";
import SOPFulfillment from "@/components/sop/SOPFulfillment";

export default function SOPFulfillmentPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <SOPFulfillment />
      </main>
    </div>
  );
}
