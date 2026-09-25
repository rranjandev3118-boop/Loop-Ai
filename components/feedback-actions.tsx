"use client";

import { useRef, useState } from "react";
import { Loader2, MessageSquarePlus, Radio, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function FeedbackActions() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"add" | "csv" | "simulate" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function addFeedback() {
    const content = window.prompt("Paste the customer feedback:");
    if (!content?.trim()) return;
    const channel = window.prompt("Channel:", "Manual entry");
    if (!channel?.trim()) return;
    setBusy("add");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, channel })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to add feedback");
      setMessage("Feedback added and classified.");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add feedback");
    } finally {
      setBusy(null);
    }
  }

  async function importCsv(file: File) {
    setBusy("csv");
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/feedback/import", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to import CSV");
      setMessage(`Imported ${data.imported} feedback item${data.imported === 1 ? "" : "s"}. ${data.failed} row${data.failed === 1 ? "" : "s"} failed.`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to import CSV");
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function simulate() {
    const confirmed = window.confirm("Generate 5 realistic support tickets and classify them into this workspace?");
    if (!confirmed) return;
    setBusy("simulate");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/feedback/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to generate simulated feedback");
      setMessage(`Generated ${data.created} support ticket${data.created === 1 ? "" : "s"}, classified and added to the inbox${data.failed ? `. ${data.failed} item${data.failed === 1 ? "" : "s"} could not be classified and was skipped.` : "."}`);
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate simulated feedback");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" className="gap-2" disabled={busy !== null} onClick={() => void addFeedback()}>
          <MessageSquarePlus className="h-4 w-4" /> Add feedback
        </Button>
        <Button type="button" variant="secondary" className="gap-2" disabled={busy !== null} onClick={() => fileInput.current?.click()}>
          {busy === "csv" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Import CSV
        </Button>
        <input
          ref={fileInput}
          className="hidden"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importCsv(file);
          }}
        />
        <Button type="button" variant="secondary" className="group gap-2 border-violet-200 bg-violet-50/70 text-violet-700 hover:border-violet-300 hover:bg-violet-100" disabled={busy !== null} onClick={() => void simulate()}>
          {busy === "simulate" ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</> : <><span className="relative flex h-4 w-4 items-center justify-center"><Radio className="h-4 w-4 transition group-hover:scale-110" /><span className="absolute h-1.5 w-1.5 rounded-full bg-violet-500" /></span> Generate sample tickets</>}
        </Button>
      </div>
      {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}
