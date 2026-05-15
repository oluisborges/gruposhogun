"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { UserSummary } from "@/types";

interface UserFormProps {
  mode: "create" | "edit";
  user?: UserSummary & { active: boolean; createdAt: Date };
  currentUser: { id: string; role: string };
}

const TAGS = [
  { value: "MARMITARIA", label: "Marmitaria" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "GENERICA", label: "Genérica" },
] as const;

const ALL_ROLES = [
  { value: "OWNER", label: "Owner" },
  { value: "COORDINATOR", label: "Coordenador" },
  { value: "MANAGER", label: "Gerente" },
] as const;

export function UserForm({ mode, user, currentUser }: UserFormProps) {
  const router = useRouter();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>(user?.role ?? "MANAGER");
  const [tags, setTags] = useState<string[]>(
    user?.tags ? (user.tags as string[]) : []
  );
  const [active, setActive] = useState(user?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // COORDINATOR cannot see OWNER role option
  const availableRoles = ALL_ROLES.filter(
    (r) => !(currentUser.role === "COORDINATOR" && r.value === "OWNER")
  );

  const isEditingSelf = mode === "edit" && user?.id === currentUser.id;
  // Role field is disabled if editing self (nobody can change own role)
  const roleDisabled = isEditingSelf;

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body: Record<string, unknown> = { name, email, role, tags };

      if (mode === "create") {
        body.password = password;
      } else if (password) {
        body.password = password;
      }

      // Only OWNER can update active in edit mode
      if (mode === "edit" && currentUser.role === "OWNER" && !isEditingSelf) {
        body.active = active;
      }

      const url =
        mode === "create" ? "/api/users" : `/api/users/${user!.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Ocorreu um erro. Tente novamente.");
        return;
      }

      router.push("/dashboard/users");
      router.refresh();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
          required
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          required
        />
      </div>

      {/* Senha */}
      <div className="space-y-2">
        <Label htmlFor="password">
          Senha{mode === "create" ? "" : " (deixe em branco para manter a atual)"}
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "create" ? "Senha obrigatória" : "Nova senha (opcional)"}
          required={mode === "create"}
          autoComplete="new-password"
        />
      </div>

      {/* Papel */}
      <div className="space-y-2">
        <Label htmlFor="role">Papel</Label>
        <Select
          value={role}
          onValueChange={setRole}
          disabled={roleDisabled}
        >
          <SelectTrigger id="role" className={roleDisabled ? "opacity-50 cursor-not-allowed" : ""}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {roleDisabled && (
          <p className="text-xs text-neutral-500">Você não pode alterar seu próprio papel.</p>
        )}
      </div>

      {/* Tags */}
      <div className="space-y-3">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-4">
          {TAGS.map((tag) => (
            <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                id={`tag-${tag.value}`}
                checked={tags.includes(tag.value)}
                onCheckedChange={() => toggleTag(tag.value)}
              />
              <span className="text-sm text-neutral-300">{tag.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Ativo — OWNER only, hidden in create mode and when editing self */}
      {mode === "edit" && currentUser.role === "OWNER" && !isEditingSelf && (
        <div className="flex items-center gap-3">
          <Switch
            id="active"
            checked={active}
            onCheckedChange={setActive}
          />
          <Label htmlFor="active" className="cursor-pointer">
            {active ? "Ativo" : "Inativo"}
          </Label>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading
            ? mode === "create"
              ? "Criando..."
              : "Salvando..."
            : mode === "create"
              ? "Criar Usuário"
              : "Salvar Alterações"}
        </Button>
      </div>
    </form>
  );
}
