"use client";

import { useState } from "react";
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

function EditableField({ label, value, fieldKey, multiline, canEdit, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);

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
    <div className="space-y-1">
      <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{label}</p>
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
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-red-500/50 disabled:opacity-50"
          />
        ) : (
          <input
            autoFocus
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50 disabled:opacity-50"
          />
        )
      ) : (
        <p
          onClick={() => canEdit && setEditing(true)}
          className={
            canEdit
              ? "text-sm text-neutral-300 cursor-pointer hover:text-white transition-colors min-h-[1.5rem] px-0.5 py-0.5 rounded hover:bg-neutral-800/50"
              : "text-sm text-neutral-300 min-h-[1.5rem]"
          }
        >
          {value || (
            <span className="text-neutral-600 italic">
              {canEdit ? "Clique para editar" : "—"}
            </span>
          )}
        </p>
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
      <div className="sm:col-span-2">
        <EditableField
          label="Descrição"
          value={info.description ?? ""}
          fieldKey="description"
          multiline
          canEdit={canEdit}
          onSave={handleSave}
        />
      </div>
      <EditableField
        label="Horário de Funcionamento"
        value={info.horario ?? ""}
        fieldKey="horario"
        canEdit={canEdit}
        onSave={handleSave}
      />
      <EditableField
        label="Ticket Médio"
        value={info.ticketMedio ?? ""}
        fieldKey="ticketMedio"
        canEdit={canEdit}
        onSave={handleSave}
      />
      <EditableField
        label="Região"
        value={info.regiao ?? ""}
        fieldKey="regiao"
        canEdit={canEdit}
        onSave={handleSave}
      />
      <div className="sm:col-span-2">
        <EditableField
          label="Observações"
          value={info.observacoes ?? ""}
          fieldKey="observacoes"
          multiline
          canEdit={canEdit}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
