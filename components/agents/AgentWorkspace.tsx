"use client";

import { useState, useEffect, useCallback, useMemo, Fragment, ReactNode } from "react";
import {
  Search, FileText, FolderOpen, FolderClosed, ChevronRight, ChevronDown,
  Copy, Check, Edit3, Save, XCircle, AlertTriangle, Eye, Pencil,
  Brain, Heart, Fingerprint, ClipboardList, Zap, Plus, Clock,
  Loader2, RefreshCw, X,
} from "lucide-react";
import { clsx } from "clsx";

/* ================================================================
   TYPES
   ================================================================ */
interface AgentInfo {
  id: string;
  name: string;
  emoji: string;
  role: string;
  fileCount: number;
  totalSize: number;
  keyFiles: string[];
  soulPreview: string;
}

interface FileEntry {
  name: string;
  path: string;
  size: number;
  modified: string;
  isDirectory: boolean;
  children?: FileEntry[];
}

interface FileContent {
  filename: string;
  path: string;
  content: string;
  size: number;
  modified: string;
}

/* ================================================================
   CONSTANTS
   ================================================================ */
const AGENT_META: Record<string, { emoji: string; color: string }> = {
  elon: { emoji: "🎖️", color: "#f59e0b" },
  jordan: { emoji: "📞", color: "#3b82f6" },
  gary: { emoji: "📣", color: "#f97316" },
  linus: { emoji: "⚙️", color: "#22c55e" },
  friend: { emoji: "👋", color: "#a855f7" },
};

const KEY_FILE_ICONS: Record<string, { icon: string; label: string }> = {
  "SOUL.md": { icon: "⚡", label: "Soul" },
  "MEMORY.md": { icon: "🧠", label: "Memory" },
  "HEARTBEAT.md": { icon: "💓", label: "Heartbeat" },
  "IDENTITY.md": { icon: "🎭", label: "Identity" },
  "DECISIONS.md": { icon: "📋", label: "Decisions" },
  "AGENTS.md": { icon: "🤖", label: "Agents" },
  "TOOLS.md": { icon: "🔧", label: "Tools" },
  "BOOT.md": { icon: "🚀", label: "Boot" },
};

const QUICK_FILES = [
  { key: "SOUL.md", icon: "⚡", label: "SOUL", color: "text-yellow-400" },
  { key: "MEMORY.md", icon: "🧠", label: "Memory", color: "text-brand-400" },
  { key: "IDENTITY.md", icon: "🎭", label: "Identity", color: "text-zinc-300" },
  { key: "HEARTBEAT.md", icon: "💓", label: "Heartbeat", color: "text-zinc-300" },
];

/* ================================================================
   INLINE MARKDOWN PARSER (from DocumentHub)
   ================================================================ */
function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\[.+?\]\(.+?\)|`[^`]+`|\*\*.+?\*\*|\*.+?\*)/;
  const parts = text.split(pattern);
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    const linkM = p.match(/^\[(.+?)\]\((.+?)\)$/);
    if (linkM) {
      nodes.push(<a key={i} href={linkM[2]} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{linkM[1]}</a>);
      continue;
    }
    const codeM = p.match(/^`([^`]+)`$/);
    if (codeM) {
      nodes.push(<code key={i} className="bg-[#262630] px-1.5 py-0.5 rounded font-mono text-sm text-brand-300">{codeM[1]}</code>);
      continue;
    }
    const boldM = p.match(/^\*\*(.+?)\*\*$/);
    if (boldM) {
      nodes.push(<strong key={i} className="font-bold text-zinc-200">{boldM[1]}</strong>);
      continue;
    }
    const italicM = p.match(/^\*(.+?)\*$/);
    if (italicM) {
      nodes.push(<em key={i} className="italic">{italicM[1]}</em>);
      continue;
    }
    nodes.push(<Fragment key={i}>{p}</Fragment>);
  }
  return nodes;
}

