"use client";

import { useState, useEffect } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 flex-shrink-0">
          <h2 className="text-base font-semibold text-white">
            {task ? "Editar Tarefa" : "Nova Tarefa"}
          </h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da tarefa..."
            className="w-full bg-transparent text-lg font-semibold text-white placeholder:text-neutral-600 border-b border-neutral-700 pb-2 focus:outline-none focus:border-neutral-500"
          />

          {/* Two-column layout */}
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            {/* Left: Description */}
            <div className="sm:col-span-3">
              <label className="block text-xs text-neutral-500 mb-1.5">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Adicionar descrição..."
                rows={6}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
              />
            </div>

            {/* Right: Sidebar */}
            <div className="sm:col-span-2 space-y-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="w-full h-8 text-sm bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-500 mb-1">Prioridade</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full h-8 text-sm bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-neutral-500 mb-1">Prazo</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full h-8 text-sm bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-500 mb-1">Cliente</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full h-8 text-sm bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none"
                >
                  <option value="">Sem cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {isPrivileged && (
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">Responsável</label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full h-8 text-sm bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none"
                  >
                    <option value="">Sem responsável</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Labels */}
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Etiquetas</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {labels.map((label, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: label.color + "33", border: `1px solid ${label.color}55`, color: label.color }}
                    >
                      {label.name}
                      <button onClick={() => removeLabel(idx)} className="hover:opacity-70">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  <input
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addLabel())}
                    placeholder="Nova etiqueta"
                    className="flex-1 h-7 text-xs bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 placeholder:text-neutral-600 focus:outline-none"
                  />
                  <button
                    onClick={addLabel}
                    className="h-7 px-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-md transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setNewLabelColor(c)}
                      className={cn(
                        "w-5 h-5 rounded-full transition-transform",
                        newLabelColor === c ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-neutral-800" : "hover:scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-neutral-800 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : (task ? "Atualizar" : "Criar Tarefa")}
          </button>
        </div>
      </div>
    </div>
  );
}
