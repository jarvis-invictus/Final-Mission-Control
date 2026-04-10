import Sidebar from '@/components/dashboard/Sidebar';
import EmailCenter from '@/components/email/EmailCenter';

export default function EmailPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <EmailCenter />
      </main>
    </div>
  );
}
