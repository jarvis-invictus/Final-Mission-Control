"use client";

import { useState } from "react";
import {
  Phone, FileText, Camera, Code2, MessageSquare,
  Rocket, HeartHandshake, ChevronDown, ChevronUp,
  Clock, CheckCircle2
} from "lucide-react";
import { clsx } from "clsx";

const steps = [
  {
    num: 1,
    title: "Discovery Call",
    icon: Phone,
    time: "15 min",
    color: "text-brand-400",
    bg: "bg-brand-400/10 border-brand-400/20",
    summary: "Understand needs, show demo, confirm package",
    details: [
      "Schedule 15-minute intro call with clinic owner",
      "Understand their current online presence and pain points",
      "Show relevant demo site (dental-standard or dental-premium)",
      "Confirm package selection (Standard ₹8K or Premium ₹14K)",
      "Set expectations: 3-day turnaround after onboarding",
      "Send onboarding form link immediately after call",
    ],
  },
  {
    num: 2,
    title: "Onboarding Form",
    icon: FileText,
    time: "24 hrs (client)",
    color: "text-zinc-300",
    bg: "bg-zinc-700/30 border-zinc-600/20",
    summary: "Collect all clinic details and branding assets",
    details: [
      "Clinic name, address, phone number",
      "List of services offered (with descriptions if available)",
      "Doctor names and qualifications",
      "Operating hours / timings",
      "Logo (high-res PNG/SVG preferred)",
      "Photos of clinic, staff, equipment",
      "Google Maps link to clinic location",
      "Social media links (Instagram, Facebook, etc.)",
    ],
  },
  {
    num: 3,
    title: "Content Collection",
    icon: Camera,
    time: "24-48 hrs",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    summary: "Photos, descriptions, testimonials, branding",
    details: [
      "Minimum 5 high-quality clinic photos",
      "Service descriptions for each treatment offered",
      "Patient testimonials (text or video links)",
      "Any existing branding materials (business cards, letterhead)",
      "Before/after treatment photos (if available, for premium)",
      "Doctor profile photos and bios",
    ],
  },
  {
    num: 4,
    title: "Build Kickoff",
    icon: Code2,
    time: "Day 1",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    summary: "Assign to Linus, fork template, configure site",
    details: [
      "Assign build to Linus (CTO / Build Agent)",
      "Fork dental-standard or dental-premium template",
      "Configure site-config.ts with client details",
      "Set up WhatsApp button, contact form, booking",
      "Populate content, images, and service pages",
      "Deploy to preview URL for review",
    ],
  },
  {
    num: 5,
    title: "Review Cycle",
    icon: MessageSquare,
    time: "Day 2",
    color: "text-brand-400",
    bg: "bg-brand-400/10 border-brand-400/20",
    summary: "Share preview, collect feedback, revise (2 rounds max)",
    details: [
      "Share preview link with client via WhatsApp/email",
      "Collect structured feedback (what to change, what looks good)",
      "Maximum 2 revision rounds included in package",
      "Each revision round: 12-24 hour turnaround",
      "Final sign-off required before going live",
    ],
  },
  {
    num: 6,
    title: "Launch",
    icon: Rocket,
    time: "Day 3",
    color: "text-zinc-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    summary: "Domain, DNS, SSL, go-live, hand over credentials",
    details: [
      "Set up custom domain (or use invictus subdomain)",
      "Configure DNS records (A record / CNAME)",
      "Provision SSL certificate (auto via Let's Encrypt)",
      "Final deployment to production",
      "Hand over credentials and admin access",
      "Send launch confirmation to client",
    ],
  },
  {
    num: 7,
    title: "Post-Launch",
    icon: HeartHandshake,
    time: "7 days",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    summary: "Support, SEO submission, Google Business linking",
    details: [
      "7-day post-launch support window",
      "Submit site to Google Search Console",
      "Submit XML sitemap for indexing",
      "Link Google Business Profile to website",
      "Verify all forms and contact methods work",
      "Check analytics tracking is active",
      "Schedule 30-day follow-up check-in",
    ],
  },
];

export default function SOPOnboarding() {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-zinc-700/30 border border-zinc-600/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-zinc-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">SOP: Client Onboarding</h1>
            <p className="text-sm text-zinc-500">Dental vertical — step-by-step onboarding flow</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
          <Clock className="w-3.5 h-3.5" />
          <span>Total timeline: ~3 days from onboarding to launch + 7 days post-launch support</span>
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isOpen = expanded === step.num;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.num} className="relative">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[27px] top-[56px] bottom-[-12px] w-px bg-white/5" />
              )}

              <button
                onClick={() => setExpanded(isOpen ? null : step.num)}
                className={clsx(
                  "w-full text-left bg-surface-2 border rounded-xl p-4 transition-all hover:border-white/10",
                  isOpen ? "border-white/10" : "border-white/5"
                )}
              >
                <div className="flex items-center gap-4">
                  {/* Step Number + Icon */}
                  <div className="relative flex-shrink-0">
                    <div
                      className={clsx(
                        "w-[54px] h-[54px] rounded-xl border flex items-center justify-center",
                        step.bg
                      )}
                    >
                      <Icon className={clsx("w-5 h-5", step.color)} />
                    </div>
                    <div className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-surface-0 border border-white/10 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-zinc-400">{step.num}</span>
                    </div>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-0.5">
                      <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-3 border border-white/5 text-zinc-500 font-medium">
                        {step.time}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">{step.summary}</p>
                  </div>

                  {/* Chevron */}
                  <div className="flex-shrink-0 text-zinc-500">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isOpen && (
                  <div className="mt-4 ml-[70px] space-y-2">
                    {step.details.map((detail, di) => (
                      <div key={di} className="flex items-start gap-2 text-xs text-zinc-400">
                        <div className={clsx("w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0", step.color.replace("text-", "bg-"))} />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
