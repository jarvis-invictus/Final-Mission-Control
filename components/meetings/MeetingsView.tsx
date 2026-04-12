"use client";

import { useState, useEffect } from "react";
import {
  Phone, Video, Users, MapPin, Plus, X, Loader2, Clock, Calendar,
  CheckCircle, ChevronDown, ChevronUp, Trash2, Edit3, MessageCircle, ExternalLink,
} from "lucide-react";
import { clsx } from "clsx";

interface Meeting {
  id: string; title: string; dateTime: string; endTime?: string;
  attendees: string[]; type: string; prepNotes: string;
  agenda: { text: string; done: boolean }[]; notes: string;
  actionItems: string[]; status: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  call: { icon: Phone, color: "text-blue-400", label: "Call" },
  zoom: { icon: Video, color: "text-violet-400", label: "Zoom" },
  "in-person": { icon: MapPin, color: "text-emerald-400", label: "In-Person" },
  whatsapp: { icon: MessageCircle, color: "text-green-400", label: "WhatsApp" },
};

export default function MeetingsView() {
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [past, setPast] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", dateTime: "", attendees: "", type: "call", prepNotes: "", meetLink: "" });

  const generateMeetLink = () => {
    // Google Meet generates a unique room on meet.new — we store the pre-filled URL
    // For a real unique link, open meet.new in new tab and let user copy; or use a unique ID
    const roomId = Math.random().toString(36).slice(2, 8) + "-" + Math.random().toString(36).slice(2, 6) + "-" + Math.random().toString(36).slice(2, 8);
    const link = `https://meet.google.com/${roomId}`;
    setForm(f => ({ ...f, meetLink: link, type: "meeting" }));
    window.open("https://meet.new", "_blank");
  };
  const [adding, setAdding] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const load = async () => {
    try {
      const res = await fetch("/api/meetings");
      const data = await res.json();
      setUpcoming(data.upcoming || []);
      setPast(data.past || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.title || !form.dateTime) return;
    setAdding(true);
    await fetch("/api/meetings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...form, attendees: form.attendees.split(",").map(a => a.trim()).filter(Boolean) }),
    });
    setForm({ title: "", dateTime: "", attendees: "", type: "call", prepNotes: "", meetLink: "" });
    setShowAdd(false);
    await load();
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this meeting?")) return;
    await fetch("/api/meetings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    await load();
  };

  const getCountdown = (dateTime: string) => {
    const diff = new Date(dateTime).getTime() - Date.now();
    if (diff < 0) return "Now";
    const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const isToday = (dt: string) => {
    const d = new Date(dt); const now = new Date();
    return d.toDateString() === now.toDateString();
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-3 border border-white/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">📞 Meetings</h1>
            <p className="text-sm text-zinc-500">{upcoming.length} upcoming · {past.length} past</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Fathom bot panel */}
          <div className="glass rounded-xl px-4 py-2 border border-white/5 flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Fathom Notetaker
              </span>
              <span className="text-[10px] text-zinc-500">Invite bot to any meeting to record + transcribe</span>
            </div>
            <a href="https://fathom.video" target="_blank" rel="noopener noreferrer"
              className="text-[10px] text-brand-400 border border-brand-400/20 px-2.5 py-1 rounded-lg hover:bg-brand-400/10 transition-all whitespace-nowrap flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Open Fathom
            </a>
          </div>
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-400/10 text-brand-400 rounded-xl border border-brand-400/20 hover:bg-brand-400/20 text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> New Meeting
          </button>
        </div>
      </div>

      {/* Fathom instructions banner */}
      <div className="glass rounded-xl p-4 border border-emerald-500/10 bg-emerald-500/5">
        <p className="text-xs font-semibold text-emerald-400 mb-1">🎙️ How to record a meeting with Fathom (free)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] text-zinc-400">
          <div className="flex items-start gap-2"><span className="text-emerald-400 font-bold shrink-0">1.</span> Create free account at fathom.video → connect your Google/Zoom</div>
          <div className="flex items-start gap-2"><span className="text-emerald-400 font-bold shrink-0">2.</span> Fathom bot auto-joins your calendar meetings. Or invite <span className="text-white font-mono mx-1">notetaker@fathom.video</span></div>
          <div className="flex items-start gap-2"><span className="text-emerald-400 font-bold shrink-0">3.</span> After meeting: full transcript + AI summary + action items auto-emailed to you</div>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="glass rounded-xl p-5 space-y-3 animate-fadeInUp">
          <input value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))}
            placeholder="Meeting title" className="w-full px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
          <div className="grid grid-cols-3 gap-3">
            <input type="datetime-local" value={form.dateTime} onChange={e => setForm(f => ({...f, dateTime: e.target.value}))}
              className="px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
            <input value={form.attendees} onChange={e => setForm(f => ({...f, attendees: e.target.value}))}
              placeholder="Attendees (comma-separated)" className="px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
            <select value={form.type} onChange={e => setForm(f => ({...f, type: e.target.value}))}
              className="px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200">
              <option value="call">📞 Call</option>
              <option value="zoom">📹 Zoom</option>
              <option value="in-person">📍 In-Person</option>
              <option value="whatsapp">💬 WhatsApp</option>
            </select>
          </div>
          <textarea value={form.prepNotes} onChange={e => setForm(f => ({...f, prepNotes: e.target.value}))}
            placeholder="Prep notes..." rows={2} className="w-full px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30 resize-none" />
          {/* Meet link row */}
          <div className="flex gap-2">
            <input value={form.meetLink} onChange={e => setForm(f => ({...f, meetLink: e.target.value}))}
              placeholder="Meeting link (Google Meet, Zoom, etc.)"
              className="flex-1 px-4 py-2.5 bg-surface-2 border border-white/5 rounded-xl text-sm text-zinc-200 focus:outline-none focus:border-brand-400/30" />
            <button onClick={generateMeetLink} type="button"
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-medium hover:bg-blue-500/20 transition-all whitespace-nowrap">
              <Video className="w-3.5 h-3.5" /> Meet Link
            </button>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-zinc-400">Cancel</button>
            <button onClick={handleAdd} disabled={!form.title || !form.dateTime || adding}
              className="px-5 py-2 bg-brand-400 text-black text-sm font-semibold rounded-xl disabled:opacity-40">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /></div>
      ) : (
        <>
          {/* Today's meetings */}
          {upcoming.filter(m => isToday(m.dateTime)).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-brand-400 mb-3">📅 Today</h2>
              <div className="space-y-2">
                {upcoming.filter(m => isToday(m.dateTime)).map(meeting => (
                  <MeetingCard key={meeting.id} meeting={meeting} expanded={expanded === meeting.id}
                    onToggle={() => setExpanded(expanded === meeting.id ? null : meeting.id)}
                    onDelete={handleDelete} showCountdown />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">No upcoming meetings</div>
            ) : (
              <div className="space-y-2">
                {upcoming.filter(m => !isToday(m.dateTime)).map(meeting => (
                  <MeetingCard key={meeting.id} meeting={meeting} expanded={expanded === meeting.id}
                    onToggle={() => setExpanded(expanded === meeting.id ? null : meeting.id)}
                    onDelete={handleDelete} showCountdown />
                ))}
              </div>
            )}
          </div>

          {/* Past meetings */}
          {past.length > 0 && (
            <div>
              <button onClick={() => setShowPast(!showPast)}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-400 transition-colors">
                {showPast ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Past Meetings ({past.length})
              </button>
              {showPast && (
                <div className="space-y-2 mt-2 opacity-70">
                  {past.map(meeting => (
                    <MeetingCard key={meeting.id} meeting={meeting} expanded={expanded === meeting.id}
                      onToggle={() => setExpanded(expanded === meeting.id ? null : meeting.id)}
                      onDelete={handleDelete} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MeetingCard({ meeting, expanded, onToggle, onDelete, showCountdown }: {
  meeting: Meeting; expanded: boolean;
  onToggle: () => void; onDelete: (id: string) => void; showCountdown?: boolean;
}) {
  const tc = TYPE_CONFIG[meeting.type] || TYPE_CONFIG.call;
  const Icon = tc.icon;
  const countdown = showCountdown ? (() => {
    const diff = new Date(meeting.dateTime).getTime() - Date.now();
    if (diff < 0) return "Now";
    const h = Math.floor(diff / 3600000); const m = Math.floor((diff % 3600000) / 60000);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  })() : null;

  return (
    <div className="glass rounded-xl overflow-hidden animate-fadeInUp">
      <button onClick={onToggle} className="w-full p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors text-left">
        <Icon className={clsx("w-5 h-5 flex-shrink-0", tc.color)} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">{meeting.title}</p>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">
            <span>{new Date(meeting.dateTime).toLocaleString("en-US", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
            <span className={clsx("px-1.5 py-0.5 rounded text-[10px]", tc.color.replace("text-", "bg-").replace("400", "500/10"))}>{tc.label}</span>
            {meeting.attendees.length > 0 && <span>{meeting.attendees.length} attendee{meeting.attendees.length > 1 ? "s" : ""}</span>}
          </div>
        </div>
        {countdown && (
          <span className="text-xs font-mono text-brand-400 bg-brand-400/10 px-2 py-1 rounded-lg animate-glow-pulse">
            {countdown}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); onDelete(meeting.id); }} className="p-1.5 hover:bg-red-500/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 className="w-3.5 h-3.5 text-zinc-600" />
        </button>
        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {meeting.attendees.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Attendees</p>
              <div className="flex flex-wrap gap-1.5">
                {meeting.attendees.map(a => (
                  <span key={a} className="px-2 py-0.5 text-xs bg-surface-3 text-zinc-300 rounded-lg">{a}</span>
                ))}
              </div>
            </div>
          )}
          {meeting.prepNotes && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Prep Notes</p>
              <p className="text-xs text-zinc-400">{meeting.prepNotes}</p>
            </div>
          )}
          {(meeting as any).meetLink && (
            <a href={(meeting as any).meetLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-medium hover:bg-blue-500/20 transition-all w-fit">
              <Video className="w-3.5 h-3.5" /> Join Meeting
            </a>
          )}
          {meeting.agenda.length > 0 && (
            <div>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Agenda</p>
              {meeting.agenda.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  {item.done ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-zinc-600" />}
                  <span className={item.done ? "text-zinc-500 line-through" : "text-zinc-300"}>{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
