"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GenerateReportModalProps {
  open: boolean;
  onClose: () => void;
}

export function GenerateReportModal({ open, onClose }: GenerateReportModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    
    try {
      const body: Record<string, any> = { title: "Voice of Customer Report", period };
      
      if (periodStart && periodEnd) {
        body.periodStart = periodStart;
        body.periodEnd = periodEnd;
      }
      
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Report generation failed");
      }
      
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Voice of Customer Report</DialogTitle>
          <DialogDescription>
            Create a comprehensive AI-powered report with insights from your customer feedback.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Report Period
            </label>
            <select 
              className="input w-full"
              value={period}
              onChange={(e) => setPeriod(e.target.value as "weekly" | "monthly")}
            >
              <option value="weekly">Weekly (last 7 days)</option>
              <option value="monthly">Monthly (last 30 days)</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Start Date (optional)
              </label>
              <input
                type="date"
                className="input w-full"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                End Date (optional)
              </label>
              <input
                type="date"
                className="input w-full"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
          
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="primary" 
            onClick={() => void generate()} 
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}