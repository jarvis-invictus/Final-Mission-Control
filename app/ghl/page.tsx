import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'GoHighLevel | Invictus MC' };

import GHLDashboard from "@/components/ghl/GHLDashboard";
import Sidebar from "@/components/dashboard/Sidebar";

export default function GHLPage() {
  return (
    <div className="flex h-screen bg-surface-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <GHLDashboard />
      </main>
    </div>
  );
}
