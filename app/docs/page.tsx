import Sidebar from '@/components/dashboard/Sidebar';
import DocumentHub from '@/components/docs/DocumentHub';

export default function DocsPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <DocumentHub />
      </main>
    </div>
  );
}
