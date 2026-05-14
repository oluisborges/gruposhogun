"use client";

import { useState } from "react";
import { Plus, Trash2, ExternalLink, FileText, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ClientAttachment, Role } from "@prisma/client";

interface AttachmentsSectionProps {
  clientId: string;
  attachments: ClientAttachment[];
  userRole: Role;
}

export function AttachmentsSection({ clientId, attachments: initialAttachments, userRole }: AttachmentsSectionProps) {
  const [attachments, setAttachments] = useState<ClientAttachment[]>(initialAttachments);
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<"link" | "note">("link");
  const [formUrl, setFormUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canEdit = userRole === "OWNER" || userRole === "COORDINATOR";

  async function handleAdd() {
    if (!formName.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}/attachments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName.trim(),
        url: formUrl.trim() || "",
        type: formType,
      }),
    });
    if (res.ok) {
      const created = await res.json() as ClientAttachment;
      setAttachments((prev) => [created, ...prev]);
      setFormName("");
      setFormUrl("");
      setFormType("link");
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleDelete(attachmentId: string) {
    if (!confirm("Remover este anexo?")) return;
    setDeletingId(attachmentId);
    await fetch(`/api/clients/${clientId}/attachments/${attachmentId}`, { method: "DELETE" });
    setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    setDeletingId(null);
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 && !showForm && (
        <p className="text-sm text-neutral-500 italic">Nenhum anexo cadastrado</p>
      )}

      <div className="space-y-2">
        {attachments.map((att) => (
          <div
            key={att.id}
            className="flex items-center gap-3 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2.5"
          >
            <div className="flex-shrink-0 text-neutral-500">
              {att.type === "link" ? (
                <LinkIcon className="w-4 h-4" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">{att.name}</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium",
                    att.type === "link"
                      ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                      : "border-neutral-600 text-neutral-400 bg-neutral-800"
                  )}
                >
                  {att.type === "link" ? "Link" : "Nota"}
                </span>
              </div>
              {att.url && att.type === "link" ? (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5 truncate"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{att.url}</span>
                </a>
              ) : att.url ? (
                <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{att.url}</p>
              ) : null}
            </div>
            {canEdit && (
              <button
                onClick={() => handleDelete(att.id)}
                disabled={deletingId === att.id}
                className="p-1 rounded text-neutral-600 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        showForm ? (
          <div className="bg-neutral-800/50 border border-red-500/30 rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-medium text-neutral-300">Novo Anexo</h4>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Nome *</Label>
              <Input
                autoFocus
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome do anexo"
                className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">Tipo</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFormType("link")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors",
                    formType === "link"
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : "bg-neutral-800 text-neutral-500 border-neutral-700"
                  )}
                >
                  Link
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("note")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium rounded-md border transition-colors",
                    formType === "note"
                      ? "bg-neutral-600/50 text-neutral-300 border-neutral-500"
                      : "bg-neutral-800 text-neutral-500 border-neutral-700"
                  )}
                >
                  Nota
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-neutral-400">
                {formType === "link" ? "URL" : "Conteúdo da nota"}
              </Label>
              {formType === "link" ? (
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://..."
                  className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 text-sm"
                />
              ) : (
                <textarea
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="Texto da nota..."
                  rows={3}
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-red-500/50"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={saving || !formName.trim()}
                onClick={handleAdd}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowForm(false); setFormName(""); setFormUrl(""); }}
                className="text-neutral-400 hover:text-white"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-2.5 border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Anexo
          </button>
        )
      )}
    </div>
  );
}
