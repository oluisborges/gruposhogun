import { auth } from "@/auth";
import { cache } from "react";
import type { Role } from "@prisma/client";

export const getSession = cache(async () => {
  const session = await auth();
  return session;
});

export async function getSessionUser() {
  const session = await getSession();
  if (!session?.user) return null;
  return session.user as {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
}
