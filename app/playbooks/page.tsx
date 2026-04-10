import Sidebar from '@/components/dashboard/Sidebar';
import PlaybookViewer from '@/components/playbooks/PlaybookViewer';

export default function PlaybooksPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <PlaybookViewer />
      </main>
    </div>
  );
}
