"use client";

import { useState } from "react";
import { Plus, Trash2, ExternalLink, FileText, Link as LinkIcon } from "lucide-react";
import type { ClientAttachment, Role } from "@prisma/client";

interface AttachmentsSectionProps {
  clientId: string;
  attachments: ClientAttachment[];
  userRole: Role;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#0f1813",
  border: "1px solid #1f2a23",
  borderRadius: 8,
  color: "#e6efe8",
  fontSize: 13,
  padding: "9px 14px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".1em",
  color: "#6e7a70",
  marginBottom: 6,
};

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
      body: JSON.stringify({ name: formName.trim(), url: formUrl.trim() || "", type: formType }),
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {attachments.length === 0 && !showForm && (
        <p style={{ fontSize: 13, color: "#4a5450", fontStyle: "italic" }}>Nenhum anexo cadastrado</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {attachments.map((att) => (
          <div
            key={att.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#141f18",
              border: "1px solid #1f2a23",
              borderRadius: 10,
              padding: "10px 14px",
            }}
          >
            <div style={{ flexShrink: 0, color: att.type === "link" ? "#7DC128" : "#a8b3aa" }}>
              {att.type === "link" ? (
                <LinkIcon style={{ width: 15, height: 15 }} />
              ) : (
                <FileText style={{ width: 15, height: 15 }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#e6efe8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {att.name}
                </span>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 6px",
                  borderRadius: 20,
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: ".06em",
                  textTransform: "uppercase",
                  background: att.type === "link" ? "rgba(125,193,40,0.1)" : "#182219",
                  color: att.type === "link" ? "#7DC128" : "#6e7a70",
                }}>
                  {att.type === "link" ? "Link" : "Nota"}
                </span>
              </div>
              {att.url && att.type === "link" ? (
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#7DC128", marginTop: 2, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}
                >
                  <ExternalLink style={{ width: 11, height: 11, flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{att.url}</span>
                </a>
              ) : att.url ? (
                <p style={{ fontSize: 11, color: "#6e7a70", marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {att.url}
                </p>
              ) : null}
            </div>
            {canEdit && (
              <button
                onClick={() => handleDelete(att.id)}
                disabled={deletingId === att.id}
                style={{
                  padding: 4,
                  borderRadius: 4,
                  background: "transparent",
                  border: "none",
                  cursor: deletingId === att.id ? "not-allowed" : "pointer",
                  color: "#4a5450",
                  opacity: deletingId === att.id ? 0.5 : 1,
                  flexShrink: 0,
                }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#d85a4a")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
              >
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
        ))}
      </div>

      {canEdit && (
        showForm ? (
          <div style={{ background: "#141f18", border: "1px solid rgba(125,193,40,0.2)", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#e6efe8" }}>Novo Anexo</p>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input autoFocus value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do anexo" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Tipo</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["link", "note"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    style={{
                      flex: 1,
                      padding: "8px 4px",
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 8,
                      border: formType === t ? "1px solid rgba(125,193,40,0.3)" : "1px solid #1f2a23",
                      background: formType === t ? "rgba(125,193,40,0.1)" : "#0f1813",
                      color: formType === t ? "#7DC128" : "#6e7a70",
                      cursor: "pointer",
                      textTransform: "uppercase",
                      letterSpacing: ".06em",
                    }}
                  >
                    {t === "link" ? "Link" : "Nota"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>{formType === "link" ? "URL" : "Conteúdo da nota"}</label>
              {formType === "link" ? (
                <input value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." style={inputStyle} />
              ) : (
                <textarea value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="Texto da nota..." rows={3} style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }} />
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={saving || !formName.trim()}
                onClick={handleAdd}
                style={{
                  background: saving || !formName.trim() ? "#4a6a1a" : "#7DC128",
                  color: "#0a1408",
                  fontSize: 13,
                  padding: "9px 16px",
                  borderRadius: 8,
                  fontWeight: 700,
                  border: "none",
                  cursor: saving || !formName.trim() ? "not-allowed" : "pointer",
                  opacity: saving || !formName.trim() ? 0.7 : 1,
                }}
              >
                {saving ? "Salvando..." : "Adicionar"}
              </button>
              <button
                onClick={() => { setShowForm(false); setFormName(""); setFormUrl(""); }}
                style={{
                  border: "1px solid #1f2a23",
                  color: "#a8b3aa",
                  background: "#0f1813",
                  fontSize: 13,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: "100%",
              padding: "10px 0",
              border: "1px dashed #28342a",
              borderRadius: 10,
              fontSize: 13,
              color: "#6e7a70",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all .15s",
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = "#7DC128"; e.currentTarget.style.borderColor = "rgba(125,193,40,0.4)"; }}
            onMouseOut={(e) => { e.currentTarget.style.color = "#6e7a70"; e.currentTarget.style.borderColor = "#28342a"; }}
          >
            <Plus style={{ width: 14, height: 14 }} />
            Adicionar Anexo
          </button>
        )
      )}
    </div>
  );
}
