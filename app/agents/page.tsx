import Sidebar from '@/components/dashboard/Sidebar';
import AgentControl from '@/components/agents/AgentControl';

export default function AgentsPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <AgentControl />
      </main>
    </div>
  );
}
