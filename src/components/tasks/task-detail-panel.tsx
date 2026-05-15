"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2, Plus, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatting";
import { formatBRTDate, formatBRTDateTime } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithRelations, UserSummary } from "@/types";
import type { TaskStatus, TaskPriority, TaskComment, TaskLabel } from "@prisma/client";

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

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  LOW: "bg-neutral-500/20 text-neutral-400 border-neutral-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  URGENT: "bg-red-500/20 text-red-400 border-red-500/30",
};

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

type CommentWithUser = TaskComment & { user: { id: string; name: string } };

interface TaskDetailPanelProps {
  task: TaskWithRelations | null;
  onClose: () => void;
  currentUser: UserSummary;
  clients: { id: string; name: string }[];
  users: UserSummary[];
  onUpdated: (task: TaskWithRelations) => void;
  onDeleted: (taskId: string) => void;
}

export function TaskDetailPanel({
  task,
  onClose,
  currentUser,
  clients,
  users,
  onUpdated,
  onDeleted,
}: TaskDetailPanelProps) {
  const { toast } = useToast();
  const isPrivileged = currentUser.role === "OWNER" || currentUser.role === "COORDINATOR";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [labels, setLabels] = useState<TaskLabel[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setLabels(task.labels);
      setComments(task.comments);
      setNewComment("");
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function patchTask(data: Record<string, unknown>): Promise<TaskWithRelations | null> {
    if (!task) return null;
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Erro ao atualizar");
      }
      const updated = await res.json() as TaskWithRelations;
      onUpdated(updated);
      return updated;
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
      return null;
    }
  }

  async function handleTitleBlur() {
    if (!task || title.trim() === task.title) return;
    if (!title.trim()) { setTitle(task.title); return; }
    await patchTask({ title: title.trim() });
  }

  async function handleDescriptionBlur() {
    if (!task) return;
    const val = description;
    const prev = task.description ?? "";
    if (val === prev) return;
    await patchTask({ description: val });
  }

  async function handleFieldChange(field: string, value: string | null) {
    await patchTask({ [field]: value });
  }

  async function handleLabelsChange(newLabels: { name: string; color: string }[]) {
    const updated = await patchTask({ labels: newLabels });
    if (updated) setLabels(updated.labels);
  }

  function addLabel() {
    if (!newLabelName.trim()) return;
    const updated = [...labels.map((l) => ({ name: l.name, color: l.color })), { name: newLabelName.trim(), color: newLabelColor }];
    handleLabelsChange(updated);
    setNewLabelName("");
  }

  function removeLabel(labelId: string) {
    const updated = labels.filter((l) => l.id !== labelId).map((l) => ({ name: l.name, color: l.color }));
    handleLabelsChange(updated);
  }

  async function handleSendComment() {
    if (!task || !newComment.trim()) return;
    setSendingComment(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      });
      if (!res.ok) throw new Error("Erro ao enviar comentário");
      const comment = await res.json() as CommentWithUser;
      setComments((prev) => [...prev, comment]);
      setNewComment("");
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setSendingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!task) return;
    try {
      const res = await fetch(`/api/tasks/${task.id}/comments/${commentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar comentário");
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (!task || !confirm(`Deletar tarefa "${task.title}"?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao deletar");
      toast({ title: "Tarefa deletada" });
      onDeleted(task.id);
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  }

  if (!task) return null;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "DONE";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-neutral-900 border-l border-neutral-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-neutral-800 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full bg-transparent text-base font-semibold text-white focus:outline-none border-b border-transparent focus:border-neutral-600 pb-0.5"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPrivileged && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-neutral-500 hover:text-red-400 transition-colors disabled:opacity-50"
                title="Deletar tarefa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Properties */}
          <div className="px-5 py-4 border-b border-neutral-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-neutral-500 mb-1">Status</p>
                <select
                  value={task.status}
                  onChange={(e) => handleFieldChange("status", e.target.value)}
                  className="w-full h-8 text-sm bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs text-neutral-500 mb-1">Prioridade</p>
                <select
                  value={task.priority}
                  onChange={(e) => handleFieldChange("priority", e.target.value)}
                  className={cn(
                    "w-full h-8 text-sm bg-neutral-800 border rounded-md px-2 focus:outline-none",
                    PRIORITY_COLORS[task.priority]
                  )}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs text-neutral-500 mb-1">Prazo</p>
                <input
                  type="date"
                  defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => handleFieldChange("dueDate", e.target.value || null)}
                  className={cn(
                    "w-full h-8 text-sm bg-neutral-800 border border-neutral-700 rounded-md px-2 focus:outline-none",
                    isOverdue ? "text-red-400 border-red-500/40" : "text-neutral-300"
                  )}
                />
              </div>

              <div>
                <p className="text-xs text-neutral-500 mb-1">Cliente</p>
                <select
                  value={task.clientId ?? ""}
                  onChange={(e) => handleFieldChange("clientId", e.target.value || null)}
                  className="w-full h-8 text-sm bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none"
                >
                  <option value="">Sem cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {isPrivileged && (
                <div className="col-span-2">
                  <p className="text-xs text-neutral-500 mb-1">Responsável</p>
                  <select
                    value={task.assigneeId ?? ""}
                    onChange={(e) => handleFieldChange("assigneeId", e.target.value || null)}
                    className="w-full h-8 text-sm bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-md px-2 focus:outline-none"
                  >
                    <option value="">Sem responsável</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {task.createdBy && (
                <div>
                  <p className="text-xs text-neutral-500 mb-1">Criado por</p>
                  <p className="text-sm text-neutral-400">{task.createdBy.name}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-neutral-500 mb-1">Criado em</p>
                <p className="text-sm text-neutral-400">{formatBRTDate(task.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-5 py-4 border-b border-neutral-800">
            <p className="text-xs text-neutral-500 mb-2">Descrição</p>
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              placeholder="Adicionar descrição..."
              rows={4}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
            />
          </div>

          {/* Labels */}
          <div className="px-5 py-4 border-b border-neutral-800">
            <p className="text-xs text-neutral-500 mb-2">Etiquetas</p>
            <div className="flex flex-wrap gap-1 mb-2">
              {labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: label.color + "33", border: `1px solid ${label.color}55`, color: label.color }}
                >
                  {label.name}
                  <button onClick={() => removeLabel(label.id)} className="hover:opacity-70">
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
                    "w-4 h-4 rounded-full transition-transform",
                    newLabelColor === c ? "scale-125 ring-2 ring-white ring-offset-1 ring-offset-neutral-800" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Comments */}
          <div className="px-5 py-4">
            <p className="text-xs text-neutral-500 mb-3">
              Comentários ({comments.length})
            </p>

            <div className="space-y-3 mb-4">
              {comments.map((comment) => {
                const canDeleteComment =
                  isPrivileged || comment.userId === currentUser.id;
                return (
                  <div key={comment.id} className="flex gap-2 group">
                    <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                      {initials(comment.user.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-neutral-300">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-neutral-600">
                          {formatBRTDateTime(comment.createdAt)}
                        </span>
                        {canDeleteComment && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="ml-auto opacity-0 group-hover:opacity-100 text-neutral-600 hover:text-red-400 transition-all"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-neutral-400 whitespace-pre-wrap break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                );
              })}

              {comments.length === 0 && (
                <p className="text-xs text-neutral-600 text-center py-4">
                  Nenhum comentário ainda
                </p>
              )}
            </div>

            {/* Comment input */}
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
                {initials(currentUser.name)}
              </div>
              <div className="flex-1 flex gap-1.5">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  placeholder="Adicionar comentário... (Ctrl+Enter para enviar)"
                  rows={2}
                  className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-300 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-500 resize-none"
                />
                <button
                  onClick={handleSendComment}
                  disabled={sendingComment || !newComment.trim()}
                  className="self-end h-8 w-8 flex items-center justify-center bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
