import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Client Pipeline | Invictus MC' };

import ClientPipeline from "@/components/pipeline/ClientPipeline";
import Sidebar from "@/components/dashboard/Sidebar";

export default function PipelinePage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <ClientPipeline />
      </main>
    </div>
  );
}
