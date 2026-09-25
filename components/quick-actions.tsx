"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, Loader2, MailPlus, Plus, Settings, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Action = "feedback" | "invite" | "report" | null;

export function QuickActions({ canInvite, canReport }: { canInvite: boolean; canReport: boolean }) {
  const router = useRouter();
  const [action, setAction] = useState<Action>(null);
  const [content, setContent] = useState("");
  const [channel, setChannel] = useState("Manual entry");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("ANALYST");
  const [title, setTitle] = useState("Voice of Customer Report");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!action) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [action]);

  function close() {
    setAction(null);
    setError("");
    setMessage("");
  }

  function open(next: Action) { setAction(next); setMessage(""); setError(""); }
  async function submit() {
    setLoading(true); setError(""); setMessage("");
    try {
      const endpoint = action === "feedback" ? "/api/feedback" : action === "invite" ? "/api/workspace/members" : "/api/reports";
      const body = action === "feedback" ? { content, channel } : action === "invite" ? { email, role } : { title, period: "weekly" };
      const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Action failed");
      if (action === "invite") {
        setMessage(`Invitation email sent to ${data.email}.`);
        setEmail("");
      } else if (action === "report") {
        setMessage("Report generated. Opening Reports...");
        window.setTimeout(() => router.push("/reports"), 500);
      } else {
        setMessage("Feedback added and classified.");
        setContent("");
        window.setTimeout(() => router.refresh(), 500);
      }
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Action failed"); }
    finally { setLoading(false); }
  }
  const dialog = action && mounted ? createPortal(
    <div
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-action-title"
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_25px_80px_rgba(15,23,42,0.3)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">LOOP workspace</div>
            <h2 id="quick-action-title" className="mt-2 text-xl font-bold text-slate-900">{action === "feedback" ? "Add feedback" : action === "invite" ? "Invite a member" : "Generate report"}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={close} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-5 space-y-4">
          {action === "feedback" && <><label className="block text-sm font-medium text-slate-700">Feedback<textarea autoFocus className="input mt-1 min-h-32 resize-y" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Paste the customer’s feedback..." /></label><label className="block text-sm font-medium text-slate-700">Channel<input className="input mt-1" value={channel} onChange={(event) => setChannel(event.target.value)} /></label></>}
          {action === "invite" && <><label className="block text-sm font-medium text-slate-700">Member email<input autoFocus className="input mt-1" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@company.com" /></label><label className="block text-sm font-medium text-slate-700">Role<select className="input mt-1" value={role} onChange={(event) => setRole(event.target.value)}><option>ANALYST</option><option>VIEWER</option><option>ADMIN</option></select></label></>}
          {action === "report" && <><label className="block text-sm font-medium text-slate-700">Report title<input autoFocus className="input mt-1" value={title} onChange={(event) => setTitle(event.target.value)} /></label><p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">This report will use the last 7 days of real feedback, sentiment, themes, and representative quotes.</p></>}
        </div>
        {error && <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        {message && <div role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
        <div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={close}>Cancel</Button><Button type="button" variant="primary" disabled={loading || (action === "feedback" ? !content.trim() : action === "invite" ? !email.trim() : !title.trim())} onClick={() => void submit()}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" />Saving...</> : action === "invite" ? <><MailPlus className="h-4 w-4" />Create invite</> : action === "report" ? "Generate" : "Add feedback"}</Button></div>
      </div>
    </div>,
    document.body
  ) : null;

  return <>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Button type="button" variant="secondary" className="gap-2" onClick={() => open("feedback")}><Plus className="h-4 w-4" />Add Feedback</Button>
      {canInvite && <Button type="button" variant="secondary" className="gap-2" onClick={() => open("invite")}><Users className="h-4 w-4" />Invite Member</Button>}
      {canReport && <Button type="button" variant="secondary" className="gap-2" onClick={() => open("report")}><Activity className="h-4 w-4" />Generate Report</Button>}
      <Button type="button" variant="secondary" className="gap-2" onClick={() => router.push("/settings")}><Settings className="h-4 w-4" />Settings</Button>
    </div>
    {dialog}
  </>;
}
