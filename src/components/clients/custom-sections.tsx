"use client";

import { useState, useRef } from "react";
import { GripVertical, Trash2, Plus, Check, X } from "lucide-react";
import type { ClientSection } from "@prisma/client";
import type { Role } from "@prisma/client";

interface CustomSectionsProps {
  clientId: string;
  sections: ClientSection[];
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "none",
  fontFamily: "inherit",
};

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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {sections.map((section) => (
        <div
          key={section.id}
          draggable={canEdit}
          onDragStart={() => handleDragStart(section.id)}
          onDragOver={(e) => handleDragOver(e, section.id)}
          onDrop={() => handleDrop(section.id)}
          onDragLeave={() => setDragOverId(null)}
          style={{
            background: "#141f18",
            border: `1px solid ${dragOverId === section.id ? "rgba(125,193,40,0.3)" : "#1f2a23"}`,
            borderRadius: 10,
            overflow: "hidden",
            transition: "border-color .15s",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: "1px solid #1f2a23",
            background: dragOverId === section.id ? "rgba(125,193,40,0.04)" : "#182219",
          }}>
            {canEdit && (
              <GripVertical style={{ width: 16, height: 16, color: "#7DC128", cursor: "grab", flexShrink: 0 }} />
            )}
            <SectionTitleInput
              value={section.title}
              canEdit={canEdit}
              onSave={(v) => handleUpdateField(section.id, "title", v)}
            />
            {canEdit && (
              <button
                onClick={() => handleDelete(section.id)}
                style={{ padding: 4, borderRadius: 4, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, color: "#4a5450" }}
                onMouseOver={(e) => (e.currentTarget.style.color = "#d85a4a")}
                onMouseOut={(e) => (e.currentTarget.style.color = "#4a5450")}
              >
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            )}
          </div>
          <div style={{ padding: 14 }}>
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
          <div style={{ background: "#141f18", border: "1px solid rgba(125,193,40,0.2)", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Título da seção"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Conteúdo (opcional)"
              rows={3}
              style={textareaStyle}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button
                disabled={saving || !newTitle.trim()}
                onClick={handleAdd}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: saving || !newTitle.trim() ? "#4a6a1a" : "#7DC128",
                  color: "#0a1408",
                  fontSize: 13,
                  padding: "8px 14px",
                  borderRadius: 8,
                  fontWeight: 700,
                  border: "none",
                  cursor: saving || !newTitle.trim() ? "not-allowed" : "pointer",
                  opacity: saving || !newTitle.trim() ? 0.7 : 1,
                }}
              >
                <Check style={{ width: 13, height: 13 }} />
                Adicionar
              </button>
              <button
                onClick={() => { setAdding(false); setNewTitle(""); setNewContent(""); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  border: "1px solid #1f2a23",
                  color: "#a8b3aa",
                  background: "#0f1813",
                  fontSize: 13,
                  padding: "8px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                <X style={{ width: 13, height: 13 }} />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
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
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          borderBottom: "1px solid rgba(125,193,40,0.4)",
          color: "#e6efe8",
          fontSize: 13,
          fontWeight: 600,
          outline: "none",
          padding: "2px 0",
        }}
      />
    );
  }

  return (
    <p
      onClick={() => canEdit && setEditing(true)}
      style={{
        flex: 1,
        fontSize: 13,
        fontWeight: 600,
        color: "#e6efe8",
        cursor: canEdit ? "pointer" : "default",
      }}
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
        style={{
          width: "100%",
          background: "#0f1813",
          border: "1px solid #1f2a23",
          borderRadius: 8,
          color: "#e6efe8",
          fontSize: 13,
          padding: "9px 14px",
          outline: "none",
          resize: "none",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
    );
  }

  return (
    <p
      onClick={() => canEdit && setEditing(true)}
      style={{
        fontSize: 13,
        color: value ? "#a8b3aa" : "#4a5450",
        whiteSpace: "pre-wrap",
        cursor: canEdit ? "pointer" : "default",
        minHeight: "2rem",
        fontStyle: value ? "normal" : "italic",
        transition: "color .15s",
      }}
      onMouseOver={(e) => { if (canEdit) e.currentTarget.style.color = "#e6efe8"; }}
      onMouseOut={(e) => { if (canEdit) e.currentTarget.style.color = value ? "#a8b3aa" : "#4a5450"; }}
    >
      {value || (canEdit ? "Clique para adicionar conteúdo" : "—")}
    </p>
  );
}
