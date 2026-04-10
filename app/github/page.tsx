import GitHubView from "@/components/github/GitHubView";
import Sidebar from "@/components/dashboard/Sidebar";

export default function GitHubPage() {
  return (
    <div className="flex h-screen bg-surface-1">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <GitHubView />
      </main>
    </div>
  );
}