/* ================================================================
   CODE BLOCK
   ================================================================ */
function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative my-4 rounded-lg overflow-hidden border border-surface-4">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-3 text-xs text-zinc-500">
        <span className="font-mono">{lang || "text"}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="p-4 bg-[#0d0d12] overflow-x-auto text-sm leading-relaxed">
        <code className="text-zinc-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}

/* ================================================================
   MARKDOWN RENDERER
   ================================================================ */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const codeStart = line.match(/^```(\w*)$/);
    if (codeStart) {
      const lang = codeStart[1] || "";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].match(/^```$/)) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(<CodeBlock key={elements.length} code={codeLines.join("\n")} lang={lang} />);
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={elements.length} className="border-[#262630] my-6" />);
      i++;
      continue;
    }

    const h1 = line.match(/^# (.+)$/);
    if (h1) {
      const id = h1[1].toLowerCase().replace(/[^a-z0-9]+/g, "-");
      elements.push(<h1 key={elements.length} id={id} className="text-2xl font-bold text-white mt-8 mb-3">{parseInline(h1[1])}</h1>);
      i++;
      continue;
    }
    const h2 = line.match(/^## (.+)$/);
    if (h2) {
      const id = h2[1].replace(/\*\*/g, "").replace(/\*/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      elements.push(<h2 key={elements.length} id={id} className="text-xl font-semibold text-zinc-100 mt-7 mb-2 pb-2 border-b border-[#262630]">{parseInline(h2[1])}</h2>);
      i++;
      continue;
    }
    const h3 = line.match(/^### (.+)$/);
    if (h3) {
      const id = h3[1].replace(/\*\*/g, "").replace(/\*/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      elements.push(<h3 key={elements.length} id={id} className="text-lg font-medium text-zinc-200 mt-5 mb-2">{parseInline(h3[1])}</h3>);
      i++;
      continue;
    }
    const h4 = line.match(/^#### (.+)$/);
    if (h4) {
      elements.push(<h4 key={elements.length} className="text-base font-medium text-zinc-300 mt-4 mb-1">{parseInline(h4[1])}</h4>);
      i++;
      continue;
    }

    const bq = line.match(/^> (.+)$/);
    if (bq) {
      elements.push(
        <blockquote key={elements.length} className="border-l-4 border-brand-500 pl-4 py-2 my-3 italic bg-[#1f1f28] rounded-r-lg text-zinc-400">
          {parseInline(bq[1])}
        </blockquote>
      );
      i++;
      continue;
    }

    if (line.match(/^[-*] .+$/)) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^[-*] (.+)$/)) {
        const m = lines[i].match(/^[-*] (.+)$/);
        if (m) items.push(<li key={items.length} className="text-zinc-400 text-sm leading-relaxed">{parseInline(m[1])}</li>);
        i++;
      }
      elements.push(<ul key={elements.length} className="list-disc ml-6 my-2 space-y-1">{items}</ul>);
      continue;
    }

    if (line.match(/^\d+\. .+$/)) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].match(/^\d+\. (.+)$/)) {
        const m = lines[i].match(/^\d+\. (.+)$/);
        if (m) items.push(<li key={items.length} className="text-zinc-400 text-sm leading-relaxed">{parseInline(m[1])}</li>);
        i++;
      }
      elements.push(<ol key={elements.length} className="list-decimal ml-6 my-2 space-y-1">{items}</ol>);
      continue;
    }

    if (line.match(/^\|.+\|$/)) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].match(/^\|.+\|$/)) {
        const cells = lines[i].split("|").slice(1, -1).map(c => c.trim());
        if (!cells.every(c => /^[-:]+$/.test(c))) {
          rows.push(cells);
        }
        i++;
      }
      if (rows.length > 0) {
        const header = rows[0];
        const body = rows.slice(1);
        elements.push(
          <div key={elements.length} className="overflow-x-auto my-4">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#262630]">
                  {header.map((h, hi) => (
                    <th key={hi} className="text-left py-2 px-3 font-semibold text-zinc-300 bg-[#1f1f28]">{parseInline(h)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className={ri % 2 === 0 ? "bg-[#18181f]" : "bg-[#1f1f28]"}>
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-2 px-3 text-zinc-400 border-b border-[#262630]/50">{parseInline(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    if (line.trim() === "") {
      elements.push(<div key={elements.length} className="h-3" />);
      i++;
      continue;
    }

    elements.push(<p key={elements.length} className="text-zinc-400 text-sm leading-relaxed my-1">{parseInline(line)}</p>);
    i++;
  }

  return <div className="prose-custom">{elements}</div>;
}

/* ================================================================
   TABLE OF CONTENTS
   ================================================================ */
function TableOfContents({ content, onJump }: { content: string; onJump: (id: string) => void }) {
  const headings = useMemo(() => {
    const result: { level: number; text: string; id: string }[] = [];
    for (const line of content.split("\n")) {
      const m = line.match(/^(#{1,3}) (.+)$/);
      if (m) {
        const text = m[2].replace(/\*\*/g, "").replace(/\*/g, "");
        result.push({
          level: m[1].length,
          text,
          id: text.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        });
      }
    }
    return result;
  }, [content]);

  if (headings.length < 3) return null;

  return (
    <div className="mb-4 p-3 bg-surface-3 rounded-lg border border-surface-4">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-2">Contents</p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {headings.map((h, i) => (
          <button
            key={i}
            onClick={() => onJump(h.id)}
            className={clsx(
              "block text-xs text-zinc-400 hover:text-white transition-colors truncate w-full text-left",
              h.level === 1 && "font-semibold",
              h.level === 2 && "pl-3",
              h.level === 3 && "pl-6 text-zinc-500",
            )}
          >
            {h.text}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   FILE TREE NODE
   ================================================================ */
function FileTreeNode({
  entry,
  depth,
  selectedPath,
  onSelect,
  searchFilter,
}: {
  entry: FileEntry;
  depth: number;
  selectedPath: string;
  onSelect: (path: string) => void;
  searchFilter: string;
}) {
  const [expanded, setExpanded] = useState(depth < 1);

  const keyInfo = KEY_FILE_ICONS[entry.name];
  const isSelected = entry.path === selectedPath;

  // Filter logic
  const matchesFilter = !searchFilter || entry.name.toLowerCase().includes(searchFilter.toLowerCase());
  const hasMatchingChildren = entry.children?.some(c =>
    c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.children?.some(gc => gc.name.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  if (searchFilter && !matchesFilter && !hasMatchingChildren && !entry.isDirectory) return null;
  if (searchFilter && entry.isDirectory && !hasMatchingChildren && !matchesFilter) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
  };

  if (entry.isDirectory) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={clsx(
            "flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-sm hover:bg-surface-3 rounded transition-colors",
            "text-zinc-400 hover:text-white"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {expanded ? <ChevronDown className="w-3 h-3 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 flex-shrink-0" />}
          {expanded ? <FolderOpen className="w-4 h-4 text-yellow-500/70 flex-shrink-0" /> : <FolderClosed className="w-4 h-4 text-yellow-500/50 flex-shrink-0" />}
          <span className="truncate">{entry.name}</span>
          {entry.children && (
            <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">{entry.children.length}</span>
          )}
        </button>
        {expanded && entry.children && (
          <div>
            {entry.children.map(child => (
              <FileTreeNode
                key={child.path}
                entry={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
                searchFilter={searchFilter}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(entry.path)}
      className={clsx(
        "flex items-center gap-1.5 w-full px-2 py-1.5 text-left text-sm rounded transition-all",
        isSelected
          ? "bg-brand-400/20 text-brand-300 border-l-2 border-brand-500"
          : "text-zinc-400 hover:bg-surface-3 hover:text-white border-l-2 border-transparent"
      )}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
    >
      {keyInfo ? (
        <span className="text-sm flex-shrink-0">{keyInfo.icon}</span>
      ) : (
        <FileText className="w-4 h-4 text-zinc-500 flex-shrink-0" />
      )}
      <span className="truncate">{entry.name}</span>
      <span className="text-[10px] text-zinc-600 ml-auto flex-shrink-0">{formatSize(entry.size)}</span>
    </button>
  );
}

/* ================================================================
   MEMORY TIMELINE
   ================================================================ */
function MemoryTimeline({
  files,
  agent,
  onSelectFile,
  onCreateMemory,
}: {
  files: FileEntry[];
  agent: string;
  onSelectFile: (path: string) => void;
  onCreateMemory: () => void;
}) {
  const [memorySearch, setMemorySearch] = useState("");
  const [previews, setPreviews] = useState<Record<string, { content: string; wordCount: number }>>({});
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  const memoryFiles = useMemo(() => {
    return files
      .filter(f => !f.isDirectory && f.name.endsWith(".md"))
      .sort((a, b) => b.name.localeCompare(a.name)); // newest first by filename
  }, [files]);

  // Load previews
  useEffect(() => {
    if (memoryFiles.length === 0) return;
    setLoadingPreviews(true);
    const loadPreviews = async () => {
      const newPreviews: Record<string, { content: string; wordCount: number }> = {};
      for (const file of memoryFiles.slice(0, 20)) {
        try {
          const res = await fetch(`/api/agents/workspace/${agent}/file?path=${encodeURIComponent(file.path)}`);
          if (res.ok) {
            const data = await res.json();
            newPreviews[file.path] = {
              content: data.content.slice(0, 200),
              wordCount: data.content.split(/\s+/).filter(Boolean).length,
            };
          }
        } catch { /* skip */ }
      }
      setPreviews(newPreviews);
      setLoadingPreviews(false);
    };
    loadPreviews();
  }, [memoryFiles, agent]);

  const filtered = memorySearch
    ? memoryFiles.filter(f =>
        f.name.toLowerCase().includes(memorySearch.toLowerCase()) ||
        (previews[f.path]?.content || "").toLowerCase().includes(memorySearch.toLowerCase())
      )
    : memoryFiles;

  const extractDate = (name: string): string => {
    const m = name.match(/(\d{4}-\d{2}-\d{2})/);
    if (m) {
      try {
        return new Date(m[1]).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      } catch { return name; }
    }
    return name.replace(".md", "");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={memorySearch}
            onChange={e => setMemorySearch(e.target.value)}
            placeholder="Search memories..."
            className="w-full pl-9 pr-3 py-2 bg-surface-3 border border-surface-4 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
          />
        </div>
        <button
          onClick={onCreateMemory}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-400/20 text-brand-400 rounded-lg text-sm font-medium hover:bg-brand-400/30 transition-colors border border-brand-400/20"
        >
          <Plus className="w-4 h-4" /> Add Memory
        </button>
      </div>

      {loadingPreviews && (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading memories...
        </div>
      )}

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.map(file => (
          <button
            key={file.path}
            onClick={() => onSelectFile(file.path)}
            className="w-full text-left p-3 bg-surface-2 border border-surface-4 rounded-lg hover:border-brand-500/30 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-zinc-200 group-hover:text-white">
                {extractDate(file.name)}
              </span>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                {previews[file.path] && (
                  <span>{previews[file.path].wordCount} words</span>
                )}
                <span>{(file.size / 1024).toFixed(1)}K</span>
              </div>
            </div>
            {previews[file.path] && (
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                {previews[file.path].content.replace(/^#.*\n?/, "").trim()}
              </p>
            )}
          </button>
        ))}
        {filtered.length === 0 && !loadingPreviews && (
          <p className="text-sm text-zinc-500 text-center py-8">No memory files found</p>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   CONFIRM DIALOG
   ================================================================ */
function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface-2 border border-surface-4 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white bg-surface-3 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */
export default function AgentWorkspace() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMemoryTimeline, setShowMemoryTimeline] = useState(false);
  const [infoCollapsed, setInfoCollapsed] = useState(true);

  // Load agents list
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/agents/workspace");
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents);
          if (data.agents.length > 0 && !selectedAgent) {
            setSelectedAgent(data.agents[0].id);
          }
        }
      } catch { /* skip */ }
      setLoading(false);
    };
    load();
  }, []);

  // Load file tree when agent changes
  useEffect(() => {
    if (!selectedAgent) return;
    const loadFiles = async () => {
      try {
        const res = await fetch(`/api/agents/workspace/${selectedAgent}`);
        if (res.ok) {
          const data = await res.json();
          setFiles(data.files);
        }
      } catch { /* skip */ }
    };
    loadFiles();
    setSelectedFile(null);
    setMode("view");
    setHasUnsavedChanges(false);
    setShowMemoryTimeline(false);
  }, [selectedAgent]);

  // Open a file
  const openFile = useCallback(async (filePath: string) => {
    if (hasUnsavedChanges) {
      if (!confirm("You have unsaved changes. Discard them?")) return;
    }
    setLoadingFile(true);
    setMode("view");
    setHasUnsavedChanges(false);

    // Check if it's a memory folder path
    if (filePath === "memory" || filePath === "memory/") {
      setShowMemoryTimeline(true);
      setSelectedFile(null);
      setLoadingFile(false);
      return;
    }

    setShowMemoryTimeline(false);

    try {
      const res = await fetch(`/api/agents/workspace/${selectedAgent}/file?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data: FileContent = await res.json();
        setSelectedFile(data);
        setEditContent(data.content);
      }
    } catch { /* skip */ }
    setLoadingFile(false);
  }, [selectedAgent, hasUnsavedChanges]);

  // Save file
  const saveFile = useCallback(async () => {
    if (!selectedFile) return;

    // Confirm for SOUL.md
    if (selectedFile.filename === "SOUL.md" && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/agents/workspace/${selectedAgent}/file`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: selectedFile.path, content: editContent }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedFile(prev => prev ? { ...prev, content: editContent, size: data.size, modified: data.modified } : null);
        setHasUnsavedChanges(false);
        setMode("view");
      }
    } catch { /* skip */ }
    setSaving(false);
    setShowConfirm(false);
  }, [selectedFile, selectedAgent, editContent, showConfirm]);

  // Create new memory file
  const createMemory = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const filePath = `memory/${today}.md`;
    const content = `# Memory — ${today}\n\n`;

    try {
      const res = await fetch(`/api/agents/workspace/${selectedAgent}/file`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: filePath, content }),
      });
      if (res.ok) {
        // Refresh files and open the new file
        const filesRes = await fetch(`/api/agents/workspace/${selectedAgent}`);
        if (filesRes.ok) {
          const data = await filesRes.json();
          setFiles(data.files);
        }
        openFile(filePath);
      }
    } catch { /* skip */ }
  }, [selectedAgent, openFile]);

  const currentAgentInfo = agents.find(a => a.id === selectedAgent);
  const agentMeta = AGENT_META[selectedAgent] || { emoji: "🤖", color: "#71717a" };

  // Find memory folder files for timeline
  const memoryFolderFiles = useMemo(() => {
    const memDir = files.find(f => f.isDirectory && f.name === "memory");
    return memDir?.children || [];
  }, [files]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch { return iso; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-brand-500 animate-spin" />
        <span className="ml-2 text-sm text-zinc-500">Loading workspaces...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Warning Banner */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <p className="text-xs text-amber-400">
          <span className="font-bold">⚠️ Live Workspace</span> — Changes here directly modify agent behavior. Edit with care.
        </p>
      </div>

      {/* Agent Selector Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {agents.map(agent => {
          const meta = AGENT_META[agent.id] || { emoji: "🤖", color: "#71717a" };
          const isActive = agent.id === selectedAgent;
          return (
            <button
              key={agent.id}
              onClick={() => setSelectedAgent(agent.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all border",
                isActive
                  ? "bg-brand-400/20 text-white border-brand-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                  : "bg-surface-2 text-zinc-400 border-surface-4 hover:text-white hover:border-surface-3"
              )}
            >
              <span className="text-lg">{meta.emoji}</span>
              <span>{agent.name}</span>
              <span className={clsx(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                isActive ? "bg-brand-500/20 text-brand-300" : "bg-surface-3 text-zinc-500"
              )}>
                {agent.fileCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Agent Info Card (collapsible) */}
      {currentAgentInfo && (
        <div className="bg-surface-2 border border-surface-4 rounded-xl overflow-hidden">
          <button
            onClick={() => setInfoCollapsed(!infoCollapsed)}
            className="flex items-center justify-between w-full px-4 py-3 hover:bg-surface-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{agentMeta.emoji}</span>
              <div className="text-left">
                <h3 className="text-sm font-bold text-white">{currentAgentInfo.name}</h3>
                <p className="text-[11px] text-zinc-500">{currentAgentInfo.role} • {currentAgentInfo.fileCount} files • {formatSize(currentAgentInfo.totalSize)}</p>
              </div>
            </div>
            <ChevronDown className={clsx("w-4 h-4 text-zinc-500 transition-transform", infoCollapsed && "-rotate-90")} />
          </button>
          {!infoCollapsed && currentAgentInfo.soulPreview && (
            <div className="px-4 pb-3 border-t border-surface-4 pt-3">
              <p className="text-xs text-zinc-400 leading-relaxed">{currentAgentInfo.soulPreview}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {currentAgentInfo.keyFiles.map(f => (
                  <span key={f} className="text-[10px] bg-surface-3 text-zinc-400 px-2 py-0.5 rounded-full border border-surface-4">
                    {KEY_FILE_ICONS[f]?.icon || "📄"} {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {QUICK_FILES.map(qf => (
          <button
            key={qf.key}
            onClick={() => openFile(qf.key)}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
              "bg-surface-2 border-surface-4 hover:border-surface-3",
              selectedFile?.filename === qf.key ? "text-white border-brand-500/40 bg-brand-400/10" : "text-zinc-400 hover:text-white"
            )}
          >
            <span>{qf.icon}</span>
            <span>{qf.label}</span>
          </button>
        ))}
        <button
          onClick={() => { setShowMemoryTimeline(true); setSelectedFile(null); }}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border",
            "bg-surface-2 border-surface-4 hover:border-surface-3",
            showMemoryTimeline ? "text-white border-brand-500/40 bg-brand-400/10" : "text-zinc-400 hover:text-white"
          )}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Memory Timeline</span>
        </button>
      </div>

      {/* Main Content: File Explorer + Viewer */}
      <div className="flex gap-4 min-h-[600px]">
        {/* File Explorer (Left Panel) */}
        <div className="w-[30%] min-w-[240px] bg-surface-1 border border-surface-4 rounded-xl overflow-hidden flex flex-col">
          {/* Search */}
          <div className="p-2 border-b border-surface-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
              <input
                value={fileSearch}
                onChange={e => setFileSearch(e.target.value)}
                placeholder="Filter files..."
                className="w-full pl-8 pr-3 py-1.5 bg-surface-2 border border-surface-4 rounded-lg text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-brand-500/50"
              />
              {fileSearch && (
                <button onClick={() => setFileSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-zinc-500 hover:text-white" />
                </button>
              )}
            </div>
          </div>

          {/* File Tree */}
          <div className="flex-1 overflow-y-auto py-1 px-1">
            {files.map(entry => (
              <FileTreeNode
                key={entry.path}
                entry={entry}
                depth={0}
                selectedPath={selectedFile?.path || ""}
                onSelect={openFile}
                searchFilter={fileSearch}
              />
            ))}
            {files.length === 0 && (
              <p className="text-xs text-zinc-600 text-center py-8">No files found</p>
            )}
          </div>
        </div>

        {/* Viewer/Editor (Right Panel) */}
        <div className="flex-1 bg-surface-2 border border-surface-4 rounded-xl overflow-hidden flex flex-col">
          {showMemoryTimeline ? (
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-brand-400" />
                Memory Timeline — {currentAgentInfo?.name || selectedAgent}
              </h3>
              <MemoryTimeline
                files={memoryFolderFiles}
                agent={selectedAgent}
                onSelectFile={(p) => { setShowMemoryTimeline(false); openFile(p); }}
                onCreateMemory={createMemory}
              />
            </div>
          ) : loadingFile ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
              <span className="ml-2 text-sm text-zinc-500">Loading file...</span>
            </div>
          ) : selectedFile ? (
            <>
              {/* File Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-4 bg-surface-3/50">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg">{KEY_FILE_ICONS[selectedFile.filename]?.icon || "📄"}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white truncate">{selectedFile.filename}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-400/20 text-brand-400 font-medium flex-shrink-0">
                        {currentAgentInfo?.name || selectedAgent}
                      </span>
                      {hasUnsavedChanges && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium flex-shrink-0">
                          Unsaved
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      {formatSize(selectedFile.size)} • Modified {formatDate(selectedFile.modified)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* View/Edit toggle */}
                  <div className="flex items-center bg-surface-3 rounded-lg border border-surface-4 p-0.5">
                    <button
                      onClick={() => setMode("view")}
                      className={clsx(
                        "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        mode === "view" ? "bg-surface-2 text-white shadow-sm" : "text-zinc-500 hover:text-white"
                      )}
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                    <button
                      onClick={() => { setMode("edit"); setEditContent(selectedFile.content); }}
                      className={clsx(
                        "flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                        mode === "edit" ? "bg-surface-2 text-white shadow-sm" : "text-zinc-500 hover:text-white"
                      )}
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  {/* Copy button */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedFile.content);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-zinc-500 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto">
                {mode === "view" ? (
                  <div className="p-6">
                    <TableOfContents
                      content={selectedFile.content}
                      onJump={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
                    />
                    <MarkdownRenderer content={selectedFile.content} />
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <textarea
                      value={editContent}
                      onChange={e => {
                        setEditContent(e.target.value);
                        setHasUnsavedChanges(e.target.value !== selectedFile.content);
                      }}
                      className="flex-1 w-full p-4 bg-surface-2 text-zinc-300 font-mono text-sm leading-relaxed resize-none focus:outline-none min-h-[400px]"
                      spellCheck={false}
                    />
                    <div className="flex items-center justify-between px-4 py-3 border-t border-surface-4 bg-surface-3/50">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {editContent.split("\n").length} lines • {editContent.length} chars
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditContent(selectedFile.content);
                            setHasUnsavedChanges(false);
                            setMode("view");
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white bg-surface-3 rounded-lg transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Discard
                        </button>
                        <button
                          onClick={saveFile}
                          disabled={saving || !hasUnsavedChanges}
                          className={clsx(
                            "flex items-center gap-1 px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
                            hasUnsavedChanges
                              ? "bg-brand-400 text-black hover:bg-brand-300"
                              : "bg-surface-3 text-zinc-500 cursor-not-allowed"
                          )}
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          {saving ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-sm font-bold text-zinc-400 mb-1">Select a file to view</h3>
              <p className="text-xs text-zinc-600 max-w-xs">
                Choose a file from the explorer or use the quick action buttons above to view SOUL, Memory, Identity, or Heartbeat files.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog for SOUL.md */}
      <ConfirmDialog
        open={showConfirm}
        title="Modify Agent Soul?"
        message="You're about to modify this agent's SOUL.md file. This directly controls the agent's personality, behavior, and decision-making. Are you absolutely sure?"
        onConfirm={saveFile}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  );
}
