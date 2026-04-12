import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Blockers | Invictus MC' };

import Sidebar from "@/components/dashboard/Sidebar";
import BlockerTracker from "@/components/blockers/BlockerTracker";

export default function BlockersPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <BlockerTracker />
      </main>
    </div>
  );
}
