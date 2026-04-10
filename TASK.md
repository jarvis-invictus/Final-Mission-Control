# MC V6 Phase 1+2 Task — For Coding Agent

## PROJECT
Next.js 14 + TypeScript + Tailwind CSS app at /data/.openclaw/workspace/invictus-mc/
This is a Mission Control dashboard for Invictus AI.

## PHASE 1: BUG FIXES

### 1.1 Fix Agents API route — DYNAMIC IPs (app/api/agents/route.ts)
The current route has HARDCODED IPs that are wrong. Replace with dynamic docker inspect.
Change the route to use `execSync('docker inspect ...')` to get current IPs, just like fleet/health/route.ts does.
Current active agents:
- jarvis: container "openclaw-v1yl-openclaw-1"
- elon: container "openclaw-elon"
- linus: container "openclaw-linus"
- jordan: container "openclaw-jordan"
- friend: container "openclaw-friend"
Port 18790, token "fleet_ops_2026", timeout should be 5000ms (not 300000ms!)

### 1.2 Fix Sidebar — Rename "Demos" to "Niche Gallery" (components/dashboard/Sidebar.tsx)
Change `{ icon: Globe, label: "Demos", href: "/demos" }` to `{ icon: Globe, label: "Niche Gallery", href: "/demos" }`

### 1.3 Fix Org Hierarchy in AgentControl (components/agents/AgentControl.tsx)
- Remove "Friend" from the org tree (it's a personal companion, not business)
- Make the org tree visually clean: Sahil → Jarvis → Elon → [Linus, Jordan, Gary]
- Standby: Warren, Ray, Jony, Steve, Jeff (keep but mark as standby)

### 1.4 Fix Approvals persistence (app/api/approvals/route.ts)
Currently approvals are stored in memory and reset on restart. Make them persist by writing to a JSON file at /tmp/approvals.json (the container has /tmp available). When approve/reject is called, update the JSON file. On GET, read from the file.

### 1.5 Fix Fleet card restart/pause buttons (components/dashboard/FleetStatusLive.tsx)
The buttons should be:
- INSIDE each agent card (not floating outside)
- When "Controls" is clicked, show Restart/Pause/Stop buttons INSIDE the card
- Properly styled as real buttons with backgrounds, borders, hover effects
- Each button should call POST /api/agents/restart with the correct agentId and action

### 1.6 Fix VPS Audit cleanup buttons (app/audit/page.tsx)
The cleanup action buttons currently look like text. Make them look like REAL buttons:
- Full-width buttons with clear background colors
- Icons on the left
- Hover effects
- Remove the "text-left" class that makes them look like text blocks
- Add proper padding, border-radius, and distinct styling per action type

## PHASE 2: UI OVERHAUL

### 2.1 Global Theme (app/globals.css)
Update CSS variables:
```css
:root {
  --background: #050508;
  --foreground: #e4e4e7;
  --brand: #00ff88;  /* Neon green */
  --brand-dim: rgba(0, 255, 136, 0.1);
  --brand-glow: rgba(0, 255, 136, 0.15);
  --surface-0: #050508;
  --surface-1: rgba(255, 255, 255, 0.03);
  --surface-2: rgba(255, 255, 255, 0.05);
  --surface-3: rgba(255, 255, 255, 0.08);
  --surface-4: rgba(255, 255, 255, 0.04);
  --surface-5: rgba(255, 255, 255, 0.06);
}
```

Add glassmorphism utility:
```css
.glass {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

Add animations:
```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fadeInUp { animation: fadeInUp 0.4s ease-out forwards; }
```

### 2.2 Layout (app/layout.tsx)
- Body background should be #050508
- Max-width 1600px on main content, centered, 2.5rem padding

### 2.3 Welcome Bar (components/dashboard/CommandCenter.tsx)
Replace the current header with a welcome bar:
- "Good morning/afternoon/evening, Master" based on IST time
- Live date/time display (IST)
- Simple Pune weather (fetch from wttr.in API: fetch('/api/weather'))
- Create a simple weather API route at app/api/weather/route.ts that fetches from https://wttr.in/Pune?format=j1

### 2.4 Update tailwind.config.ts
Ensure the brand color in tailwind config matches the neon green (#00ff88).
Update the brand-400 and brand-500 colors to use neon green.

## CONSTRAINTS
- All function return types must be explicit (use `: Promise<any>` where needed)
- Don't break existing TypeScript types
- Don't modify files outside the listed ones unless absolutely necessary
- Use `execSync` for Docker commands in API routes (the container has Docker CLI)
- Keep code clean with comments for each section
