"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tags: string[];
  };
}

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  COORDINATOR: "Coordenador",
  MANAGER: "Gerente",
};

const TAG_LABELS: Record<string, string> = {
  MARMITARIA: "Marmitaria",
  DELIVERY: "Delivery",
  GENERICA: "Genérica",
};

export function ProfileForm({ user }: ProfileFormProps) {
  const { toast } = useToast();

  // Personal data section
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // Password section
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleInfoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInfoError(null);
    setInfoLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInfoError(data.error ?? "Erro ao salvar. Tente novamente.");
        return;
      }

      toast({ title: "Perfil atualizado com sucesso!" });
    } catch {
      setInfoError("Erro de conexão. Tente novamente.");
    } finally {
      setInfoLoading(false);
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error ?? "Erro ao alterar senha. Tente novamente.");
        return;
      }

      toast({ title: "Senha alterada com sucesso!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordError("Erro de conexão. Tente novamente.");
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* User info display */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-base font-bold text-red-400">
            {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
          </span>
        </div>
        <div>
          <p className="font-semibold text-white">{user.name}</p>
          <p className="text-sm text-neutral-400">{ROLE_LABELS[user.role] ?? user.role}</p>
          {user.tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {user.tags.map((tag) => (
                <span key={tag} className="text-xs text-neutral-500">
                  {TAG_LABELS[tag] ?? tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personal data */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Dados Pessoais</h2>
        <form onSubmit={handleInfoSubmit} className="space-y-4">
          {infoError && (
            <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {infoError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="profile-name">Nome</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={infoLoading}>
            {infoLoading ? "Salvando..." : "Salvar Dados"}
          </Button>
        </form>
      </section>

      <Separator className="bg-neutral-800" />

      {/* Change password */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Alterar Senha</h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && (
            <div className="rounded-md bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
              {passwordError}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha Atual</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Sua senha atual"
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" disabled={passwordLoading}>
            {passwordLoading ? "Alterando..." : "Alterar Senha"}
          </Button>
        </form>
      </section>
    </div>
  );
}
