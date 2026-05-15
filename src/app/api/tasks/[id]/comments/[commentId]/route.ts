import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; commentId: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await params;
  const comment = await prisma.taskComment.findUnique({ where: { id: commentId } });
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwnerOrCoordinator = user.role === "OWNER" || user.role === "COORDINATOR";
  if (!isOwnerOrCoordinator && comment.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.taskComment.delete({ where: { id: commentId } });

  return NextResponse.json({ success: true });
}
