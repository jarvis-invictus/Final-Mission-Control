"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalIcon, ChevronLeft, ChevronRight, Plus,
  Video, CheckSquare, Megaphone, Bell, Loader2, RefreshCw,
  Clock, User, Filter, X,
} from "lucide-react";
import { clsx } from "clsx";

/* ================================================================ */
/*  TYPES                                                            */
/* ================================================================ */

type EventType = "meeting" | "task" | "content" | "reminder";
type ViewMode = "month" | "week" | "agenda";
type FilterTab = "all" | "meeting" | "task" | "content" | "reminder";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  priority?: string;
  assignee?: string;
  status?: string;
  description?: string;
  platform?: string;
  client?: string;
}

/* ================================================================ */
/*  CONFIG                                                            */
/* ================================================================ */

const TYPE_CONFIG: Record<EventType, { icon: typeof CalIcon; color: string; dot: string; bg: string; label: string }> = {
  meeting:  { icon: Video,       color: "text-brand-400",   dot: "bg-brand-400",   bg: "bg-brand-400/10 border-brand-400/20", label: "Meeting" },
  task:     { icon: CheckSquare, color: "text-amber-400",   dot: "bg-amber-400",   bg: "bg-amber-400/10 border-amber-400/20", label: "Task" },
  content:  { icon: Megaphone,   color: "text-emerald-400", dot: "bg-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", label: "Content" },
  reminder: { icon: Bell,        color: "text-zinc-400",    dot: "bg-zinc-400",    bg: "bg-zinc-400/10 border-zinc-400/20", label: "Reminder" },
};

const PRIORITY_COLORS: Record<string, string> = {
  P0: "text-red-400",
  P1: "text-amber-400",
  P2: "text-brand-400",
  P3: "text-zinc-500",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ================================================================ */
/*  HELPERS                                                           */
/* ================================================================ */

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function dateKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function isToday(d: Date) { return dateKey(d) === dateKey(new Date()); }

function getMonthDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Pad start of week
  for (let i = 0; i < first.getDay(); i++) {
    days.push(new Date(year, month, -first.getDay() + i + 1));
  }
  // Month days
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  // Pad end
  while (days.length % 7 !== 0) {
    days.push(new Date(year, month + 1, days.length - last.getDate() - first.getDay() + 1));
  }
  return days;
}

/* ================================================================ */
/*  EVENT CARD                                                        */
/* ================================================================ */

