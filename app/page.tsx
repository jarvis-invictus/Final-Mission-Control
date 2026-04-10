import Sidebar from '@/components/dashboard/Sidebar';
import CommandCenter from '@/components/dashboard/CommandCenter';

export default function Home() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <CommandCenter />
      </main>
    </div>
  );
}
