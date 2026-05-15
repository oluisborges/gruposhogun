import { requireAuth } from "@/lib/auth-guards";
import { Sidebar } from "@/components/layout/sidebar";
import type { Role } from "@prisma/client";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAuth();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0d1410" }}>
      <Sidebar
        user={{
          id: session.user.id,
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          role: session.user.role as Role,
        }}
      />
      <main className="flex-1 overflow-y-auto flex flex-col min-w-0">
        {children}
      </main>
    </div>
  );
}
