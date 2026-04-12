"use client";

import { useState, useCallback } from "react";
import {
  UserPlus, Loader2, CheckCircle, AlertCircle, ChevronRight,
  ChevronLeft, Zap, Building2, User, Phone, Mail, MapPin,
  Globe, Target, DollarSign, Clock, FileText, Rocket,
} from "lucide-react";
import { clsx } from "clsx";

const NICHES = ["Dental", "CA/Tax", "Education/Coaching", "Lawyer"];
const TIERS = [
  { name: "Starter", price: "₹15,000/mo", deliverables: "Website + WhatsApp Bot + Google Profile", days: 5 },
  { name: "Growth",  price: "₹25,000/mo", deliverables: "Starter + GHL CRM + Email Sequences",    days: 7 },
  { name: "Scale",   price: "₹40,000/mo", deliverables: "Growth + Ads + Reporting + Priority",     days: 10 },
];
const TIMELINES = ["ASAP (within 1 week)", "Within 2 weeks", "This month", "Flexible"];

interface FormData {
  contactName: string; email: string; phone: string;
  businessName: string; niche: string; tier: string;
  city: string; currentWebsite: string; primaryGoal: string;
  painPoints: string; budget: string; timeline: string; notes: string;
}

const EMPTY: FormData = {
  contactName: "", email: "", phone: "",
  businessName: "", niche: "", tier: "",
  city: "", currentWebsite: "", primaryGoal: "",
  painPoints: "", budget: "", timeline: "", notes: "",
};

const STEPS = [
  { id: 1, label: "Contact",  icon: User },
  { id: 2, label: "Business", icon: Building2 },
  { id: 3, label: "Package",  icon: Rocket },
  { id: 4, label: "Notes",    icon: FileText },
];

