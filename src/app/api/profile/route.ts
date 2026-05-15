import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, email, currentPassword, newPassword } = body;

  const target = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, password: true, email: true },
  });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;

  if (email !== undefined && email !== target.email) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email já está em uso" }, { status: 409 });
    }
    updateData.email = email;
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Senha atual é obrigatória para alterar a senha" },
        { status: 400 }
      );
    }
    const valid = await bcrypt.compare(currentPassword, target.password);
    if (!valid) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 });
    }
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tags: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "UPDATE",
    entityType: "Profile",
    entityId: user.id,
    metadata: { fields: Object.keys(updateData).filter((k) => k !== "password") },
  });

  return NextResponse.json(updated);
}
