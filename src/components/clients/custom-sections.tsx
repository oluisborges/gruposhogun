"use client";

import { useState, useRef } from "react";
import { GripVertical, Trash2, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ClientSection } from "@prisma/client";
import type { Role } from "@prisma/client";

interface CustomSectionsProps {
  clientId: string;
  sections: ClientSection[];
  userRole: Role;
}

export function CustomSections({ clientId, sections: initialSections, userRole }: CustomSectionsProps) {
  const [sections, setSections] = useState<ClientSection[]>(initialSections);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragItemId = useRef<string | null>(null);

  const canEdit = userRole === "OWNER" || userRole === "COORDINATOR";

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), content: newContent || undefined }),
    });
    if (res.ok) {
      const created = await res.json() as ClientSection;
      setSections((prev) => [...prev, created]);
    }
    setNewTitle("");
    setNewContent("");
    setAdding(false);
    setSaving(false);
  }

  async function handleUpdateField(sectionId: string, key: "title" | "content", value: string) {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, [key]: value } : s))
    );
    await fetch(`/api/clients/${clientId}/sections/${sectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
  }

  async function handleDelete(sectionId: string) {
    if (!confirm("Deseja remover esta seção?")) return;
    await fetch(`/api/clients/${clientId}/sections/${sectionId}`, { method: "DELETE" });
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  function handleDragStart(id: string) {
    dragItemId.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    setDragOverId(id);
  }

  async function handleDrop(targetId: string) {
    const fromId = dragItemId.current;
    if (!fromId || fromId === targetId) {
      setDragOverId(null);
      return;
    }

    const fromIdx = sections.findIndex((s) => s.id === fromId);
    const toIdx = sections.findIndex((s) => s.id === targetId);

    if (fromIdx === -1 || toIdx === -1) {
      setDragOverId(null);
      return;
    }

    const reordered = [...sections];
    const [removed] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, removed);

    const withOrder = reordered.map((s, i) => ({ ...s, order: i }));
    setSections(withOrder);
    setDragOverId(null);
    dragItemId.current = null;

    await fetch(`/api/clients/${clientId}/sections/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sections: withOrder.map((s) => ({ id: s.id, order: s.order })) }),
    });
  }

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <div
          key={section.id}
          draggable={canEdit}
          onDragStart={() => handleDragStart(section.id)}
          onDragOver={(e) => handleDragOver(e, section.id)}
          onDrop={() => handleDrop(section.id)}
          onDragLeave={() => setDragOverId(null)}
          className={`bg-neutral-800/50 border rounded-lg overflow-hidden transition-all ${
            dragOverId === section.id
              ? "border-red-500/50 bg-red-500/5"
              : "border-neutral-700/50"
          }`}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-700/50">
            {canEdit && (
              <GripVertical className="w-4 h-4 text-neutral-600 cursor-grab flex-shrink-0" />
            )}
            <SectionTitleInput
              value={section.title}
              canEdit={canEdit}
              onSave={(v) => handleUpdateField(section.id, "title", v)}
            />
            {canEdit && (
              <button
                onClick={() => handleDelete(section.id)}
                className="p-1 rounded text-neutral-600 hover:text-red-400 transition-colors flex-shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="px-3 py-3">
            <SectionContentInput
              value={section.content ?? ""}
              canEdit={canEdit}
              onSave={(v) => handleUpdateField(section.id, "content", v)}
            />
          </div>
        </div>
      ))}

      {canEdit && (
        adding ? (
          <div className="bg-neutral-800/50 border border-red-500/30 rounded-lg p-3 space-y-3">
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título da seção"
              className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-500"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Conteúdo (opcional)"
              rows={3}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-neutral-500 resize-none focus:outline-none focus:border-red-500/50"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={saving || !newTitle.trim()}
                onClick={handleAdd}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Adicionar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setAdding(false); setNewTitle(""); setNewContent(""); }}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full py-2.5 border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-500 hover:text-neutral-300 hover:border-neutral-600 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar Seção
          </button>
        )
      )}
    </div>
  );
}

function SectionTitleInput({
  value,
  canEdit,
  onSave,
}: {
  value: string;
  canEdit: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);

  function save() {
    if (current.trim()) onSave(current.trim());
    else setCurrent(value);
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") { setCurrent(value); setEditing(false); }
        }}
        className="flex-1 bg-transparent border-b border-red-500/50 text-sm font-medium text-white focus:outline-none"
      />
    );
  }

  return (
    <p
      onClick={() => canEdit && setEditing(true)}
      className={`flex-1 text-sm font-medium text-white ${canEdit ? "cursor-pointer" : ""}`}
    >
      {value}
    </p>
  );
}

function SectionContentInput({
  value,
  canEdit,
  onSave,
}: {
  value: string;
  canEdit: boolean;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(value);

  function save() {
    onSave(current);
    setEditing(false);
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Escape") { setCurrent(value); setEditing(false); }
        }}
        rows={4}
        className="w-full bg-neutral-900 border border-neutral-700 rounded-md px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-red-500/50"
      />
    );
  }

  return (
    <p
      onClick={() => canEdit && setEditing(true)}
      className={`text-sm text-neutral-400 whitespace-pre-wrap ${canEdit ? "cursor-pointer hover:text-neutral-300 transition-colors min-h-[2rem]" : "min-h-[1rem]"}`}
    >
      {value || (canEdit ? <span className="text-neutral-600 italic">Clique para adicionar conteúdo</span> : "—")}
    </p>
  );
}
