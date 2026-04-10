import Sidebar from '@/components/dashboard/Sidebar';
import CRMPipeline from '@/components/crm/CRMPipeline';

export default function CRMPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <CRMPipeline />
      </main>
    </div>
  );
}
