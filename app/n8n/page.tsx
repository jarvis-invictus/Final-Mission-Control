import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'n8n Workflows | Invictus MC' };

import N8nView from "@/components/n8n/N8nView";
import Sidebar from "@/components/dashboard/Sidebar";

export default function N8nPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <N8nView />
      </main>
    </div>
  );
}
