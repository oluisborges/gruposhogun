import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

const safeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  tags: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // MANAGER can only view self
  if (user.role === "MANAGER" && user.id !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: safeSelect });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  return NextResponse.json(target);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const target = await prisma.user.findUnique({ where: { id }, select: safeSelect });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  // Permission checks
  if (user.role === "MANAGER") {
    if (user.id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (user.role === "COORDINATOR") {
    if (target.role === "OWNER") {
      return NextResponse.json({ error: "Coordenadores não podem editar Owners" }, { status: 403 });
    }
  }

  const body = await request.json();
  const { name, email, password, role: newRole, tags, active } = body;

  // Nobody can change their own role
  if (user.id === id && newRole !== undefined && newRole !== target.role) {
    return NextResponse.json({ error: "Você não pode alterar seu próprio papel" }, { status: 403 });
  }

  // COORDINATOR cannot set role to OWNER
  if (user.role === "COORDINATOR" && newRole === "OWNER") {
    return NextResponse.json({ error: "Coordenadores não podem definir papel de Owner" }, { status: 403 });
  }

  // MANAGER can only edit name, email, password
  const updateData: Record<string, unknown> = {};

  if (name !== undefined) updateData.name = name;
  if (email !== undefined) {
    // Check email uniqueness
    if (email !== target.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email já está em uso" }, { status: 409 });
      }
    }
    updateData.email = email;
  }
  if (password !== undefined && password !== "") {
    updateData.password = await bcrypt.hash(password, 12);
  }

  // Only OWNER/COORDINATOR can update role, tags, active
  if (user.role !== "MANAGER") {
    if (newRole !== undefined) updateData.role = newRole;
    if (tags !== undefined) updateData.tags = tags;
    if (active !== undefined) updateData.active = active;
  }

  const updated = await prisma.user.update({
    where: { id },
    data: updateData,
    select: safeSelect,
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "UPDATE",
    entityType: "User",
    entityId: id,
    metadata: { fields: Object.keys(updateData).filter((k) => k !== "password") },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role !== "OWNER") {
    return NextResponse.json({ error: "Apenas Owners podem excluir usuários" }, { status: 403 });
  }

  if (user.id === id) {
    return NextResponse.json({ error: "Você não pode excluir sua própria conta" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } });
  if (!target) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  await prisma.user.delete({ where: { id } });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "DELETE",
    entityType: "User",
    entityId: id,
    metadata: { name: target.name, email: target.email },
  });

  return NextResponse.json({ success: true });
}
