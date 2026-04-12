import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Demos | Invictus MC' };

import DemoGallery from "@/components/demos/DemoGallery";
import Sidebar from "@/components/dashboard/Sidebar";

export default function DemosPage() {
  return (
    <div className="flex h-screen bg-surface-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <DemoGallery />
      </main>
    </div>
  );
}
