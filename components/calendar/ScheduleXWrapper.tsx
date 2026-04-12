"use client";

import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewMonthGrid,
  createViewWeek,
  createViewDay,
  createViewMonthAgenda,
} from "@schedule-x/calendar";
import { createEventModalPlugin } from "@schedule-x/event-modal";
import { createDragAndDropPlugin } from "@schedule-x/drag-and-drop";
import "@schedule-x/theme-default/dist/index.css";

interface CalEvent {
  id: string; title: string; start: string; end?: string;
  type?: string; description?: string; location?: string;
}

interface Props {
  events: CalEvent[];
  onClickDate: (date: string) => void;
  onEventUpdate: () => void;
}

function fmt(s: string): string {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().slice(0, 5);
  return time === "00:00" ? date : `${date} ${time}`;
}

export default function ScheduleXWrapper({ events, onClickDate, onEventUpdate }: Props) {
  const sxEvents = events.map(ev => ({
    id: ev.id,
    title: ev.title,
    start: fmt(ev.start),
    end: fmt(ev.end || ev.start),
    calendarId: ev.type || "default",
    description: ev.description || "",
    location: ev.location || "",
  }));

  const calendar = useCalendarApp({
    views: [
      createViewMonthGrid(),
      createViewWeek(),
      createViewDay(),
      createViewMonthAgenda(),
    ],
    events: sxEvents,
    plugins: [
      createEventModalPlugin(),
      createDragAndDropPlugin(),
    ],
    calendars: {
      meeting:  { colorName: "meeting",  lightColors: { main: "#D4A853", container: "#1a1500", onContainer: "#D4A853" }, darkColors: { main: "#D4A853", container: "#1a1500", onContainer: "#D4A853" } },
      call:     { colorName: "call",     lightColors: { main: "#60a5fa", container: "#0d1f3c", onContainer: "#93c5fd" }, darkColors: { main: "#60a5fa", container: "#0d1f3c", onContainer: "#93c5fd" } },
      zoom:     { colorName: "zoom",     lightColors: { main: "#8b5cf6", container: "#1e0f3a", onContainer: "#c4b5fd" }, darkColors: { main: "#8b5cf6", container: "#1e0f3a", onContainer: "#c4b5fd" } },
      task:     { colorName: "task",     lightColors: { main: "#a78bfa", container: "#1e1b3a", onContainer: "#c4b5fd" }, darkColors: { main: "#a78bfa", container: "#1e1b3a", onContainer: "#c4b5fd" } },
      deadline: { colorName: "deadline", lightColors: { main: "#f87171", container: "#2d1515", onContainer: "#fca5a5" }, darkColors: { main: "#f87171", container: "#2d1515", onContainer: "#fca5a5" } },
      event:    { colorName: "event",    lightColors: { main: "#34d399", container: "#052e1c", onContainer: "#6ee7b7" }, darkColors: { main: "#34d399", container: "#052e1c", onContainer: "#6ee7b7" } },
      default:  { colorName: "default",  lightColors: { main: "#6b7280", container: "#1c1c1c", onContainer: "#9ca3af" }, darkColors: { main: "#6b7280", container: "#1c1c1c", onContainer: "#9ca3af" } },
    },
    callbacks: {
      onEventUpdate: async (ev: any) => {
        await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", id: ev.id, start: ev.start, end: ev.end }),
        });
        onEventUpdate();
      },
      onClickDate: (date: string) => {
        onClickDate(date);
      },
    },
    locale: "en-US",
    defaultView: "month-grid",
  });

  return (
    <>
      <div className="rounded-2xl overflow-hidden border border-white/5 sx-dark">
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
      <style>{`
        .sx-dark .sx__wrapper,
        .sx-dark .sx__calendar-wrapper { background: transparent !important; }
        .sx-dark .sx__month-grid-day { background: rgba(255,255,255,0.01) !important; border-color: rgba(255,255,255,0.04) !important; cursor: pointer; }
        .sx-dark .sx__month-grid-day:hover { background: rgba(212,168,83,0.05) !important; }
        .sx-dark .sx__month-grid-day--today { background: rgba(212,168,83,0.07) !important; }
        .sx-dark .sx__calendar-header { background: rgba(255,255,255,0.02) !important; border-bottom: 1px solid rgba(255,255,255,0.05) !important; }
        .sx-dark .sx__weekday-heading { color: #52525b !important; font-size: 11px !important; text-transform: uppercase; letter-spacing: 0.05em; }
        .sx-dark .sx__month-grid-cell__header-date { color: #71717a !important; font-size: 12px !important; }
        .sx-dark .sx__month-grid-day--today .sx__month-grid-cell__header-date { color: #D4A853 !important; font-weight: 700 !important; }
        .sx-dark .sx__event { border-radius: 5px !important; font-size: 11px !important; }
        .sx-dark .sx__range-heading { color: #e4e4e7 !important; font-weight: 600 !important; }
        .sx-dark .sx__view-selection-item { color: #71717a !important; }
        .sx-dark .sx__view-selection-item--selected { color: #D4A853 !important; }
        .sx-dark .sx__calendar-header-controls button { color: #71717a !important; }
        .sx-dark .sx__calendar-header-controls button:hover { color: #D4A853 !important; }
        .sx-dark .sx__week-grid__date { color: #71717a !important; }
        .sx-dark .sx__week-grid__date--today { color: #D4A853 !important; }
        .sx-dark .sx__event-modal { background: #0d0d12 !important; border: 1px solid rgba(255,255,255,0.08) !important; color: #e4e4e7 !important; border-radius: 12px !important; }
        .sx-dark .sx__event-modal__title { color: #fff !important; font-weight: 600 !important; }
        .sx-dark .sx__time-grid__date-axis { color: #52525b !important; font-size: 11px !important; }
        .sx-dark .sx__time-grid-day { background: rgba(255,255,255,0.01) !important; }
      `}</style>
    </>
  );
}
