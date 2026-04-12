"use client";

import Sidebar from '@/components/dashboard/Sidebar';
import { useState, useEffect } from 'react';
import { Radio, Send, CheckCircle, XCircle, Loader2, RefreshCw, MessageSquare, Phone, Globe, FileText } from 'lucide-react';
import { clsx } from 'clsx';

type Tab = 'send' | 'status' | 'templates';

export default function WhatsAppPage(): JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('send');

  return (
    <div className="flex h-screen bg-surface-0">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Radio className="w-5 h-5 text-emerald-400" />
              </div>
              WhatsApp Business
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Send messages, check status, and manage templates via Cloud API</p>
          </div>
          <a
            href="https://wa-invictus.in"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-surface-2 rounded-lg border border-white/5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            Open wa-invictus.in
          </a>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface-2 rounded-xl p-1 border border-white/5 w-fit">
          {([
            { id: 'send' as Tab, label: 'Send Message', icon: Send },
            { id: 'status' as Tab, label: 'Connection Status', icon: CheckCircle },
            { id: 'templates' as Tab, label: 'Templates', icon: FileText },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-surface-3"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'send' && <SendTab />}
        {activeTab === 'status' && <StatusTab />}
        {activeTab === 'templates' && <TemplatesTab />}
      </main>
    </div>
  );
}

function SendTab(): JSX.Element {
  const [to, setTo] = useState('+91');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; data: unknown } | null>(null);

  async function handleSend(): Promise<void> {
    if (!to || !message) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch('/api/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_text', to, message }),
      });
      const data = await res.json();
      setResult({
        success: !data.error,
        data,
      });
    } catch (err) {
      setResult({ success: false, data: { error: 'Network error' } });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-surface-2 rounded-xl border border-white/5 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          Send WhatsApp Message
        </h2>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Phone Number (with country code)</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="+919699577641"
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs text-zinc-500 mb-1.5">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Type your message here..."
            className="w-full bg-surface-3 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 resize-none"
          />
          <p className="text-[10px] text-zinc-600 mt-1">{message.length}/4096 characters</p>
        </div>

        <button
          onClick={handleSend}
          disabled={sending || !to || !message}
          className={clsx(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
            sending || !to || !message
              ? "bg-emerald-500/30 text-emerald-200/50 cursor-not-allowed"
              : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95"
          )}
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {sending ? 'Sending...' : 'Send Message'}
        </button>

        {result && (
          <div className={clsx(
            "rounded-lg p-4 border",
            result.success
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-red-500/5 border-red-500/20"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {result.success
                ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                : <XCircle className="w-4 h-4 text-red-400" />}
              <span className={clsx("text-sm font-medium", result.success ? "text-emerald-400" : "text-red-400")}>
                {result.success ? 'Message sent!' : 'Send failed'}
              </span>
            </div>
            <pre className="text-xs text-zinc-400 bg-surface-3 rounded-lg p-3 overflow-auto max-h-40">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Quick Send to Sahil */}
      <div className="bg-surface-2 rounded-xl border border-white/5 p-4">
        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Quick Send</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setTo('+919699577641'); setMessage(''); }}
            className="px-3 py-1.5 bg-surface-3 rounded-lg text-xs text-zinc-400 hover:text-white border border-white/5 hover:border-emerald-500/30 transition-all"
          >
            📱 Sahil (+91 96995 77641)
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusTab(): JSX.Element {
  const [status, setStatus] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp?section=status');
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ error: 'Failed to connect' });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <span className="ml-3 text-zinc-400 text-sm">Checking WhatsApp status...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Connection Status</h2>
        <button onClick={fetchStatus} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-2 bg-surface-2 rounded-lg border border-white/5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <div className="bg-surface-2 rounded-xl border border-white/5 p-6">
        <pre className="text-xs text-zinc-300 overflow-auto max-h-96">
          {JSON.stringify(status, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function TemplatesTab(): JSX.Element {
  const [templates, setTemplates] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates(): Promise<void> {
    setLoading(true);
    try {
      const res = await fetch('/api/whatsapp?section=templates');
      const data = await res.json();
      setTemplates(data);
    } catch {
      setTemplates({ error: 'Failed to fetch templates' });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
        <span className="ml-3 text-zinc-400 text-sm">Loading templates...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Message Templates</h2>
        <button onClick={fetchTemplates} className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white px-3 py-2 bg-surface-2 rounded-lg border border-white/5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>
      <div className="bg-surface-2 rounded-xl border border-white/5 p-6">
        <pre className="text-xs text-zinc-300 overflow-auto max-h-96">
          {JSON.stringify(templates, null, 2)}
        </pre>
      </div>
    </div>
  );
}
