import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Meetings | Invictus MC' };

import MeetingsView from "@/components/meetings/MeetingsView";
import Sidebar from "@/components/dashboard/Sidebar";

export default function MeetingsPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <MeetingsView />
      </main>
    </div>
  );
}
