"use client";

import { useState, useEffect, Fragment, ReactNode, useMemo } from "react";
import {
  ArrowLeft, Clock, FolderOpen, Users, Copy, Check,
  Pencil, Save, XCircle, Shield, Zap, BookOpen, Key,
} from "lucide-react";
import { clsx } from "clsx";

/* ================================================================
   TYPES
   ================================================================ */
interface AgentProfile {
  id: string;
  name: string;
  role: string;
  title: string;
  emoji: string;
  model: string;
  department: string;
  reportsTo: string;
  subAgents: string[];
  skills: string[];
  authority: string[];
  soul: string;
  memory: string;
  heartbeat: string;
  identity: string;
  decisions: string;
  tools: string;
  stats: { files: number; totalSize: number; folders: string[] };
  memoryFiles: { name: string; size: number; modified: string; preview: string }[];
  hasDocs: Record<string, boolean>;
}

interface AgentSummary {
  id: string;
  name: string;
  role: string;
  title: string;
  emoji: string;
  model: string;
  department: string;
  skills: string[];
  authority: string[];
  soulLines: number;
  soulPreview: string;
  memoryLines: number;
  memoryWords: number;
  fileCount: number;
  totalSize: number;
  topFolders: string[];
  hasSOUL: boolean;
  hasMEMORY: boolean;
  hasHEARTBEAT: boolean;
  hasIDENTITY: boolean;
  hasDECISIONS: boolean;
}

/* ================================================================
   MARKDOWN RENDERER
   ================================================================ */
function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[.+?\]\(.+?\)|`[^`]+`|\*\*.+?\*\*|\*.+?\*)/;
  const parts = text.split(pattern);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    const linkM = p.match(/^\[(.+?)\]\((.+?)\)$/);
    if (linkM) { nodes.push(<a key={i} href={linkM[2]} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{linkM[1]}</a>); continue; }
    const codeM = p.match(/^`([^`]+)`$/);
    if (codeM) { nodes.push(<code key={i} className="bg-surface-3 px-1.5 py-0.5 rounded font-mono text-sm text-brand-300">{codeM[1]}</code>); continue; }
    const boldM = p.match(/^\*\*(.+?)\*\*$/);
    if (boldM) { nodes.push(<strong key={i} className="font-bold text-zinc-100">{boldM[1]}</strong>); continue; }
    const italicM = p.match(/^\*(.+?)\*$/);
    if (italicM) { nodes.push(<em key={i} className="italic">{italicM[1]}</em>); continue; }
    nodes.push(<Fragment key={i}>{p}</Fragment>);
  }
  return nodes;
}

function MdRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const codeStart = line.match(/^```(\w*)$/);
    if (codeStart) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```$/)) { codeLines.push(lines[i]); i++; }
      i++;
      elements.push(<pre key={elements.length} className="p-3 bg-surface-0 rounded-lg overflow-x-auto text-sm my-2 border border-surface-4"><code className="text-zinc-300 font-mono">{codeLines.join("\n")}</code></pre>);
      continue;
    }
    if (/^---+$/.test(line.trim())) { elements.push(<hr key={elements.length} className="border-surface-4 my-4" />); i++; continue; }
    const h1 = line.match(/^# (.+)$/);
    if (h1) { elements.push(<h1 key={elements.length} className="text-xl font-bold text-white mt-6 mb-2">{parseInline(h1[1])}</h1>); i++; continue; }
    const h2 = line.match(/^## (.+)$/);
    if (h2) { elements.push(<h2 key={elements.length} className="text-lg font-semibold text-zinc-100 mt-5 mb-2 pb-1 border-b border-surface-4">{parseInline(h2[1])}</h2>); i++; continue; }
    const h3 = line.match(/^### (.+)$/);
    if (h3) { elements.push(<h3 key={elements.length} className="text-base font-medium text-zinc-200 mt-4 mb-1">{parseInline(h3[1])}</h3>); i++; continue; }
    const h4 = line.match(/^#### (.+)$/);
    if (h4) { elements.push(<h4 key={elements.length} className="text-sm font-medium text-zinc-300 mt-3 mb-1">{parseInline(h4[1])}</h4>); i++; continue; }
    const bq = line.match(/^> (.+)$/);
    if (bq) { elements.push(<blockquote key={elements.length} className="border-l-4 border-brand-400/50 pl-3 py-1 my-2 italic text-zinc-400 bg-surface-3/50 rounded-r">{parseInline(bq[1])}</blockquote>); i++; continue; }
    if (line.match(/^[-*] .+$/)) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] (.+)$/)) { const m = lines[i].match(/^[-*] (.+)$/); if (m) items.push(<li key={items.length} className="text-zinc-400 text-sm">{parseInline(m[1])}</li>); i++; }
      elements.push(<ul key={elements.length} className="list-disc ml-5 my-1 space-y-0.5">{items}</ul>);
      continue;
    }
    if (line.match(/^\|.+\|$/)) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].match(/^\|.+\|$/)) { const cells = lines[i].split("|").slice(1, -1).map(c => c.trim()); if (!cells.every(c => /^[-:]+$/.test(c))) rows.push(cells); i++; }
      if (rows.length > 0) {
        elements.push(
          <div key={elements.length} className="overflow-x-auto my-3">
            <table className="w-full text-sm border-collapse">
              <thead><tr className="border-b border-surface-4">{rows[0].map((h, hi) => <th key={hi} className="text-left py-1.5 px-2 font-semibold text-zinc-300 bg-surface-3">{parseInline(h)}</th>)}</tr></thead>
              <tbody>{rows.slice(1).map((row, ri) => <tr key={ri} className={ri % 2 === 0 ? "bg-surface-2" : "bg-surface-3"}>{row.map((cell, ci) => <td key={ci} className="py-1.5 px-2 text-zinc-400 border-b border-surface-4/30">{parseInline(cell)}</td>)}</tr>)}</tbody>
            </table>
          </div>
        );
      }
      continue;
    }
    if (line.trim() === "") { elements.push(<div key={elements.length} className="h-2" />); i++; continue; }
    elements.push(<p key={elements.length} className="text-zinc-400 text-sm leading-relaxed my-0.5">{parseInline(line)}</p>);
    i++;
  }
  return <div>{elements}</div>;
}

/* ================================================================
   AGENT CARD
   ================================================================ */