export default function OnboardingEngine() {
  const [step, setStep]         = useState(1);
  const [form, setForm]         = useState<FormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]     = useState<any>(null);
  const [error, setError]       = useState<string>("");

  const set = (k: keyof FormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const canNext = useCallback(() => {
    if (step === 1) return !!(form.contactName && form.email);
    if (step === 2) return !!(form.businessName && form.niche && form.city);
    if (step === 3) return !!form.tier;
    return true;
  }, [step, form]);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "onboard", form }),
      });
      const data = await res.json();
      if (data.success) setResult(data);
      else setError(data.error || "Onboarding failed");
    } catch (e: any) {
      setError(e.message || "Network error");
    }
    setSubmitting(false);
  };

  const reset = () => { setForm(EMPTY); setStep(1); setResult(null); setError(""); };

  // ─── Success screen ───
  if (result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">🎉 {result.clientName} Onboarded!</h2>
          <p className="text-zinc-400 text-sm max-w-md">{result.message}</p>
        </div>

        {/* Cascade results */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-2xl">
          {[
            { label: "GHL Contact",  done: !!result.results?.ghlContactId,    icon: User },
            { label: "Pipeline",     done: !!result.results?.ghlOpportunityId, icon: Zap },
            { label: "Fulfillment",  done: !!result.results?.fulfillmentId,    icon: CheckCircle },
            { label: "Jarvis Notified", done: result.results?.jarvisNotified,  icon: Rocket },
          ].map(item => (
            <div key={item.label} className={clsx(
              "glass rounded-xl p-4 flex flex-col items-center gap-2",
              item.done ? "border-emerald-500/20" : "border-red-500/20 opacity-60"
            )}>
              <item.icon className={clsx("w-5 h-5", item.done ? "text-emerald-400" : "text-red-400")} />
              <span className="text-xs text-zinc-400">{item.label}</span>
              <span className={clsx("text-xs font-semibold", item.done ? "text-emerald-400" : "text-red-400")}>
                {item.done ? "✓ Done" : "✗ Failed"}
              </span>
            </div>
          ))}
        </div>

        {/* Brief preview */}
        <div className="w-full max-w-2xl glass rounded-xl p-5 text-left">
          <p className="text-xs text-zinc-500 mb-2 font-semibold uppercase tracking-wide">Client Brief (sent to Jarvis)</p>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">{result.brief}</pre>
        </div>

        {result.errors?.length > 0 && (
          <div className="w-full max-w-2xl bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-xs text-amber-400 font-semibold mb-1">Non-critical warnings:</p>
            {result.errors.map((e: string, i: number) => (
              <p key={i} className="text-xs text-amber-400/70">• {e}</p>
            ))}
          </div>
        )}

        <button onClick={reset}
          className="px-6 py-2.5 bg-brand-400/10 text-brand-400 rounded-xl border border-brand-400/20 hover:bg-brand-400/20 text-sm font-medium transition-all">
          + Onboard Another Client
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = step === s.id;
          const done   = step > s.id;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={clsx(
                "w-8 h-8 rounded-full flex items-center justify-center border text-xs font-bold transition-all",
                done   ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                active ? "bg-brand-400/20 border-brand-400/40 text-brand-400" :
                         "bg-surface-3 border-white/10 text-zinc-600"
              )}>
                {done ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={clsx("text-xs hidden sm:block", active ? "text-white font-semibold" : done ? "text-emerald-400" : "text-zinc-600")}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={clsx("flex-1 h-px", done ? "bg-emerald-500/30" : "bg-white/5")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="glass rounded-2xl p-6 space-y-4 animate-fadeInUp">
        {step === 1 && (
          <>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-brand-400" /> Contact Details
            </h3>
            <Field label="Full Name *" icon={User}>
              <input value={form.contactName} onChange={e => set("contactName", e.target.value)}
                placeholder="Dr. Ramesh Patel" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email *" icon={Mail}>
                <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  placeholder="ramesh@clinic.com" className={inputCls} />
              </Field>
              <Field label="Phone" icon={Phone}>
                <input value={form.phone} onChange={e => set("phone", e.target.value)}
                  placeholder="+91 98765 43210" className={inputCls} />
              </Field>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-400" /> Business Info
            </h3>
            <Field label="Business Name *" icon={Building2}>
              <input value={form.businessName} onChange={e => set("businessName", e.target.value)}
                placeholder="Patel Dental Clinic" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Niche *" icon={Target}>
                <select value={form.niche} onChange={e => set("niche", e.target.value)} className={inputCls}>
                  <option value="">Select niche…</option>
                  {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="City *" icon={MapPin}>
                <input value={form.city} onChange={e => set("city", e.target.value)}
                  placeholder="Pune" className={inputCls} />
              </Field>
            </div>
            <Field label="Current Website (if any)" icon={Globe}>
              <input value={form.currentWebsite} onChange={e => set("currentWebsite", e.target.value)}
                placeholder="https://oldsite.com or none" className={inputCls} />
            </Field>
            <Field label="Primary Goal" icon={Target}>
              <input value={form.primaryGoal} onChange={e => set("primaryGoal", e.target.value)}
                placeholder="Get more patients online, automate bookings…" className={inputCls} />
            </Field>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-brand-400" /> Package Selection
            </h3>
            <div className="space-y-3">
              {TIERS.map(tier => (
                <button key={tier.name} onClick={() => set("tier", tier.name)}
                  className={clsx(
                    "w-full text-left p-4 rounded-xl border transition-all",
                    form.tier === tier.name
                      ? "bg-brand-400/10 border-brand-400/40 shadow-[0_0_20px_rgba(212,168,83,0.1)]"
                      : "bg-surface-2 border-white/5 hover:border-white/10"
                  )}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white">{tier.name}</span>
                    <span className="text-brand-400 font-semibold text-sm">{tier.price}</span>
                  </div>
                  <p className="text-xs text-zinc-500">{tier.deliverables}</p>
                  <p className="text-xs text-zinc-600 mt-1">Delivery: {tier.days} days</p>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly Budget" icon={DollarSign}>
                <input value={form.budget} onChange={e => set("budget", e.target.value)}
                  placeholder="15000" className={inputCls} />
              </Field>
              <Field label="Timeline" icon={Clock}>
                <select value={form.timeline} onChange={e => set("timeline", e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {TIMELINES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-400" /> Final Notes
            </h3>
            <Field label="Pain Points" icon={AlertCircle}>
              <textarea value={form.painPoints} onChange={e => set("painPoints", e.target.value)}
                rows={3} placeholder="No online presence, losing patients to competitors, manual bookings…"
                className={inputCls + " resize-none"} />
            </Field>
            <Field label="Special Instructions / Notes" icon={FileText}>
              <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
                rows={3} placeholder="Wants Hindi + English site, urgent, referred by Jordan…"
                className={inputCls + " resize-none"} />
            </Field>

            {/* Summary */}
            <div className="bg-surface-2 rounded-xl p-4 space-y-1 border border-white/5">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Summary</p>
              {[
                ["Client", form.contactName], ["Email", form.email],
                ["Business", form.businessName], ["Niche", form.niche],
                ["City", form.city], ["Tier", form.tier],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs">
                  <span className="text-zinc-500">{k}</span>
                  <span className="text-white font-medium">{v || "—"}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:text-white border border-white/5 rounded-xl hover:bg-surface-2 transition-all">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
            className={clsx(
              "flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-xl border transition-all",
              canNext()
                ? "bg-brand-400/10 text-brand-400 border-brand-400/20 hover:bg-brand-400/20"
                : "text-zinc-600 border-white/5 cursor-not-allowed"
            )}>
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-brand-400/20 text-brand-400 rounded-xl border border-brand-400/30 hover:bg-brand-400/30 transition-all disabled:opacity-50">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Onboarding…</> : <><Zap className="w-4 h-4" /> Onboard Client</>}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ───
const inputCls = "w-full px-3 py-2 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30";

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
        <Icon className="w-3 h-3" /> {label}
      </label>
      {children}
    </div>
  );
}
