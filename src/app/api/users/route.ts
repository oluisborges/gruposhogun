import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") as Role | null;
  const active = searchParams.get("active");
  const search = searchParams.get("search");

  const users = await prisma.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(active !== null ? { active: active === "true" } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tags: true,
      active: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (user.role === "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, email, password, role: newRole, tags } = body;

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Nome, email e senha são obrigatórios" }, { status: 400 });
  }

  // COORDINATOR cannot create OWNER
  if (user.role === "COORDINATOR" && newRole === "OWNER") {
    return NextResponse.json({ error: "Coordenadores não podem criar usuários com papel de Owner" }, { status: 403 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email já está em uso" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const created = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: newRole ?? "MANAGER",
      tags: tags ?? [],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tags: true,
      active: true,
      createdAt: true,
    },
  });

  logAudit({
    userId: user.id,
    userEmail: user.email,
    action: "CREATE",
    entityType: "User",
    entityId: created.id,
    metadata: { name: created.name, email: created.email, role: created.role },
  });

  return NextResponse.json(created, { status: 201 });
}
