"use client";

import { useState } from "react";
import { Loader2, MailPlus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Member = { id: string; name: string; email: string; role: "ADMIN" | "ANALYST" | "VIEWER" };

export function TeamManagement({ members, currentUserId }: { members: Member[]; currentUserId: string }) {
  const [rows, setRows] = useState(members);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Member["role"]>("ANALYST");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(url: string, method: "POST" | "PATCH" | "DELETE", body: Record<string, string>) {
    const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  async function invite() {
    setBusy("invite"); setError(""); setMessage("");
    try {
      const data = await request("/api/workspace/members", "POST", { email, role });
      setMessage(`Invitation email sent to ${data.email}.`);
      setEmail("");
      setInviteOpen(false);
    } catch (inviteError) { setError(inviteError instanceof Error ? inviteError.message : "Unable to create invitation"); } finally { setBusy(""); }
  }

  async function changeRole(memberId: string, nextRole: Member["role"]) {
    setBusy(memberId); setError(""); setMessage("");
    try { await request("/api/workspace/members", "PATCH", { memberId, role: nextRole }); setRows((current) => current.map((member) => member.id === memberId ? { ...member, role: nextRole } : member)); setMessage("Member role updated."); }
    catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Unable to update role"); } finally { setBusy(""); }
  }

  async function remove(memberId: string) {
    if (!window.confirm("Remove this member from the workspace?")) return;
    setBusy(memberId); setError(""); setMessage("");
    try { await request("/api/workspace/members", "DELETE", { memberId }); setRows((current) => current.filter((member) => member.id !== memberId)); setMessage("Member removed."); }
    catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Unable to remove member"); } finally { setBusy(""); }
  }

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
      <Button type="button" variant="primary" size="sm" className="gap-2" onClick={() => setInviteOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Invite Member
      </Button>
    </div>
    
    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</div>}
    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
    
    <div className="space-y-3">{rows.map((member) => <div key={member.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
      <div><div className="font-semibold text-slate-900">{member.name}</div><div className="text-sm text-slate-500">{member.email}</div></div>
      <div className="flex items-center gap-2">
        <Badge variant={member.role === "ADMIN" ? "role-admin" : member.role === "ANALYST" ? "role-analyst" : "role-viewer"}>{member.role}</Badge>
        {member.id !== currentUserId && <><select aria-label={`Role for ${member.name}`} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs" value={member.role} disabled={busy === member.id} onChange={(event) => void changeRole(member.id, event.target.value as Member["role"])}><option value="ADMIN">Admin</option><option value="ANALYST">Analyst</option><option value="VIEWER">Viewer</option></select><button type="button" aria-label={`Remove ${member.name}`} onClick={() => void remove(member.id)} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">{busy === member.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></>}
      </div>
    </div>)}</div>
    
    <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join your workspace. They will receive an email with setup instructions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Email Address
            </label>
            <input 
              className="input w-full"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@company.com"
              type="email"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Role
            </label>
            <select 
              className="input w-full"
              value={role}
              onChange={(event) => setRole(event.target.value as Member["role"])}
            >
              <option value="ADMIN">Admin - Full access</option>
              <option value="ANALYST">Analyst - Create and manage feedback</option>
              <option value="VIEWER">Viewer - Read-only access</option>
            </select>
          </div>
          
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => setInviteOpen(false)} disabled={busy === "invite"}>
            Cancel
          </Button>
          <Button 
            type="button" 
            variant="primary" 
            onClick={() => void invite()} 
            disabled={!email || busy === "invite"}
            className="gap-2"
          >
            {busy === "invite" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MailPlus className="h-4 w-4" />
                Send Invitation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
