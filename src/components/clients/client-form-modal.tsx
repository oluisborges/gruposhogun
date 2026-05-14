"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ClientTag } from "@prisma/client";
import type { UserSummary } from "@/types/index";

const TAG_OPTIONS: { value: ClientTag; label: string }[] = [
  { value: "MARMITARIA", label: "Marmitaria" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "GENERICA", label: "Genérica" },
];

// Minimal client shape needed by the form
interface ClientFormData {
  id: string;
  name: string;
  tag: ClientTag;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  usesPix: boolean;
  pixValue: number | null;
  managers: { userId: string }[];
}

interface ClientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: ClientFormData;
  onSuccess: () => void;
}

export function ClientFormModal({
  open,
  onOpenChange,
  client,
  onSuccess,
}: ClientFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<UserSummary[]>([]);
  const [error, setError] = useState("");

  const [name, setName] = useState(client?.name ?? "");
  const [tag, setTag] = useState<ClientTag>(client?.tag ?? "GENERICA");
  const [contactName, setContactName] = useState(client?.contactName ?? "");
  const [contactPhone, setContactPhone] = useState(client?.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(client?.contactEmail ?? "");
  const [usesPix, setUsesPix] = useState(client?.usesPix ?? false);
  const [pixValue, setPixValue] = useState(client?.pixValue?.toString() ?? "");
  const [selectedManagerIds, setSelectedManagerIds] = useState<string[]>(
    client?.managers.map((m) => m.userId) ?? []
  );

  useEffect(() => {
    if (open) {
      fetch("/api/users?role=MANAGER")
        .then((r) => r.json())
        .then((data: UserSummary[]) => setManagers(data))
        .catch(() => setManagers([]));
    }
  }, [open]);

  // Reset form when client changes
  useEffect(() => {
    setName(client?.name ?? "");
    setTag(client?.tag ?? "GENERICA");
    setContactName(client?.contactName ?? "");
    setContactPhone(client?.contactPhone ?? "");
    setContactEmail(client?.contactEmail ?? "");
    setUsesPix(client?.usesPix ?? false);
    setPixValue(client?.pixValue?.toString() ?? "");
    setSelectedManagerIds(client?.managers.map((m) => m.userId) ?? []);
    setError("");
  }, [client, open]);

  function toggleManager(id: string) {
    setSelectedManagerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }

    setLoading(true);
    setError("");

    const body = {
      name: name.trim(),
      tag,
      contactName: contactName || undefined,
      contactPhone: contactPhone || undefined,
      contactEmail: contactEmail || undefined,
      usesPix,
      pixValue: usesPix && pixValue ? parseFloat(pixValue) : undefined,
      managerIds: selectedManagerIds,
    };

    try {
      const url = client ? `/api/clients/${client.id}` : "/api/clients";
      const method = client ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json() as { error: string };
        setError(data.error ?? "Erro ao salvar cliente");
        return;
      }

      onSuccess();
    } catch {
      setError("Erro ao salvar cliente");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">
            {client ? "Editar Cliente" : "Novo Cliente"}
          </h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 rounded text-neutral-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-3 py-2 rounded-md">
              {error}
            </div>
          )}

          {/* Nome */}
          <div className="space-y-1.5">
            <Label className="text-neutral-300">Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              required
            />
          </div>

          {/* Tag */}
          <div className="space-y-1.5">
            <Label className="text-neutral-300">Segmento</Label>
            <div className="flex gap-2">
              {TAG_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTag(opt.value)}
                  className={cn(
                    "flex-1 py-2 text-xs font-medium rounded-md border transition-colors",
                    tag === opt.value
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:border-neutral-600"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <Label className="text-neutral-300">Contato</Label>
            <Input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Nome do contato"
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
            <Input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="Telefone"
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
            <Input
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="E-mail"
              type="email"
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>

          {/* PIX */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={usesPix}
                onClick={() => setUsesPix(!usesPix)}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors",
                  usesPix ? "bg-red-500 border-red-500" : "bg-neutral-700 border-neutral-700"
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform",
                    usesPix ? "translate-x-4" : "translate-x-0.5"
                  )}
                />
              </button>
              <Label className="text-neutral-300 cursor-pointer" onClick={() => setUsesPix(!usesPix)}>
                Usa PIX semanal
              </Label>
            </div>
            {usesPix && (
              <Input
                value={pixValue}
                onChange={(e) => setPixValue(e.target.value)}
                placeholder="Valor PIX (R$)"
                type="number"
                step="0.01"
                min="0"
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            )}
          </div>

          {/* Managers */}
          {managers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-neutral-300">Gestores</Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {managers.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-neutral-800 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedManagerIds.includes(m.id)}
                      onChange={() => toggleManager(m.id)}
                      className="rounded border-neutral-700 bg-neutral-800 text-red-500 focus:ring-red-500/30"
                    />
                    <span className="text-sm text-neutral-300">{m.name}</span>
                    <span className="text-xs text-neutral-600 ml-auto">{m.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-neutral-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {loading ? "Salvando..." : client ? "Salvar" : "Criar Cliente"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
