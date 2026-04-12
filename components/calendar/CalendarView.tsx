"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, RefreshCw, X, Calendar, ChevronLeft, ChevronRight, Trash2, Check } from "lucide-react";
import { clsx } from "clsx";

interface CalEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: string;
  status?: string;
  description?: string;
  assignee?: string;
  source?: string;
  client?: string;
}

const TYPE_COLORS: Record<string, string> = {
  meeting: "bg-brand-400/20 text-brand-400 border-brand-400/30",
  task: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  deadline: "bg-red-500/20 text-red-400 border-red-500/30",
  reminder: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  content: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const TYPE_DOT: Record<string, string> = {
  meeting: "bg-brand-400",
  task: "bg-violet-400",
  deadline: "bg-red-400",
  reminder: "bg-blue-400",
  content: "bg-emerald-400",
};

const inputCls = "w-full px-3 py-2 bg-surface-3 border border-white/5 rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function CalendarView() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [addForm, setAddForm] = useState({
    title: "", date: now.toISOString().slice(0, 10),
    time: "10:00", type: "task",
    description: "", assignee: "Sahil",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/calendar");
      const d = await r.json();
      setEvents(d.events || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayStr = now.toISOString().slice(0, 10);
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handleDateClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    setAddForm(f => ({ ...f, date: dateStr }));
  };

  const handleAdd = async () => {
    if (!addForm.title) return;
    setSaving(true);
    try {
      await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...addForm }),
      });
      setShowAdd(false);
      setAddForm({ title: "", date: now.toISOString().slice(0, 10), time: "10:00", type: "task", description: "", assignee: "Sahil" });
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id }),
    });
    setSelectedEvent(null);
    await load();
  };

  const handleMarkDone = async (id: string) => {
    await fetch("/api/calendar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markDone", id }),
    });
    setSelectedEvent(null);
    await load();
  };

  // Get events for a specific date
  const eventsForDate = (dateStr: string) => events.filter(e => e.date === dateStr);

  // Get events for selected date or today
  const displayDate = selectedDate || todayStr;
  const displayEvents = eventsForDate(displayDate);

  // Upcoming events
  const upcoming = events
    .filter(e => e.date >= todayStr && e.status !== "done" && e.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className="p-6 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Calendar</h1>
            <p className="text-sm text-zinc-500">{events.length} events · click any date to view</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2 bg-surface-2 rounded-2xl border border-white/5 p-5">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">{monthNames[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="text-center text-[10px] text-zinc-600 uppercase tracking-wider font-medium py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={"empty-" + i} className="aspect-square" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = eventsForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(dateStr)}
                  className={clsx(
                    "aspect-square rounded-xl flex flex-col items-center justify-start p-1.5 transition-all relative",
                    isToday && !isSelected && "bg-brand-400/10 border border-brand-400/20",
                    isSelected && "bg-brand-400/20 border border-brand-400/40 shadow-[0_0_10px_rgba(212,168,83,0.1)]",
                    !isToday && !isSelected && "hover:bg-white/5 border border-transparent",
                  )}
                >
                  <span className={clsx(
                    "text-xs font-medium",
                    isToday ? "text-brand-400" : isSelected ? "text-white" : "text-zinc-400"
                  )}>{day}</span>

                  {/* Event dots */}
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} className={clsx("w-1.5 h-1.5 rounded-full", TYPE_DOT[ev.type] || "bg-zinc-500")} />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[8px] text-zinc-500">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel — Selected date events + Upcoming */}
        <div className="space-y-4">
          {/* Selected date events */}
          <div className="bg-surface-2 rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">
              {displayDate === todayStr ? "Today" : new Date(displayDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
            </h3>
            {displayEvents.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-zinc-600 text-sm">No events</p>
                <button onClick={() => { setAddForm(f => ({ ...f, date: displayDate })); setShowAdd(true); }}
                  className="text-xs text-brand-400 hover:underline mt-2">+ Add event</button>
              </div>
            ) : (
              <div className="space-y-2">
                {displayEvents.map(ev => (
                  <button key={ev.id} onClick={() => setSelectedEvent(ev)}
                    className={clsx(
                      "w-full text-left p-3 rounded-xl border transition-all hover:scale-[1.01]",
                      TYPE_COLORS[ev.type] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
                      ev.status === "done" && "opacity-50"
                    )}>
                    <div className="flex items-center justify-between">
                      <span className={clsx("text-sm font-medium", ev.status === "done" && "line-through")}>{ev.title}</span>
                      {ev.time && <span className="text-[10px] opacity-70">{ev.time}</span>}
                    </div>
                    {ev.assignee && <span className="text-[10px] opacity-60">{ev.assignee}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="bg-surface-2 rounded-2xl border border-white/5 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Upcoming</h3>
            {upcoming.length === 0 ? (
              <p className="text-zinc-600 text-sm text-center py-4">No upcoming events</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map(ev => (
                  <div key={ev.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className={clsx("w-2 h-2 rounded-full mt-1.5 flex-shrink-0", TYPE_DOT[ev.type] || "bg-zinc-500")} />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-200 truncate">{ev.title}</p>
                      <p className="text-[10px] text-zinc-600">
                        {new Date(ev.date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        {ev.time && " · " + ev.time}
                        {ev.assignee && " · " + ev.assignee}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setSelectedEvent(null)}>
          <div className="bg-surface-2 rounded-2xl p-6 w-full max-w-md border border-white/10 space-y-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedEvent.title}</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {new Date(selectedEvent.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  {selectedEvent.time && " · " + selectedEvent.time}
                </p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div className="flex gap-2">
              <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border", TYPE_COLORS[selectedEvent.type] || "bg-zinc-500/20 text-zinc-400")}>{selectedEvent.type}</span>
              {selectedEvent.status && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">{selectedEvent.status}</span>}
              {selectedEvent.source && <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">{selectedEvent.source}</span>}
            </div>
            {selectedEvent.description && <p className="text-sm text-zinc-300">{selectedEvent.description}</p>}
            {selectedEvent.assignee && <p className="text-xs text-zinc-500">Assigned to: {selectedEvent.assignee}</p>}
            <div className="flex gap-2 pt-2">
              {selectedEvent.status !== "done" && selectedEvent.source !== "ghl" && (
                <button onClick={() => handleMarkDone(selectedEvent.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 text-sm hover:bg-emerald-500/20 transition-all">
                  <Check className="w-3.5 h-3.5" /> Mark Done
                </button>
              )}
              {selectedEvent.source !== "ghl" && (
                <button onClick={() => handleDelete(selectedEvent.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 rounded-xl border border-red-500/20 text-sm hover:bg-red-500/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowAdd(false)}>
          <div className="bg-surface-2 rounded-2xl p-6 w-full max-w-md space-y-4 border border-white/10"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-brand-400" /> New Event
              </h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-white/5 rounded-lg">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Event title *" className={inputCls} autoFocus />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Date</label>
                <input type="date" value={addForm.date}
                  onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Time</label>
                <input type="time" value={addForm.time}
                  onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                <select value={addForm.type}
                  onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))} className={inputCls}>
                  {["meeting", "task", "deadline", "reminder", "content"].map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <input value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)" className={inputCls} />
            <input value={addForm.assignee} onChange={e => setAddForm(f => ({ ...f, assignee: e.target.value }))}
              placeholder="Assigned to" className={inputCls} />
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
    </div>
  );
}
