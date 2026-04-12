import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Onboarding | Invictus MC' };

import OnboardingEngine from "@/components/onboarding/OnboardingEngine";
import Sidebar from "@/components/dashboard/Sidebar";

export default function OnboardingPage() {
  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-[1600px] mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center">
              <span className="text-xl">🚀</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Onboarding Engine</h1>
              <p className="text-sm text-zinc-500">Fill form once → GHL contact + pipeline + fulfillment + Jarvis brief auto-triggered</p>
            </div>
          </div>
          <OnboardingEngine />
        </div>
      </main>
    </div>
  );
}
