"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, RefreshCw, X, Calendar } from "lucide-react";
import { clsx } from "clsx";

// Dynamically import schedule-x to avoid SSR issues
const ScheduleXWrapper = dynamic(() => import("./ScheduleXWrapper"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center" style={{ minHeight: 500 }}>
      <Loader2 className="w-7 h-7 animate-spin text-brand-400" />
    </div>
  ),
});

interface CalEvent {
  id: string; title: string; start: string; end?: string;
  type?: string; description?: string; location?: string; assignee?: string;
}

const TYPE_COLORS: Record<string, string> = {
  meeting:  "#D4A853",
  call:     "#60a5fa",
  zoom:     "#8b5cf6",
  task:     "#a78bfa",
  deadline: "#f87171",
  event:    "#34d399",
  default:  "#6b7280",
};

const inputCls = "w-full px-3 py-2 bg-surface-3 border border-white/5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30";

export default function CalendarView() {
  const [events, setEvents]     = useState<CalEvent[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [addForm, setAddForm]   = useState({
    title: "", date: new Date().toISOString().split("T")[0],
    time: "10:00", endTime: "11:00", type: "meeting",
    description: "", location: "", assignee: "Sahil",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/calendar");
      const d = await r.json();
      // Transform API events (date+time) to CalEvent format (start+end)
      const mapped = (d.events || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        start: e.time ? e.date + "T" + e.time + ":00" : e.date,
        end: e.endTime ? e.date + "T" + e.endTime + ":00" : (e.time ? e.date + "T" + (parseInt(e.time.split(":")[0]) + 1).toString().padStart(2, "0") + ":" + e.time.split(":")[1] + ":00" : e.date),
        type: e.type || "task",
        description: e.description || "",
        assignee: e.assignee || "",
        location: e.client || "",
      }));
      setEvents(mapped);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addForm.title) return;
    setSaving(true);
    try {
      await fetch("/api/calendar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: addForm.title,
          date: addForm.date, time: addForm.time,
          end: `${addForm.date}T${addForm.endTime}:00`,
          type: addForm.type, description: addForm.description,
          location: addForm.location, assignee: addForm.assignee,
        }),
      });
      setShowAdd(false);
      setAddForm({ title: "", date: new Date().toISOString().split("T")[0], time: "10:00", endTime: "11:00", type: "meeting", description: "", location: "", assignee: "Sahil" });
      await load();
    } finally { setSaving(false); }
  };

  const upcoming = events
    .filter(e => new Date(e.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6);

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">📅 Calendar</h1>
            <p className="text-sm text-zinc-500">{events.length} events · click any date to add</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white transition-all">
            <RefreshCw className={clsx("w-4 h-4", loading && "animate-spin")} />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-400/10 text-brand-400 rounded-xl border border-brand-400/20 hover:bg-brand-400/20 text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      {/* Upcoming events strip */}
      {upcoming.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
          <p className="text-xs text-zinc-500 shrink-0 self-center pr-1">Upcoming:</p>
          {upcoming.map(ev => {
            const color = TYPE_COLORS[ev.type || "default"];
            const d = new Date(ev.start);
            return (
              <div key={ev.id} className="flex-shrink-0 glass rounded-xl px-4 py-2.5 border-l-2 min-w-[160px]"
                style={{ borderLeftColor: color }}>
                <p className="text-xs font-semibold text-white truncate">{ev.title}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  {d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  {" · "}
                  {d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
                {ev.type && <span className="text-[9px] capitalize" style={{ color }}>{ev.type}</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowAdd(false)}>
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-white/10"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-400" /> New Event
              </h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <input value={addForm.title} onChange={e => setAddForm(f => ({...f, title: e.target.value}))}
              placeholder="Event title *" className={inputCls} autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Date</label>
                <input type="date" value={addForm.date}
                  onChange={e => setAddForm(f => ({...f, date: e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                <select value={addForm.type}
                  onChange={e => setAddForm(f => ({...f, type: e.target.value}))} className={inputCls}>
                  {["meeting", "call", "zoom", "task", "deadline", "event"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Start</label>
                <input type="time" value={addForm.time}
                  onChange={e => setAddForm(f => ({...f, time: e.target.value}))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">End</label>
                <input type="time" value={addForm.endTime}
                  onChange={e => setAddForm(f => ({...f, endTime: e.target.value}))} className={inputCls} />
              </div>
            </div>
            <input value={addForm.description}
              onChange={e => setAddForm(f => ({...f, description: e.target.value}))}
              placeholder="Description (optional)" className={inputCls} />
            <input value={addForm.location}
              onChange={e => setAddForm(f => ({...f, location: e.target.value}))}
              placeholder="Location / Meet link (optional)" className={inputCls} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={handleAdd} disabled={!addForm.title || saving}
                className="flex items-center gap-2 px-5 py-2 bg-brand-400 text-black text-sm font-semibold rounded-xl disabled:opacity-40">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Add Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule-X calendar (SSR-safe) */}
      <ScheduleXWrapper events={events} onClickDate={(date) => { setAddForm(f => ({...f, date})); setShowAdd(true); }} onEventUpdate={load} />
    </div>
  );
}
