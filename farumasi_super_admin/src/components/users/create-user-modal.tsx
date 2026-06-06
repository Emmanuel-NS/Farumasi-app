"use client";

import { useState } from "react";
import { Button, Input, Modal, Select } from "@/components/ui";
import { getApiError } from "@/lib/services/auth.service";
import { adminManagementService } from "@/lib/services/admin-management.service";
import { UserPlus, Copy, CheckCircle2 } from "lucide-react";

interface CreateUserModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  roleOptions: Array<{ value: string; label: string }>;
  title?: string;
}

export function CreateUserModal({
  open,
  onClose,
  onCreated,
  roleOptions,
  title = "Create user account",
}: CreateUserModalProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(roleOptions[0]?.value ?? "pharmacist");
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setRole(roleOptions[0]?.value ?? "pharmacist");
    setTempPassword("");
    setError(null);
    setResult(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await adminManagementService.createUser({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role,
        temporary_password: tempPassword.trim() || undefined,
      });
      setResult({ email: res.user.email, password: res.temporary_password });
      onCreated();
    } catch (err) {
      setError(getApiError(err, "Failed to create user"));
    } finally {
      setLoading(false);
    }
  }

  async function copyCredentials() {
    if (!result) return;
    const text = `Email: ${result.email}\nTemporary password: ${result.password}\nThey must set a new password on first login.`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={handleClose} title={title} size="md">
      {result ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-emerald-900">
              <p className="font-semibold">Account created</p>
              <p className="mt-1 text-emerald-800">
                Share the temporary password securely. The user must change it on first login.
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm font-mono">
            <p>
              <span className="text-slate-500">Email:</span> {result.email}
            </p>
            <p>
              <span className="text-slate-500">Temp password:</span> {result.password}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={copyCredentials}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy credentials"}
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input label="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)}>
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Input
            label="Temporary password (optional — auto-generated if blank)"
            type="text"
            value={tempPassword}
            onChange={(e) => setTempPassword(e.target.value)}
            placeholder="Min 8 characters"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              <UserPlus className="w-3.5 h-3.5" /> Create account
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
