"use client";

import { useState } from "react";
import { UserPlus, ClipboardCheck } from "lucide-react";
import { clsx } from "clsx";

// Import existing components directly
import OnboardingEngine from "@/components/onboarding/OnboardingEngine";
import FulfillmentTracker from "@/components/fulfillment/FulfillmentTracker";

type Tab = "fulfillment" | "onboard";

export default function ClientPipeline() {
  const [tab, setTab] = useState<Tab>("fulfillment");

  const tabs = [
    { id: "fulfillment" as Tab, label: "Track Clients", icon: ClipboardCheck, desc: "Monitor delivery progress" },
    { id: "onboard" as Tab, label: "Onboard New", icon: UserPlus, desc: "Add a new client" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Client Pipeline</h1>
        <p className="text-sm text-zinc-500 mt-1">Onboard new clients and track fulfillment in one place</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all border",
              tab === t.id
                ? "bg-brand-400/10 text-brand-400 border-brand-400/20 shadow-[0_0_15px_rgba(212,168,83,0.1)]"
                : "bg-surface-2 text-zinc-400 border-white/5 hover:text-white hover:border-white/10"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            <span className="text-[10px] text-zinc-600 hidden sm:inline">· {t.desc}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === "fulfillment" && <FulfillmentTracker />}
      {tab === "onboard" && (
        <div className="max-w-2xl mx-auto">
          <OnboardingEngine />
        </div>
      )}
    </div>
  );
}
