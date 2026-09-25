"use client";

import { useState } from "react";
import { Download, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GenerateReportModal } from "@/components/generate-report-modal";

export function GenerateReportButton() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <Button 
        type="button" 
        variant="primary" 
        className="gap-2"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Generate Report
      </Button>
      <GenerateReportModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function ReportShareButton({ reportId, title }: { reportId: string; title: string }) {
  const [shared, setShared] = useState(false);
  async function share() {
    const url = `${window.location.origin}/reports#${reportId}`;
    try {
      await navigator.clipboard?.writeText(url);
      setShared(true);
      window.setTimeout(() => setShared(false), 1800);
    } catch {
      window.prompt(`Copy the link for “${title}”`, url);
    }
  }
  return <Button type="button" variant="secondary" size="sm" className="gap-2" onClick={() => void share()}><Share2 className="h-4 w-4" />{shared ? "Copied" : "Share"}</Button>;
}

export function ReportExportButton({ reportId, title }: { reportId: string; title: string; summary?: string }) {
  const [loading, setLoading] = useState(false);
  async function exportReport() {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/${reportId}/export`);
      if (!response.ok) throw new Error("Unable to export report");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }
  return <Button type="button" variant="secondary" size="sm" className="gap-2" disabled={loading} onClick={() => void exportReport()}><Download className="h-4 w-4" />{loading ? "Exporting..." : "Export PDF"}</Button>;
}