function AgentCard({ agent, onClick }: { agent: AgentSummary; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-surface-2 hover:bg-surface-3 border border-surface-4 hover:border-brand-400/30 rounded-xl p-5 transition-all duration-200 group"
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-surface-3 border border-surface-5 group-hover:border-brand-400/30 flex items-center justify-center text-2xl transition-colors flex-shrink-0">
          {agent.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white group-hover:text-brand-400 transition-colors">{agent.name}</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-3 text-zinc-400 border border-surface-5">{agent.role}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">{agent.title || agent.department}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-zinc-600">{agent.fileCount} files</span>
        </div>
      </div>
    </button>
  );
}

/* ================================================================
   AGENT DETAIL VIEW
   ================================================================ */
function AgentDetail({ agentId, onBack }: { agentId: string; onBack: () => void }) {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("soul");
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/agents/profile?id=${agentId}`)
      .then(r => r.json())
      .then(d => { setProfile(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [agentId]);

  const tabs = useMemo(() => {
    if (!profile) return [];
    const t = [
      { key: "soul", label: "Soul", icon: "⚡", has: profile.hasDocs.soul, content: profile.soul },
      { key: "memory", label: "Memory", icon: "🧠", has: profile.hasDocs.memory, content: profile.memory },
      { key: "heartbeat", label: "Heartbeat", icon: "💓", has: profile.hasDocs.heartbeat, content: profile.heartbeat },
      { key: "identity", label: "Identity", icon: "🎭", has: profile.hasDocs.identity, content: profile.identity },
      { key: "decisions", label: "Decisions", icon: "📋", has: profile.hasDocs.decisions, content: profile.decisions },
      { key: "tools", label: "Tools", icon: "🔧", has: profile.hasDocs.tools, content: profile.tools },
    ].filter(t => t.has);
    // Always add Skills and Authority tabs
    t.push({ key: "skills", label: "Skills", icon: "🛠️", has: true, content: "" });
    t.push({ key: "authority", label: "Authority", icon: "🔑", has: true, content: "" });
    return t;
  }, [profile]);

  const currentTab = tabs.find(t => t.key === activeTab);
  const currentContent = currentTab?.content || "";
  const isEditable = !["skills", "authority"].includes(activeTab);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const fileMap: Record<string, string> = { soul: "SOUL.md", memory: "MEMORY.md", heartbeat: "HEARTBEAT.md", identity: "IDENTITY.md", decisions: "DECISIONS.md", tools: "TOOLS.md" };
    const filename = fileMap[activeTab];
    if (!filename) { setSaving(false); return; }
    try {
      await fetch(`/api/agents/workspace/${agentId}/file`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filename, content: editContent }),
      });
      const r = await fetch(`/api/agents/profile?id=${agentId}`);
      const d = await r.json();
      setProfile(d);
      setEditing(false);
    } catch {}
    setSaving(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  if (!profile) return <div className="text-center py-20 text-red-400">Agent not found</div>;

  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Fleet
      </button>

      {/* Profile Header */}
      <div className="bg-surface-2 rounded-xl border border-surface-4 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-400/10 via-brand-400/5 to-surface-2 relative">
          <div className="absolute -bottom-8 left-5">
            <div className="w-16 h-16 rounded-xl bg-surface-1 border-4 border-surface-2 flex items-center justify-center text-3xl shadow-lg">
              {profile.emoji}
            </div>
          </div>
        </div>

        <div className="pt-10 pb-4 px-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-white">{profile.name}</h1>
              <p className="text-brand-400 font-semibold text-sm">{profile.role} — {profile.title}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-surface-3 border border-surface-4 text-zinc-300">
                  <Users className="w-3 h-3" /> {profile.department}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-surface-3 border border-surface-4 text-zinc-300">
                  <Shield className="w-3 h-3" /> Reports to {profile.reportsTo}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-brand-400/10 border border-brand-400/20 text-brand-400 font-mono">
                  <Zap className="w-3 h-3" /> {profile.model}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              {[
                { v: profile.soul.split("\n").length, l: "Soul" },
                { v: profile.memory.split(/\s+/).filter(Boolean).length.toLocaleString(), l: "Words" },
                { v: profile.stats.files, l: "Files" },
                { v: fmtSize(profile.stats.totalSize), l: "Size" },
              ].map(s => (
                <div key={s.l} className="bg-surface-1 rounded-lg px-3 py-1.5 text-center border border-surface-4">
                  <p className="text-sm font-bold text-white">{s.v}</p>
                  <p className="text-[9px] text-zinc-500 uppercase">{s.l}</p>
                </div>
              ))}
            </div>
          </div>

          {profile.subAgents.length > 0 && (
            <div className="mt-3">
              <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Sub-Agents</p>
              <div className="flex flex-wrap gap-1">
                {profile.subAgents.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-md text-[11px] bg-surface-3 border border-surface-4 text-zinc-300">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar + Content */}
      <div className="bg-surface-2 rounded-xl border border-surface-4 overflow-hidden">
        <div className="flex border-b border-surface-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setEditing(false); }}
              className={clsx(
                "flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2",
                activeTab === tab.key
                  ? "text-brand-400 border-brand-400 bg-brand-400/5"
                  : "text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-surface-3"
              )}
            >
              <span className="text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {/* Skills tab */}
          {activeTab === "skills" && profile && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-400" /> Skills & Capabilities
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {(profile.skills || []).map((skill, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-surface-1 rounded-lg border border-surface-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{skill}</span>
                  </div>
                ))}
              </div>
              {(!profile.skills || profile.skills.length === 0) && (
                <p className="text-sm text-zinc-500 italic">No skills defined for this agent yet.</p>
              )}
            </div>
          )}

          {/* Authority tab */}
          {activeTab === "authority" && profile && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" /> Authority & Approvals
              </h3>
              <div className="space-y-2">
                {(profile.authority || []).map((auth, i) => (
                  <div key={i} className="flex items-start gap-2 px-3 py-2 bg-surface-1 rounded-lg border border-surface-4">
                    <Shield className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-zinc-300">{auth}</span>
                  </div>
                ))}
              </div>
              {(!profile.authority || profile.authority.length === 0) && (
                <p className="text-sm text-zinc-500 italic">No authority definitions for this agent yet.</p>
              )}
            </div>
          )}

          {/* Document tabs */}
          {!["skills", "authority"].includes(activeTab) && (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] text-zinc-500 font-mono">
                  {currentContent.split("\n").length} lines · {currentContent.split(/\s+/).filter(Boolean).length} words
                </div>
                <div className="flex gap-1.5">
                  <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white bg-surface-1 rounded border border-surface-4 transition-colors">
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                  {isEditable && !editing && (
                    <button onClick={() => { setEditing(true); setEditContent(currentContent); }} className="flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-400 hover:text-white bg-surface-1 rounded border border-surface-4 transition-colors">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                  {editing && (
                    <>
                      <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-2 py-1 text-[11px] text-emerald-400 bg-emerald-500/10 rounded border border-emerald-500/20 disabled:opacity-50">
                        <Save className="w-3 h-3" /> {saving ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-2 py-1 text-[11px] text-red-400 bg-red-500/10 rounded border border-red-500/20">
                        <XCircle className="w-3 h-3" /> Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
              {editing ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full h-[500px] bg-surface-0 text-zinc-300 font-mono text-sm p-4 rounded-lg border border-surface-4 focus:border-brand-400/50 focus:outline-none resize-y"
                  spellCheck={false}
                />
              ) : currentContent ? (
                <div className="max-h-[600px] overflow-y-auto pr-2">
                  <MdRenderer content={currentContent} />
                </div>
              ) : (
                <p className="text-zinc-500 text-sm italic py-8 text-center">No content available.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Memory Timeline */}
      {profile.memoryFiles.length > 0 && (
        <div className="bg-surface-2 rounded-xl border border-surface-4 p-4">
          <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Memory Timeline ({profile.memoryFiles.length} entries)
          </h3>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {profile.memoryFiles.map(mf => {
              const dateMatch = mf.name.match(/(\d{4}-\d{2}-\d{2})/);
              const dateStr = dateMatch ? new Date(dateMatch[1]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : mf.name;
              return (
                <div key={mf.name} className="flex items-start gap-2.5 p-2.5 bg-surface-1 rounded-lg border border-surface-4 hover:border-surface-5 transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-zinc-300">{dateStr}</span>
                      <span className="text-[10px] text-zinc-600 font-mono">{(mf.size / 1024).toFixed(1)} KB</span>
                    </div>
                    {mf.preview && <p className="text-[11px] text-zinc-500 line-clamp-2">{mf.preview.replace(/^#.*\n/, '').trim()}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Workspace folders */}
      <div className="bg-surface-2 rounded-xl border border-surface-4 p-4">
        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FolderOpen className="w-4 h-4" /> Workspace ({profile.stats.folders.length} folders)
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {profile.stats.folders.map(f => (
            <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs bg-surface-1 border border-surface-4 text-zinc-300 hover:border-surface-5 transition-colors">
              <FolderOpen className="w-3 h-3 text-brand-400/50" /> {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN EXPORT
   ================================================================ */
export default function AgentProfiles() {
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/agents/profile")
      .then(r => r.json())
      .then(d => { setAgents(d.agents || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="animate-spin w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full" />
    </div>
  );

  if (selectedAgent) {
    return <AgentDetail agentId={selectedAgent} onBack={() => setSelectedAgent(null)} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">Agent Profiles</h2>
        <p className="text-xs text-zinc-500 mt-1">Click an agent to view profile, soul, memory, skills, and authority.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {agents.map(agent => (
          <AgentCard key={agent.id} agent={agent} onClick={() => setSelectedAgent(agent.id)} />
        ))}
      </div>
    </div>
  );
}
