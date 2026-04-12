import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Calendar | Invictus MC' };

import CalendarView from "@/components/calendar/CalendarView";
import Sidebar from "@/components/dashboard/Sidebar";

export default function CalendarPage() {
  return (
    <div className="flex h-screen bg-surface-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <CalendarView />
      </main>
    </div>
  );
}
