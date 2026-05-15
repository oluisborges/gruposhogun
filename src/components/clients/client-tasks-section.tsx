"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskModal } from "@/components/tasks/task-modal";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { useToast } from "@/hooks/use-toast";
import type { TaskWithRelations, UserSummary } from "@/types";

interface ClientTasksSectionProps {
  clientId: string;
  clientName: string;
  currentUser: UserSummary;
  users: UserSummary[];
}

export function ClientTasksSection({
  clientId,
  clientName,
  currentUser,
  users,
}: ClientTasksSectionProps) {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithRelations | null>(null);

  const client = { id: clientId, name: clientName };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks?clientId=${clientId}`);
      if (!res.ok) throw new Error("Erro ao carregar tarefas");
      const data = await res.json() as TaskWithRelations[];
      setTasks(data);
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [clientId, toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  function handleTaskUpdated(updated: TaskWithRelations) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  }

  function handleTaskDeleted(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-400">
            {loading ? "Carregando..." : `${tasks.length} tarefa${tasks.length !== 1 ? "s" : ""}`}
          </span>
          <button
            onClick={fetchTasks}
            className="text-neutral-600 hover:text-neutral-400 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova Tarefa
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-neutral-600">
          <p className="text-sm">Nenhuma tarefa para este cliente</p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-3 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            + Criar primeira tarefa
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              currentUser={currentUser}
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      )}

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultClientId={clientId}
        currentUser={currentUser}
        clients={[client]}
        users={users}
        onSaved={() => {
          setModalOpen(false);
          fetchTasks();
        }}
      />

      <TaskDetailPanel
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        currentUser={currentUser}
        clients={[client]}
        users={users}
        onUpdated={handleTaskUpdated}
        onDeleted={handleTaskDeleted}
      />
    </div>
  );
}
