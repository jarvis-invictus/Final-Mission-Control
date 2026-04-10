"use client";

import { useRouter } from "next/navigation";
import {
  Search, Users, Mail, FileText, Zap,
  TrendingUp, Download, Globe,
} from "lucide-react";
import { clsx } from "clsx";

interface QuickAction {
  label: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  badge?: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: "Search Everything",
    description: "⌘K — docs, agents, prospects",
    icon: Search,
    href: "#search",
    color: "text-brand-400",
  },
  {
    label: "CRM Pipeline",
    description: "View & manage 1,395 prospects",
    icon: Users,
    href: "/crm",
    color: "text-accent-cyan",
  },
  {
    label: "Dental Prospects",
    description: "190 dental leads — filter view",
    icon: Zap,
    href: "/crm?dental=true",
    color: "text-brand-400",
    badge: "190",
  },
  {
    label: "Compose Email",
    description: "Send from jordan@invictus-ai.in",
    icon: Mail,
    href: "/email?tab=compose",
    color: "text-brand-400",
  },
  {
    label: "Latest Docs",
    description: "518 documents in library",
    icon: FileText,
    href: "/docs",
    color: "text-brand-400",
  },
  {
    label: "Demo Gallery",
    description: "Dental Standard & Premium",
    icon: Globe,
    href: "/demos",
    color: "text-accent-purple",
  },
  {
    label: "Fleet Health",
    description: "Live agent container status",
    icon: TrendingUp,
    href: "/agents",
    color: "text-green-400",
  },
  {
    label: "Export All Prospects",
    description: "Download CSV from CRM",
    icon: Download,
    href: "/crm?export=true",
    color: "text-amber-400",
  },
];

export default function QuickActions() {
  const router = useRouter();

  const handleClick = (action: QuickAction) => {
    if (action.href === "#search") {
      // Trigger ⌘K search
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      return;
    }
    router.push(action.href);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {ACTIONS.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            onClick={() => handleClick(action)}
            className="flex items-start gap-2.5 p-3 bg-surface-2/50 rounded-xl border border-surface-5 hover:bg-surface-3 hover:border-brand-400/20 transition-all text-left group"
          >
            <div className={clsx(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-surface-3 group-hover:bg-brand-400/10 transition-colors"
            )}>
              <Icon className={clsx("w-4 h-4", action.color)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                  {action.label}
                </p>
                {action.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 bg-brand-400/15 text-brand-400 rounded-full font-bold">
                    {action.badge}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-zinc-600 truncate">{action.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
