"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { ChevronRight, Copy, Check, ExternalLink, ChevronDown, ChevronUp, Lightbulb, AlertTriangle, Info } from "lucide-react";
import { clsx } from "clsx";

/* ================================================================ */
/*  TYPES                                                            */
/* ================================================================ */

interface Section {
  id: string;
  level: number;
  title: string;
  content: string;
}

interface TOCItem {
  id: string;
  level: number;
  title: string;
}

/* ================================================================ */
/*  MARKDOWN PARSER                                                   */
/* ================================================================ */

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let i = 0;
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    if (match[1]) {
      nodes.push(<strong key={i++} className="text-white font-semibold">{match[2]}</strong>);
    } else if (match[3]) {
      nodes.push(<em key={i++} className="text-zinc-300 italic">{match[4]}</em>);
    } else if (match[5]) {
      nodes.push(
        <code key={i++} className="px-1.5 py-0.5 bg-[#1e1e2e] text-brand-300 rounded text-[13px] font-mono border border-white/5">
          {match[6]}
        </code>
      );
    } else if (match[7]) {
      nodes.push(
        <a key={i++} href={match[9]} target="_blank" rel="noopener noreferrer"
          className="text-brand-400 hover:text-brand-300 underline decoration-brand-400/30 hover:decoration-brand-400 transition-colors inline-flex items-center gap-0.5">
          {match[8]}<ExternalLink className="w-3 h-3 inline" />
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes.length > 0 ? nodes : [text];
}

/* ================================================================ */
/*  CODE BLOCK                                                        */
/* ================================================================ */

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group my-4 rounded-xl overflow-hidden border border-white/5 bg-[#0d0d1a]">
      {lang && (
        <div className="px-4 py-1.5 bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          {lang}
        </div>
      )}
      <pre className="px-4 py-3 overflow-x-auto text-[13px] leading-relaxed font-mono text-zinc-300">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-2 right-2 p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

/* ================================================================ */
/*  TABLE                                                              */
/* ================================================================ */

function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length < 2) return null;
  const headers = rows[0];
  const data = rows.slice(2); // skip separator row

  return (
    <div className="my-4 overflow-x-auto rounded-xl border border-white/5">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-3">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2.5 text-left text-xs font-semibold text-zinc-300 border-b border-white/5 whitespace-nowrap">
                {parseInline(h.trim())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? "bg-surface-2" : "bg-surface-2/50"}>
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2 text-zinc-400 border-b border-white/[0.03] text-sm">
                  {parseInline(cell.trim())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ================================================================ */
/*  CALLOUT BOX                                                        */
/* ================================================================ */

function Callout({ type, children }: { type: "info" | "warning" | "tip"; children: React.ReactNode }) {
  const styles = {
    info: { bg: "bg-brand-400/5", border: "border-brand-400/20", icon: <Info className="w-4 h-4 text-brand-400" />, label: "Note" },
    warning: { bg: "bg-amber-500/5", border: "border-amber-500/20", icon: <AlertTriangle className="w-4 h-4 text-amber-400" />, label: "Warning" },
    tip: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", icon: <Lightbulb className="w-4 h-4 text-emerald-400" />, label: "Tip" },
  };
  const s = styles[type];
  return (
    <div className={clsx("my-4 rounded-xl border px-4 py-3 flex gap-3", s.bg, s.border)}>
      <div className="flex-shrink-0 mt-0.5">{s.icon}</div>
      <div className="text-sm text-zinc-300 leading-relaxed">{children}</div>
    </div>
  );
}

/* ================================================================ */
/*  MAIN RENDERER                                                      */
/* ================================================================ */

export default function DocReader({ content, title }: { content: string; title?: string }) {
  const [activeSection, setActiveSection] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  // Parse content into sections and elements
  const { elements, toc } = useMemo(() => {
    const lines = content.split("\n");
    const elems: React.ReactNode[] = [];
    const tocItems: TOCItem[] = [];
    let i = 0;
    let key = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code blocks
      const codeMatch = line.match(/^```(\w*)$/);
      if (codeMatch) {
        const lang = codeMatch[1];
        const codeLines: string[] = [];
        i++;
        while (i < lines.length && !lines[i].match(/^```$/)) {
          codeLines.push(lines[i]);
          i++;
        }
        i++;
        elems.push(<CodeBlock key={key++} code={codeLines.join("\n")} lang={lang} />);
        continue;
      }

      // Tables
      if (line.includes("|") && line.trim().startsWith("|")) {
        const tableRows: string[][] = [];
        while (i < lines.length && lines[i].includes("|") && lines[i].trim().startsWith("|")) {
          const cells = lines[i].split("|").slice(1, -1);
          tableRows.push(cells);
          i++;
        }
        if (tableRows.length >= 2) {
          elems.push(<MarkdownTable key={key++} rows={tableRows} />);
          continue;
        }
      }

      // Horizontal rule
      if (/^---+$/.test(line.trim())) {
        elems.push(<hr key={key++} className="my-6 border-white/5" />);
        i++;
        continue;
      }

      // Blockquote / Callout
      if (line.startsWith("> ")) {
        const quoteLines: string[] = [];
        while (i < lines.length && (lines[i].startsWith("> ") || lines[i].startsWith(">"))) {
          quoteLines.push(lines[i].replace(/^>\s?/, ""));
          i++;
        }
        const text = quoteLines.join(" ");
        const type = text.toLowerCase().includes("warning") || text.toLowerCase().includes("⚠")
          ? "warning"
          : text.toLowerCase().includes("tip") || text.toLowerCase().includes("💡")
          ? "tip"
          : "info";
        elems.push(<Callout key={key++} type={type}>{parseInline(text)}</Callout>);
        continue;
      }

      // Headings
      const h1 = line.match(/^# (.+)$/);
      if (h1) {
        const id = h1[1].replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
        tocItems.push({ id, level: 1, title: h1[1].replace(/\*\*/g, "").replace(/\*/g, "") });
        elems.push(
          <h1 key={key++} id={id} className="text-2xl font-bold text-white mt-10 mb-4 pb-3 border-b border-white/10 scroll-mt-6">
            {parseInline(h1[1])}
          </h1>
        );
        i++;
        continue;
      }
      const h2 = line.match(/^## (.+)$/);
      if (h2) {
        const id = h2[1].replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
        tocItems.push({ id, level: 2, title: h2[1].replace(/\*\*/g, "").replace(/\*/g, "") });
        elems.push(
          <h2 key={key++} id={id} className="text-xl font-semibold text-zinc-100 mt-8 mb-3 pb-2 border-b border-white/5 scroll-mt-6">
            {parseInline(h2[1])}
          </h2>
        );
        i++;
        continue;
      }
      const h3 = line.match(/^### (.+)$/);
      if (h3) {
        const id = h3[1].replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
        tocItems.push({ id, level: 3, title: h3[1].replace(/\*\*/g, "").replace(/\*/g, "") });
        elems.push(
          <h3 key={key++} id={id} className="text-lg font-medium text-zinc-200 mt-6 mb-2 scroll-mt-6">
            {parseInline(h3[1])}
          </h3>
        );
        i++;
        continue;
      }
      const h4 = line.match(/^#### (.+)$/);
      if (h4) {
        elems.push(
          <h4 key={key++} className="text-base font-medium text-zinc-300 mt-5 mb-1.5">
            {parseInline(h4[1])}
          </h4>
        );
        i++;
        continue;
      }

      // Unordered list
      if (/^[-*] /.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^[-*] /.test(lines[i])) {
          items.push(lines[i].replace(/^[-*] /, ""));
          i++;
        }
        elems.push(
          <ul key={key++} className="my-3 space-y-1.5">
            {items.map((item, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-zinc-400 leading-relaxed">
                <span className="text-brand-400/60 mt-1.5 flex-shrink-0">•</span>
                <span>{parseInline(item)}</span>
              </li>
            ))}
          </ul>
        );
        continue;
      }

      // Ordered list
      if (/^\d+\. /.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^\d+\. /.test(lines[i])) {
          items.push(lines[i].replace(/^\d+\. /, ""));
          i++;
        }
        elems.push(
          <ol key={key++} className="my-3 space-y-1.5">
            {items.map((item, idx) => (
              <li key={idx} className="flex gap-2.5 text-sm text-zinc-400 leading-relaxed">
                <span className="text-brand-400/80 font-medium flex-shrink-0 w-5 text-right">{idx + 1}.</span>
                <span>{parseInline(item)}</span>
              </li>
            ))}
          </ol>
        );
        continue;
      }

      // Empty line
      if (line.trim() === "") {
        i++;
        continue;
      }

      // Paragraph — collect consecutive non-empty lines
      const paraLines: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("```") && !lines[i].startsWith("> ") && !lines[i].startsWith("- ") && !lines[i].startsWith("* ") && !/^\d+\. /.test(lines[i]) && !lines[i].startsWith("|") && !/^---+$/.test(lines[i])) {
        paraLines.push(lines[i]);
        i++;
      }
      if (paraLines.length > 0) {
        elems.push(
          <p key={key++} className="text-sm text-zinc-400 leading-[1.8] my-2">
            {parseInline(paraLines.join(" "))}
          </p>
        );
      }
    }

    return { elements: elems, toc: tocItems };
  }, [content]);

  // Scroll spy for TOC
  useEffect(() => {
    if (toc.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0% -60% 0%" }
    );
    for (const item of toc) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [toc]);

  const showTOC = toc.length >= 3;

  return (
    <div className={clsx("flex gap-8", showTOC ? "" : "max-w-3xl mx-auto")}>
      {/* Main Content */}
      <div ref={contentRef} className="flex-1 min-w-0">
        {elements}
      </div>

      {/* Table of Contents - sticky sidebar */}
      {showTOC && (
        <div className="hidden xl:block w-56 flex-shrink-0">
          <div className="sticky top-6">
            <h4 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">On this page</h4>
            <nav className="space-y-0.5">
              {toc.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={clsx(
                    "block text-xs py-1 transition-colors truncate",
                    item.level === 1 ? "pl-0 font-medium" : item.level === 2 ? "pl-3" : "pl-6",
                    activeSection === item.id
                      ? "text-brand-400"
                      : "text-zinc-600 hover:text-zinc-400"
                  )}
                >
                  {item.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}
