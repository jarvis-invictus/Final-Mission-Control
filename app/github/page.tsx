"use client";

import { useState } from "react";
import { Github, Triangle } from "lucide-react";
import { clsx } from "clsx";
import GitHubView from "@/components/github/GitHubView";
import VercelView from "@/components/github/VercelView";
import Sidebar from "@/components/dashboard/Sidebar";

export default function GitHubPage() {
  const [tab, setTab] = useState<"github" | "vercel">("github");

  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-[1600px] mx-auto">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-surface-2 rounded-xl border border-white/5 w-fit mb-6">
            <button onClick={() => setTab("github")}
              className={clsx("flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                tab === "github" ? "bg-brand-400/20 text-brand-400" : "text-zinc-500 hover:text-white"
              )}>
              <Github className="w-4 h-4" /> GitHub
            </button>
            <button onClick={() => setTab("vercel")}
              className={clsx("flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all",
                tab === "vercel" ? "bg-brand-400/20 text-brand-400" : "text-zinc-500 hover:text-white"
              )}>
              <Triangle className="w-4 h-4" /> Vercel
            </button>
          </div>

          {tab === "github" && <GitHubView />}
          {tab === "vercel" && <VercelView />}
        </div>
      </main>
    </div>
  );
}
