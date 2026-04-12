import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Email | Invictus MC' };

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
