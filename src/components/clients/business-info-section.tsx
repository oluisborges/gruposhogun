"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import type { Role } from "@prisma/client";

interface BusinessInfo {
  description?: string;
  notes?: string;
  horario?: string;
  ticketMedio?: string;
  regiao?: string;
  observacoes?: string;
}

interface BusinessInfoSectionProps {
  clientId: string;
  businessInfo: Record<string, string | undefined>;
  userRole: Role;
}

interface EditableFieldProps {
  label: string;
  value: string;
  fieldKey: keyof BusinessInfo;
  multiline?: boolean;
  canEdit: boolean;
  onSave: (key: keyof BusinessInfo, value: string) => Promise<void>;
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
  resize: "none",
};

function EditableField({ label, value, fieldKey, multiline, canEdit, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);
  const [hovered, setHovered] = useState(false);

  async function handleSave() {
    if (current === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await onSave(fieldKey, current);
    setSaving(false);
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      setCurrent(value);
      setEditing(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "#6e7a70" }}>
        {label}
      </p>
      {editing && canEdit ? (
        multiline ? (
          <textarea
            autoFocus
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            rows={3}
            disabled={saving}
            style={{ ...inputStyle, opacity: saving ? 0.5 : 1 }}
          />
        ) : (
          <input
            autoFocus
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={saving}
            style={{ ...inputStyle, opacity: saving ? 0.5 : 1 }}
          />
        )
      ) : (
        <div
          onClick={() => canEdit && setEditing(true)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            cursor: canEdit ? "pointer" : "default",
            padding: "4px 2px",
            borderRadius: 4,
            background: hovered && canEdit ? "rgba(125,193,40,0.05)" : "transparent",
            transition: "background .15s",
            minHeight: "1.75rem",
          }}
        >
          <p style={{ fontSize: 13, color: value ? "#e6efe8" : "#4a5450", flex: 1, fontStyle: value ? "normal" : "italic" }}>
            {value || (canEdit ? "Clique para editar" : "—")}
          </p>
          {canEdit && hovered && (
            <Pencil style={{ width: 12, height: 12, color: "#7DC128", flexShrink: 0 }} />
          )}
        </div>
      )}
    </div>
  );
}

export function BusinessInfoSection({ clientId, businessInfo, userRole }: BusinessInfoSectionProps) {
  const [info, setInfo] = useState<BusinessInfo>({
    description: businessInfo.description,
    notes: businessInfo.notes,
    horario: businessInfo.horario,
    ticketMedio: businessInfo.ticketMedio,
    regiao: businessInfo.regiao,
    observacoes: businessInfo.observacoes,
  });
  const canEdit = userRole === "OWNER" || userRole === "COORDINATOR";

  async function handleSave(key: keyof BusinessInfo, value: string) {
    const updated = { ...info, [key]: value };
    setInfo(updated);
    await fetch(`/api/clients/${clientId}/business-info`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <EditableField label="Descrição" value={info.description ?? ""} fieldKey="description" multiline canEdit={canEdit} onSave={handleSave} />
      </div>
      <EditableField label="Horário de Funcionamento" value={info.horario ?? ""} fieldKey="horario" canEdit={canEdit} onSave={handleSave} />
      <EditableField label="Ticket Médio" value={info.ticketMedio ?? ""} fieldKey="ticketMedio" canEdit={canEdit} onSave={handleSave} />
      <EditableField label="Região" value={info.regiao ?? ""} fieldKey="regiao" canEdit={canEdit} onSave={handleSave} />
      <div style={{ gridColumn: "1 / -1" }}>
        <EditableField label="Observações" value={info.observacoes ?? ""} fieldKey="observacoes" multiline canEdit={canEdit} onSave={handleSave} />
      </div>
    </div>
  );
}
