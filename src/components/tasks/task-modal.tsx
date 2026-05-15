"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { TaskStatus, TaskPriority } from "@prisma/client";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "A Fazer" },
  { value: "IN_PROGRESS", label: "Em Andamento" },
  { value: "DONE", label: "Concluído" },
  { value: "BLOCKED", label: "Bloqueado" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
];

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

interface LabelDraft {
  name: string;
  color: string;
}

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  task?: TaskWithRelations;
  defaultStatus?: TaskStatus;
  defaultClientId?: string;
  currentUser: UserSummary;
  clients: { id: string; name: string }[];
  users: UserSummary[];
  onSaved: () => void;
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  height: 34,
  fontSize: 13,
  background: "#0f1813",
  border: "1px solid #1f2a23",
  color: "#a8b3aa",
  borderRadius: 8,
  padding: "0 10px",
  outline: "none",
  cursor: "pointer",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: ".1em",
  color: "#6e7a70",
  marginBottom: 4,
};

export function TaskModal({
  open,
  onClose,
  task,
  defaultStatus = "TODO",
  defaultClientId,
  currentUser,
  clients,
  users,
  onSaved,
}: TaskModalProps) {
  const { toast } = useToast();
  const isPrivileged = currentUser.role === "OWNER" || currentUser.role === "COORDINATOR";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [assigneeId, setAssigneeId] = useState("");
  const [labels, setLabels] = useState<LabelDraft[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description ?? "");
        setStatus(task.status);
        setPriority(task.priority);
        setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "");
        setClientId(task.clientId ?? "");
        setAssigneeId(task.assigneeId ?? "");
        setLabels(task.labels.map((l) => ({ name: l.name, color: l.color })));
      } else {
        setTitle("");
        setDescription("");
        setStatus(defaultStatus);
        setPriority("MEDIUM");
        setDueDate("");
        setClientId(defaultClientId ?? "");
        setAssigneeId("");
        setLabels([]);
      }
      setNewLabelName("");
      setNewLabelColor(PRESET_COLORS[0]);
    }
  }, [open, task, defaultStatus, defaultClientId]);

  async function handleSave() {
    if (!title.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = task ? `/api/tasks/${task.id}` : "/api/tasks";
      const method = task ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description || null,
        status,
        priority,
        dueDate: dueDate || null,
        clientId: clientId || null,
        labels,
      };

      if (isPrivileged) {
        body.assigneeId = assigneeId || null;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Erro ao salvar");
      }

      toast({ title: task ? "Tarefa atualizada" : "Tarefa criada" });
      onSaved();
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function addLabel() {
    if (!newLabelName.trim()) return;
    setLabels((prev) => [...prev, { name: newLabelName.trim(), color: newLabelColor }]);
    setNewLabelName("");
  }

  function removeLabel(idx: number) {
    setLabels((prev) => prev.filter((_, i) => i !== idx));
  }

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} onClick={onClose} />
      <div style={{
        position: "relative",
        background: "#141f18",
        border: "1px solid #28342a",
        borderRadius: 10,
        width: "100%",
        maxWidth: 680,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #1f2a23", flexShrink: 0 }}>
          <h2 style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: ".02em",
            color: "#e6efe8",
            margin: 0,
          }}>
            {task ? "Editar Tarefa" : "Nova Tarefa"}
          </h2>
          <button onClick={onClose} style={{ padding: 6, background: "transparent", border: "none", color: "#6e7a70", cursor: "pointer", borderRadius: 6 }}>
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa..."
            style={{
              width: "100%",
              background: "transparent",
              fontSize: 17,
              fontWeight: 600,
              color: "#e6efe8",
              border: "none",
              borderBottom: "1px solid #1f2a23",
              paddingBottom: 8,
              outline: "none",
              boxSizing: "border-box",
            }}
          />

          {/* Two-column layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 16 }}>
            {/* Left: Description */}
            <div>
              <label style={labelStyle}>Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicionar descrição..."
                rows={6}
                style={{
                  width: "100%",
                  background: "#0f1813",
                  border: "1px solid #1f2a23",
                  borderRadius: 8,
                  color: "#a8b3aa",
                  fontSize: 13,
                  padding: "9px 14px",
                  outline: "none",
                  resize: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* Right: Properties */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} style={selectStyle}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Prioridade</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} style={selectStyle}>
                  {PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Prazo</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={selectStyle} />
              </div>
              <div>
                <label style={labelStyle}>Cliente</label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={selectStyle}>
                  <option value="">Sem cliente</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {isPrivileged && (
                <div>
                  <label style={labelStyle}>Responsável</label>
                  <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} style={selectStyle}>
                    <option value="">Sem responsável</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              )}

              {/* Labels */}
              <div>
                <label style={labelStyle}>Etiquetas</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                  {labels.map((label, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 10.5,
                        padding: "3px 7px",
                        borderRadius: 20,
                        backgroundColor: label.color + "33",
                        border: `1px solid ${label.color}55`,
                        color: label.color,
                        fontWeight: 700,
                      }}
                    >
                      {label.name}
                      <button onClick={() => removeLabel(idx)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "inherit", opacity: 0.8, lineHeight: 1 }}>
                        <X style={{ width: 10, height: 10 }} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
                    placeholder="Nova etiqueta"
                    style={{
                      flex: 1,
                      height: 28,
                      fontSize: 12,
                      background: "#0f1813",
                      border: "1px solid #1f2a23",
                      color: "#a8b3aa",
                      borderRadius: 6,
                      padding: "0 8px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={addLabel}
                    style={{
                      height: 28,
                      width: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#182219",
                      border: "1px solid #1f2a23",
                      color: "#7DC128",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <Plus style={{ width: 12, height: 12 }} />
                  </button>
                </div>
                <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewLabelColor(c)}
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        backgroundColor: c,
                        border: newLabelColor === c ? "2px solid #fff" : "2px solid transparent",
                        cursor: "pointer",
                        transform: newLabelColor === c ? "scale(1.2)" : "scale(1)",
                        transition: "transform .1s",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "14px 20px", borderTop: "1px solid #1f2a23", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #1f2a23",
              color: "#a8b3aa",
              background: "#0f1813",
              fontSize: 13,
              padding: "8px 14px",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: saving ? "#4a6a1a" : "#7DC128",
              color: "#0a1408",
              fontSize: 13,
              padding: "9px 16px",
              borderRadius: 8,
              fontWeight: 700,
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.8 : 1,
            }}
          >
            {saving ? "Salvando..." : (task ? "Atualizar" : "Criar Tarefa")}
          </button>
        </div>
      </div>
    </div>
  );
}