function EventCard({ event, compact }: { event: CalendarEvent; compact?: boolean }) {
  const cfg = TYPE_CONFIG[event.type];
  const Icon = cfg.icon;

  if (compact) {
    return (
      <div className={clsx("flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] border truncate", cfg.bg)}>
        <div className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
        <span className="text-zinc-300 truncate">{event.title}</span>
      </div>
    );
  }

  return (
    <div className={clsx("p-3 rounded-lg border bg-surface-2 hover:bg-surface-3 transition-colors", `border-${cfg.dot.replace("bg-", "")}/20`)}>
      <div className="flex items-start gap-3">
        <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", cfg.bg)}>
          <Icon className={clsx("w-4 h-4", cfg.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-medium text-zinc-200 truncate">{event.title}</span>
            {event.priority && (
              <span className={clsx("text-[10px] font-bold", PRIORITY_COLORS[event.priority])}>{event.priority}</span>
            )}
            {event.status === "done" && <span className="text-[10px] text-emerald-400">✅</span>}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-zinc-500">
            {event.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{event.time}</span>}
            {event.assignee && <span className="flex items-center gap-1"><User className="w-3 h-3" />{event.assignee}</span>}
            {event.platform && <span className="px-1.5 py-0.5 bg-surface-3 rounded text-zinc-400">{event.platform}</span>}
            <span className={clsx("px-1.5 py-0.5 rounded", cfg.bg, "text-[10px]")}>{cfg.label}</span>
          </div>
          {event.description && (
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================ */
/*  MAIN COMPONENT                                                     */
/* ================================================================ */

export default function CalendarView() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>("month");
  const [filter, setFilter] = useState<FilterTab>("all");
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ title: "", date: dateKey(new Date()), time: "", type: "task" as EventType, priority: "", assignee: "Sahil", description: "" });
  const [addLoading, setAddLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar");
      const data = await res.json();
      setEvents(data.events || []);
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return events;
    return events.filter(e => e.type === filter);
  }, [events, filter]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of filtered) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [filtered]);

  const days = useMemo(() => getMonthDays(year, month), [year, month]);

  const stats = useMemo(() => ({
    total: events.length,
    meetings: events.filter(e => e.type === "meeting").length,
    tasks: events.filter(e => e.type === "task").length,
    content: events.filter(e => e.type === "content").length,
  }), [events]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1));
  const goToday = () => setCurrentDate(new Date());

  const handleAddEvent = async () => {
    if (!addForm.title || !addForm.date) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        setShowAdd(false);
        setAddForm({ title: "", date: dateKey(new Date()), time: "", type: "task", priority: "", assignee: "Sahil", description: "" });
        load();
      }
    } catch {} finally { setAddLoading(false); }
  };

  // Upcoming events (next 14 days)
  const upcoming = useMemo(() => {
    const today = dateKey(new Date());
    const twoWeeks = dateKey(new Date(Date.now() + 14 * 86400000));
    return filtered.filter(e => e.date >= today && e.date <= twoWeeks).slice(0, 10);
  }, [filtered]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-400/10 border border-brand-400/20 flex items-center justify-center">
            <CalIcon className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Calendar</h1>
            <p className="text-sm text-zinc-500">
              {stats.tasks} tasks · {stats.meetings} meetings · {stats.content} content
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          {(["month", "week", "agenda"] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                view === v ? "bg-brand-400/15 text-brand-400 border border-brand-400/30" : "bg-surface-2 text-zinc-500 border border-white/5 hover:text-zinc-300"
              )}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
          <button onClick={load} className="p-2 hover:bg-surface-3 rounded-lg"><RefreshCw className="w-4 h-4 text-zinc-400" /></button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-400/10 text-brand-400 border border-brand-400/20 rounded-lg text-xs font-medium hover:bg-brand-400/20 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Event
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {(["all", "meeting", "task", "content", "reminder"] as FilterTab[]).map(f => {
          const count = f === "all" ? events.length : events.filter(e => e.type === f).length;
          const cfg = f === "all" ? null : TYPE_CONFIG[f];
          return (
            <button key={f} onClick={() => setFilter(f)}
              className={clsx("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filter === f ? "bg-brand-400/15 text-brand-400 border-brand-400/30" : "bg-surface-2 text-zinc-400 border-white/5 hover:text-zinc-200"
              )}>
              {cfg && <div className={clsx("w-2 h-2 rounded-full", cfg.dot)} />}
              {f === "all" ? "All" : cfg?.label}
              <span className="text-[10px] text-zinc-600">{count}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Main Calendar */}
          <div className="bg-surface-2 rounded-xl border border-surface-5 overflow-hidden">
            {/* Month Nav */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-surface-5">
              <div className="flex items-center gap-3">
                <button onClick={prevMonth} className="p-1 hover:bg-surface-3 rounded"><ChevronLeft className="w-4 h-4 text-zinc-400" /></button>
                <h2 className="text-lg font-semibold text-white">{MONTHS[month]} {year}</h2>
                <button onClick={nextMonth} className="p-1 hover:bg-surface-3 rounded"><ChevronRight className="w-4 h-4 text-zinc-400" /></button>
              </div>
              <button onClick={goToday} className="px-3 py-1 text-xs bg-surface-3 hover:bg-surface-4 rounded-lg text-zinc-400 transition-colors">Today</button>
            </div>

            {view === "month" && (
              <div>
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-surface-5">
                  {DAYS.map(d => (
                    <div key={d} className="px-2 py-2 text-xs font-medium text-zinc-500 text-center">{d}</div>
                  ))}
                </div>
                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {days.map((day, idx) => {
                    const dk = dateKey(day);
                    const dayEvents = eventsByDate[dk] || [];
                    const isCurrentMonth = day.getMonth() === month;
                    const today = isToday(day);
                    return (
                      <div key={idx} className={clsx(
                        "min-h-[100px] p-1.5 border-b border-r border-surface-5 transition-colors",
                        !isCurrentMonth && "opacity-30",
                        today && "bg-brand-400/5"
                      )}>
                        <div className={clsx(
                          "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                          today ? "bg-brand-400 text-white" : "text-zinc-500"
                        )}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map(e => (
                            <EventCard key={e.id} event={e} compact />
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-[10px] text-zinc-600 pl-1">+{dayEvents.length - 3} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {view === "agenda" && (
              <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-8">No events</p>
                ) : (
                  filtered.map(e => <EventCard key={e.id} event={e} />)
                )}
              </div>
            )}

            {view === "week" && (() => {
              // Get current week days
              const today = new Date();
              const dayOfWeek = today.getDay();
              const weekStart = new Date(today);
              weekStart.setDate(today.getDate() - dayOfWeek);
              const weekDays = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(weekStart);
                d.setDate(weekStart.getDate() + i);
                return d;
              });

              return (
                <div className="divide-y divide-surface-5">
                  {weekDays.map(day => {
                    const dk = dateKey(day);
                    const dayEvents = eventsByDate[dk] || [];
                    const today2 = isToday(day);
                    return (
                      <div key={dk} className={clsx("flex gap-4 p-4", today2 && "bg-brand-400/5")}>
                        <div className="w-16 flex-shrink-0 text-center">
                          <div className="text-xs text-zinc-500">{DAYS[day.getDay()]}</div>
                          <div className={clsx("text-lg font-bold", today2 ? "text-brand-400" : "text-zinc-300")}>{day.getDate()}</div>
                        </div>
                        <div className="flex-1 space-y-2">
                          {dayEvents.length === 0 ? (
                            <p className="text-xs text-zinc-600 py-2">No events</p>
                          ) : dayEvents.map(e => <EventCard key={e.id} event={e} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Sidebar — Upcoming */}
          <div className="space-y-4">
            <div className="bg-surface-2 rounded-xl border border-surface-5 p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-400" />
                Upcoming (14 days)
              </h3>
              <div className="space-y-2">
                {upcoming.length === 0 ? (
                  <p className="text-xs text-zinc-600">No upcoming events</p>
                ) : (
                  upcoming.map(e => <EventCard key={e.id} event={e} />)
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-surface-2 rounded-xl border border-surface-5 p-4">
              <h3 className="text-sm font-semibold text-white mb-3">Overview</h3>
              <div className="space-y-2">
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
                  const count = events.filter(e => e.type === type).length;
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={clsx("w-2 h-2 rounded-full", cfg.dot)} />
                        <span className="text-xs text-zinc-400">{cfg.label}</span>
                      </div>
                      <span className="text-xs font-medium text-zinc-300">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Event Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowAdd(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-surface-1 border border-surface-5 rounded-2xl w-full max-w-md shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-5">
              <h2 className="text-lg font-bold text-white">Add Event</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-surface-3 rounded-lg">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Title *</label>
                <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Event title..."
                  className="w-full px-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Date *</label>
                  <input type="date" value={addForm.date} onChange={e => setAddForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Time</label>
                  <input type="time" value={addForm.time} onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                  <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value as EventType }))}
                    className="w-full px-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30">
                    <option value="task">Task</option>
                    <option value="meeting">Meeting</option>
                    <option value="content">Content</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Priority</label>
                  <select value={addForm.priority} onChange={e => setAddForm(f => ({ ...f, priority: e.target.value }))}
                    className="w-full px-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30">
                    <option value="">None</option>
                    <option value="P0">P0 — Critical</option>
                    <option value="P1">P1 — High</option>
                    <option value="P2">P2 — Medium</option>
                    <option value="P3">P3 — Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Assignee</label>
                <input value={addForm.assignee} onChange={e => setAddForm(f => ({ ...f, assignee: e.target.value }))}
                  placeholder="Sahil"
                  className="w-full px-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30" />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Description</label>
                <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional details..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-2 border border-surface-5 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-brand-400/30 resize-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-5 flex justify-end gap-2">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">Cancel</button>
              <button onClick={handleAddEvent} disabled={!addForm.title || !addForm.date || addLoading}
                className="px-4 py-2 bg-brand-400 text-black text-xs font-semibold rounded-lg hover:bg-brand-300 disabled:opacity-40 transition-colors flex items-center gap-1.5">
                {addLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
