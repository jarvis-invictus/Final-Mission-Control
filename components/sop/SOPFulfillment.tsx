"use client";

import {
  Code2, MessageSquare, Search, Palette, Package,
  CheckCircle2, Clock, Zap, Monitor, Link2, FileCheck,
  Image, Star, Users, CalendarDays
} from "lucide-react";
import { clsx } from "clsx";

const agents = [
  {
    name: "Linus",
    role: "Build",
    deliverable: "Fork template, configure, deploy",
    timing: "Day 1-2",
    icon: Code2,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  {
    name: "Jeff",
    role: "Delivery",
    deliverable: "Client comms, progress updates",
    timing: "Day 1-3",
    icon: MessageSquare,
    color: "text-brand-400",
    bg: "bg-brand-400/10 border-brand-400/20",
  },
  {
    name: "Gary",
    role: "Content",
    deliverable: "SEO meta tags, Google submission",
    timing: "Day 2-3",
    icon: Search,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    name: "Jony",
    role: "Design",
    deliverable: "Logo refinement if needed",
    timing: "Day 1",
    icon: Palette,
    color: "text-zinc-400",
    bg: "bg-rose-500/10 border-rose-500/20",
  },
];

const packages = [
  {
    name: "Standard",
    price: "₹8,000",
    color: "border-blue-500/20",
    accent: "text-brand-400",
    bg: "bg-brand-400/5",
    features: [
      "5-page responsive website",
      "Mobile-first design",
      "WhatsApp chat button",
      "Contact form",
      "Appointment booking",
      "Basic SEO setup",
      "1 year hosting included",
    ],
  },
  {
    name: "Premium",
    price: "₹14,000",
    color: "border-brand-400/30",
    accent: "text-brand-400",
    bg: "bg-brand-400/5",
    badge: true,
    features: [
      "8+ page responsive website",
      "Individual service pages",
      "Online appointment booking",
      "Instagram feed integration",
      "Advanced SEO + Schema markup",
      "Team / doctors section",
      "Before & after gallery",
      "Testimonials carousel",
      "1 year hosting included",
    ],
  },
];

const timeline = [
  { day: "Day 0", label: "Onboarding", desc: "Form submitted, assets collected", icon: FileCheck, color: "text-zinc-300" },
  { day: "Day 1", label: "Build", desc: "Template forked, content configured", icon: Code2, color: "text-green-400" },
  { day: "Day 2", label: "Review", desc: "Preview shared, feedback collected", icon: MessageSquare, color: "text-brand-400" },
  { day: "Day 3", label: "Launch", desc: "Domain setup, DNS, SSL, go-live", icon: Zap, color: "text-amber-400" },
];

const checklist = [
  { label: "Mobile responsiveness test", icon: Monitor },
  { label: "PageSpeed score > 90", icon: Zap },
  { label: "All navigation links work", icon: Link2 },
  { label: "Contact form submits correctly", icon: FileCheck },
  { label: "SEO meta tags on all pages", icon: Search },
  { label: "Favicon set", icon: Image },
  { label: "OG image configured", icon: Image },
  { label: "WhatsApp button functional", icon: MessageSquare },
  { label: "Google Maps embed works", icon: Link2 },
  { label: "Testimonials display correctly", icon: Star },
];

export default function SOPFulfillment() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SOP: Fulfillment</h1>
            <p className="text-sm text-zinc-500">Agent roles, packages, timelines & quality checklist</p>
          </div>
        </div>
      </div>

      {/* Agent Roles */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Agent Roles in Build</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {agents.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.name}
                className={clsx(
                  "bg-surface-2 border rounded-xl p-4 hover:border-white/10 transition-colors",
                  "border-white/5"
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={clsx("w-10 h-10 rounded-xl border flex items-center justify-center", agent.bg)}>
                    <Icon className={clsx("w-4 h-4", agent.color)} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
                    <span className={clsx("text-xs font-medium", agent.color)}>{agent.role}</span>
                  </div>
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-surface-3 border border-white/5 text-zinc-500 font-medium">
                    {agent.timing}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{agent.deliverable}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Packages */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-4 h-4 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Package Deliverables</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.name}
              className={clsx(
                "rounded-xl border p-5 relative",
                pkg.bg, pkg.color
              )}
            >
              {pkg.badge && (
                <div className="absolute -top-2.5 right-4 px-3 py-0.5 bg-brand-400 text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
                  Popular
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                <p className={clsx("text-2xl font-bold mt-1", pkg.accent)}>{pkg.price}</p>
              </div>
              <div className="space-y-2">
                {pkg.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
                    <CheckCircle2 className={clsx("w-3.5 h-3.5 flex-shrink-0", pkg.accent)} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Timeline */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Delivery Timeline</h2>
        </div>
        <div className="bg-surface-2 border border-white/5 rounded-xl p-5">
          <div className="flex flex-col md:flex-row md:items-stretch gap-4">
            {timeline.map((t, idx) => {
              const Icon = t.icon;
              return (
                <div key={t.day} className="flex-1 relative">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-3 border border-white/5 flex items-center justify-center">
                      <Icon className={clsx("w-4 h-4", t.color)} />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{t.day}</span>
                      <h4 className="text-sm font-semibold text-white -mt-0.5">{t.label}</h4>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500 ml-11">{t.desc}</p>
                  {idx < timeline.length - 1 && (
                    <div className="hidden md:block absolute top-4 -right-2 w-4 text-zinc-600">→</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Quality Checklist */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-4 h-4 text-zinc-400" />
          <h2 className="text-lg font-semibold text-white">Quality Checklist</h2>
        </div>
        <div className="bg-surface-2 border border-white/5 rounded-xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checklist.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface-3 transition-colors">
                  <div className="w-5 h-5 rounded border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3 h-3 text-zinc-500" />
                  </div>
                  <span className="text-sm text-zinc-300">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
